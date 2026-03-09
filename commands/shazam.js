// Identify song from audio/video using Shazam-like API
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const acrcloud = require('acrcloud');
const fs = require('fs');
const path = require('path');
const settings = require('../settings');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function shazamCommand(sock, chatId, message) {
    const messageToQuote = message;

    // Check if it's a reply
    const ctxInfo = message.message?.extendedTextMessage?.contextInfo;
    if (!ctxInfo?.quotedMessage) {
        return sock.sendMessage(chatId, {
            text: 'Please reply to an audio or video message with .shazam'
        }, { quoted: messageToQuote });
    }

    // Check if quoted message has audio or video
    const quotedMsg = ctxInfo.quotedMessage;
    const mediaMessage = quotedMsg.audioMessage || quotedMsg.videoMessage;
    if (!mediaMessage) {
        return sock.sendMessage(chatId, {
            text: 'The replied message must be an audio or video.'
        }, { quoted: messageToQuote });
    }

    // Build target message for download
    const targetMessage = {
        key: {
            remoteJid: chatId,
            id: ctxInfo.stanzaId,
            participant: ctxInfo.participant
        },
        message: quotedMsg
    };

    try {
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        // Download media
        const mediaBuffer = await downloadMediaMessage(targetMessage, 'buffer', {}, {
            logger: undefined,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!mediaBuffer) {
            return sock.sendMessage(chatId, {
                text: 'Failed to download media.'
            }, { quoted: messageToQuote });
        }

        // Save to temp file
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const tempInput = path.join(tempDir, `input_${Date.now()}`);
        const tempAudio = path.join(tempDir, `audio_${Date.now()}.wav`);
        
        fs.writeFileSync(tempInput, mediaBuffer);

        // Convert to WAV format for better recognition (ACRCloud works best with WAV)
        // Extract first 30 seconds for better performance
        try {
            if (quotedMsg.videoMessage) {
                // Extract audio from video (first 30 seconds)
                await execAsync(`ffmpeg -i "${tempInput}" -vn -acodec pcm_s16le -ar 44100 -ac 2 -t 30 "${tempAudio}" -y`);
            } else {
                // Convert audio to WAV (first 30 seconds)
                await execAsync(`ffmpeg -i "${tempInput}" -acodec pcm_s16le -ar 44100 -ac 2 -t 30 "${tempAudio}" -y`);
            }
        } catch (ffmpegErr) {
            console.log("FFMPEG ERROR:", ffmpegErr.message);
            // Fallback: try with original file (limit to 30 seconds if possible)
            try {
                await execAsync(`ffmpeg -i "${tempInput}" -t 30 -c copy "${tempAudio.replace('.wav', '.mp3')}" -y`);
                // Rename for consistency
                fs.renameSync(tempAudio.replace('.wav', '.mp3'), tempAudio);
            } catch (fallbackErr) {
                console.log("Fallback FFMPEG ERROR:", fallbackErr.message);
                // Last resort: use original file
                fs.copyFileSync(tempInput, tempAudio);
            }
        }

        // Check if ACRCloud is configured
        if (!settings.acrcloud || !settings.acrcloud.access_key || settings.acrcloud.access_key === 'YOUR_ACCESS_KEY') {
            return sock.sendMessage(chatId, {
                text: '❌ *ACRCloud not configured:* Please set up your ACRCloud API keys in settings.js'
            }, { quoted: messageToQuote });
        }

        // Initialize ACRCloud
        const acr = new acrcloud({
            host: settings.acrcloud.host,
            access_key: settings.acrcloud.access_key,
            access_secret: settings.acrcloud.access_secret
        });

        // Check if audio file was created
        if (!fs.existsSync(tempAudio) || fs.statSync(tempAudio).size === 0) {
            return sock.sendMessage(chatId, {
                text: '❌ *Audio Processing Error:* Could not process the audio file. Please try with a different audio/video.'
            }, { quoted: messageToQuote });
        }

        // Identify song with timeout
        const result = await Promise.race([
            acr.identify(fs.readFileSync(tempAudio)),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('API timeout')), 30000)
            )
        ]);

        // Clean up temp files
        try {
            if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
            if (fs.existsSync(tempAudio)) fs.unlinkSync(tempAudio);
        } catch (cleanupErr) {
            console.log("Cleanup error:", cleanupErr.message);
        }

        console.log("ACRCloud Result:", JSON.stringify(result, null, 2));

        if (result.status?.code === 0 && result.metadata?.music?.length > 0) {
            const song = result.metadata.music[0];
            const title = song.title || 'Unknown Title';
            const artist = song.artists?.[0]?.name || 'Unknown Artist';
            const album = song.album?.name || 'Unknown Album';
            const score = song.score ? ` (${Math.round(song.score)}% match)` : '';

            const response = `🎵 *Song Identified!*\n\n📌 Title: ${title}\n👤 Artist: ${artist}\n💿 Album: ${album}${score}`;
            await sock.sendMessage(chatId, { text: response }, { quoted: messageToQuote });
        } else {
            let errorMessage = '❌ *Could not identify the song.*';
            
            switch (result.status?.code) {
                case 1001:
                case 1002:
                    errorMessage = '❌ *API Error:* Invalid ACRCloud credentials. Please check your API keys.';
                    break;
                case 1003:
                    errorMessage = '❌ *API Error:* Invalid ACRCloud host. Please check your settings.';
                    break;
                case 2001:
                    errorMessage = '❌ *Audio Error:* The audio is too short. Please use a longer clip.';
                    break;
                case 2002:
                    errorMessage = '❌ *Audio Error:* The audio is too long. Please use a shorter clip.';
                    break;
                case 2003:
                    errorMessage = '❌ *Audio Error:* Unsupported audio format.';
                    break;
                case 2004:
                    errorMessage = '❌ *No Match:* Song not found in database or audio quality too low.';
                    break;
                case 3001:
                case 3002:
                    errorMessage = '❌ *API Limit:* ACRCloud usage limit exceeded. Please try again later.';
                    break;
                default:
                    errorMessage = `❌ *Error:* ${result.status?.msg || 'Unknown error occurred'}`;
            }
            
            await sock.sendMessage(chatId, { text: errorMessage }, { quoted: messageToQuote });
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.log("SHAZAM ERROR:", err.message);
        console.log("Full error:", err);
        
        let errorMsg = '❌ *Error:* An error occurred while identifying the song.';
        if (err.message === 'API timeout') {
            errorMsg = '❌ *Timeout:* The song identification took too long. Please try again.';
        }
        
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: messageToQuote });
    }
}

module.exports = shazamCommand;
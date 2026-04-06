// Identify song from audio/video using Shazam-like API
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { sendButtons } = require('gifted-btns'); // Tumeongeza hii hapa
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

    const quotedMsg = ctxInfo.quotedMessage;
    const mediaMessage = quotedMsg.audioMessage || quotedMsg.videoMessage;
    if (!mediaMessage) {
        return sock.sendMessage(chatId, {
            text: 'The replied message must be an audio or video.'
        }, { quoted: messageToQuote });
    }

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

        const mediaBuffer = await downloadMediaMessage(targetMessage, 'buffer', {}, {
            logger: undefined,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!mediaBuffer) {
            return sock.sendMessage(chatId, { text: 'Failed to download media.' }, { quoted: messageToQuote });
        }

        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const tempInput = path.join(tempDir, `input_${Date.now()}`);
        const tempAudio = path.join(tempDir, `audio_${Date.now()}.wav`);

        fs.writeFileSync(tempInput, mediaBuffer);

        // Logic ya FFmpeg (Imebaki ile ile uliyokuwa nayo)
        let duration = 0;
        try {
            const probeResult = await execAsync(`ffprobe -v quiet -print_format json -show_format "${tempInput}"`);
            const probeData = JSON.parse(probeResult.stdout);
            duration = parseFloat(probeData.format?.duration || 0);
        } catch (e) { duration = 60; }

        let clipDuration = duration < 10 ? duration : 30;
        let startTime = duration > 120 ? 30 : 0;

        await execAsync(`ffmpeg -i "${tempInput}" -vn -acodec pcm_s16le -ar 44100 -ac 2 -ss ${startTime} -t ${clipDuration} "${tempAudio}" -y`);

        if (!settings.acrcloud || !settings.acrcloud.access_key) {
            return sock.sendMessage(chatId, { text: '❌ *ACRCloud not configured!*' }, { quoted: messageToQuote });
        }

        const acr = new acrcloud({
            host: settings.acrcloud.host,
            access_key: settings.acrcloud.access_key,
            access_secret: settings.acrcloud.access_secret
        });

        const result = await acr.identify(fs.readFileSync(tempAudio));

        // Cleanup
        if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
        if (fs.existsSync(tempAudio)) fs.unlinkSync(tempAudio);

        if (result.status?.code === 0 && result.metadata?.music?.length > 0) {
            const song = result.metadata.music[0];
            const title = song.title || 'Unknown Title';
            const artist = song.artists?.[0]?.name || 'Unknown Artist';
            const album = song.album?.name || 'Unknown Album';

            const caption = `
🎵 *SONG IDENTIFIED!* 🎵
━━━━━━━━━━━━━━━━━━━━━━
📌 *Title:* ${title}
👤 *Artist:* ${artist}
💿 *Album:* ${album}
━━━━━━━━━━━━━━━━━━━━━━
_Click the button below to download the audio file._`;

            // HAPA NDIPO TUNAWEKA BUTTON
            await sendButtons(sock, chatId, {
                title: '🎧 MICKEY SHAZAM ENGINE',
                text: caption,
                footer: 'Mickey Glitch Technology',
                buttons: [
                    { id: `.play ${artist} ${title}`, text: '📥 DOWNLOAD MP3' }
                ]
            }, { quoted: messageToQuote });

        } else {
            await sock.sendMessage(chatId, { text: '❌ *Song not found!* Try a clearer part of the audio.' }, { quoted: messageToQuote });
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: `❌ *Error:* ${err.message}` }, { quoted: messageToQuote });
    }
}

module.exports = shazamCommand;

// Identify song from audio/video using ACRCloud API
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const acrcloud = require('acrcloud');
const fs = require('fs');
const path = require('path');
const settings = require('../settings');

async function songidCommand(sock, chatId, message) {
    const messageToQuote = message;

    // Check if it's a reply
    const ctxInfo = message.message?.extendedTextMessage?.contextInfo;
    if (!ctxInfo?.quotedMessage) {
        return sock.sendMessage(chatId, {
            text: 'Please reply to an audio or video message with .songid'
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
        const tempFile = path.join(tempDir, `song_${Date.now()}.mp3`);
        fs.writeFileSync(tempFile, mediaBuffer);

        // Initialize ACRCloud
        const acr = new acrcloud({
            host: settings.acrcloud.host,
            access_key: settings.acrcloud.access_key,
            access_secret: settings.acrcloud.access_secret
        });

        // Identify song
        const result = await acr.identify(fs.readFileSync(tempFile));

        // Clean up temp file
        fs.unlinkSync(tempFile);

        if (result.status.code === 0 && result.metadata?.music?.length > 0) {
            const song = result.metadata.music[0];
            const title = song.title;
            const artist = song.artists?.[0]?.name || 'Unknown Artist';
            const album = song.album?.name || 'Unknown Album';

            const response = `🎵 *Song Identified!*\n\n📌 Title: ${title}\n👤 Artist: ${artist}\n💿 Album: ${album}`;
            await sock.sendMessage(chatId, { text: response }, { quoted: messageToQuote });
        } else {
            await sock.sendMessage(chatId, {
                text: 'Sorry, could not identify the song.'
            }, { quoted: messageToQuote });
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.log("SONGID ERROR:", err.message);
        await sock.sendMessage(chatId, {
            text: 'An error occurred while identifying the song.'
        }, { quoted: messageToQuote });
    }
}

module.exports = songidCommand;
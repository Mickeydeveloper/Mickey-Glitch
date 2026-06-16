const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');

async function ttsCommand(sock, chatId, text, message, language = 'en') {
    if (!text) {
        await sock.sendMessage(chatId, { text: 'Please provide the text for TTS conversion.' });
        return;
    }

    const fileName = `tts-${Date.now()}.mp3`;
    const dir = path.join(__dirname, '..', 'assets');
    const filePath = path.join(dir, fileName);

    try {
        // Ensure assets directory exists
        await fs.promises.mkdir(dir, { recursive: true });

        const gtts = new gTTS(text, language);
        // Wrap save in a promise so we can await it
        await new Promise((resolve, reject) => {
            gtts.save(filePath, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        const buffer = await fs.promises.readFile(filePath);
        if (!buffer || buffer.length === 0) {
            throw new Error('Generated audio is empty');
        }

        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg'
        }, { quoted: message });

    } catch (err) {
        console.error('[TTS] Error generating TTS audio:', err);
        await sock.sendMessage(chatId, { text: `Error generating TTS audio: ${err.message || err}` }, { quoted: message });
    } finally {
        try {
            await fs.promises.unlink(filePath);
        } catch (e) {
            // ignore cleanup errors
        }
    }
}

module.exports = ttsCommand;

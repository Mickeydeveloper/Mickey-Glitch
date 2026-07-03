const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { sendButtons } = require('../lib/myfunc');
const acrcloud = require('acrcloud');
const fs = require('fs-extra');
const path = require('path');
const settings = require('../settings');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function shazamCommand(sock, chatId, message) {
    try {
        const ctxInfo = message.message?.extendedTextMessage?.contextInfo;
        const quotedMsg = ctxInfo?.quotedMessage;

        if (!quotedMsg) {
            return sock.sendMessage(chatId, { text: '❌ *Tafadhali reply audio au video kwa kutumia .shazam*' }, { quoted: message });
        }

        const mediaMessage = quotedMsg.audioMessage || quotedMsg.videoMessage;
        if (!mediaMessage) {
            return sock.sendMessage(chatId, { text: '❌ *Reply audio au video pekee!*' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        const targetMessage = {
            key: {
                remoteJid: chatId,
                id: ctxInfo.stanzaId,
                participant: ctxInfo.participant
            },
            message: quotedMsg
        };

        const mediaBuffer = await downloadMediaMessage(targetMessage, 'buffer', {}, {
            logger: undefined,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!mediaBuffer) throw new Error("Media download failed");

        const tempDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const tempInput = path.join(tempDir, `shazam_in_${Date.now()}`);
        const tempAudio = path.join(tempDir, `shazam_out_${Date.now()}.wav`);

        fs.writeFileSync(tempInput, mediaBuffer);

        try {
            await execAsync(`ffmpeg -i "${tempInput}" -vn -acodec pcm_s16le -ar 44100 -ac 2 -t 15 "${tempAudio}" -y`);
        } catch (e) {
            fs.copySync(tempInput, tempAudio);
        }

        if (!settings.acrcloud || !settings.acrcloud.access_key) {
            return sock.sendMessage(chatId, { text: '❌ *ACRCloud API haijawekwa kwenye settings.js!*' });
        }

        const acr = new acrcloud({
            host: settings.acrcloud.host,
            access_key: settings.acrcloud.access_key,
            access_secret: settings.acrcloud.access_secret
        });

        const result = await acr.identify(fs.readFileSync(tempAudio));

        if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
        if (fs.existsSync(tempAudio)) fs.unlinkSync(tempAudio);

        if (result.status?.code === 0 && result.metadata?.music?.length > 0) {
            const song = result.metadata.music[0];
            const title = song.title || 'Unknown';
            const artist = song.artists?.[0]?.name || 'Unknown';

            // 🛠️ Kusafisha majina ili yasilete mgogoro kwenye Command na ID
            const cleanArtist = artist.replace(/[^\w\s]/gi, '');
            const cleanTitle = title.replace(/[^\w\s]/gi, '');

            // ID itatuma: .play Msanii - Wimbo
            const playCmd = ".play " + cleanArtist + " - " + cleanTitle;
            
            // Text itakayoonekana kwenye button: 📥 Msanii - Wimbo
            const buttonText = "📥 " + artist + " - " + title;

            const caption = `🎵 *SHAZAM IDENTIFIED!*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📌 *Title:* ${title}\n` +
                `👤 *Artist:* ${artist}\n` +
                `💿 *Album:* ${song.album?.name || 'N/A'}\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `_Bonyeza button kupata wimbo huu._`;

            await sendButtons(sock, chatId, caption, 'MICKEY GLITCH V3.0', [ { id: playCmd, text: buttonText } ], message);

        } else {
            await sock.sendMessage(chatId, { text: '❌ *Wimbo haukutambulika.*' });
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("SHAZAM ERROR:", err);
    }
}

module.exports = shazamCommand;
module.exports.buttonHandlers = {};

const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { sendButtons } = require('gifted-btns');
const acrcloud = require('acrcloud');
const fs = require('fs-extra'); // Tumia fs-extra kwa usalama zaidi
const path = require('path');
const settings = require('../settings');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function shazamCommand(sock, chatId, message) {
    try {
        // 1. Pata Quoted Message kwa usalama
        const ctxInfo = message.message?.extendedTextMessage?.contextInfo;
        const quotedMsg = ctxInfo?.quotedMessage;

        if (!quotedMsg) {
            return sock.sendMessage(chatId, { text: '❌ *Tafadhali reply kwenye Audio au Video ukitumia .shazam*' }, { quoted: message });
        }

        const mediaMessage = quotedMsg.audioMessage || quotedMsg.videoMessage;
        if (!mediaMessage) {
            return sock.sendMessage(chatId, { text: '❌ *Reply kwenye Audio au Video pekee!*' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        // 2. Download Media
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

        // 3. Maandalizi ya Files
        const tempDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        
        const tempInput = path.join(tempDir, `shazam_in_${Date.now()}`);
        const tempAudio = path.join(tempDir, `shazam_out_${Date.now()}.wav`);

        fs.writeFileSync(tempInput, mediaBuffer);

        // 4. FFmpeg Conversion (Tunakata sekunde 15 tu kwa haraka)
        try {
            await execAsync(`ffmpeg -i "${tempInput}" -vn -acodec pcm_s16le -ar 44100 -ac 2 -t 15 "${tempAudio}" -y`);
        } catch (e) {
            console.log("FFmpeg missing or failed, trying direct identification...");
            fs.copySync(tempInput, tempAudio); // Jaribu kutumia original kama ffmpeg imefeli
        }

        // 5. ACRCloud Identification
        if (!settings.acrcloud || !settings.acrcloud.access_key) {
            return sock.sendMessage(chatId, { text: '❌ *ACRCloud API haijawekwa kwenye settings.js!*' });
        }

        const acr = new acrcloud({
            host: settings.acrcloud.host,
            access_key: settings.acrcloud.access_key,
            access_secret: settings.acrcloud.access_secret
        });

        const result = await acr.identify(fs.readFileSync(tempAudio));

        // Cleanup haraka
        if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
        if (fs.existsSync(tempAudio)) fs.unlinkSync(tempAudio);

        // 6. Response Logic
        if (result.status?.code === 0 && result.metadata?.music?.length > 0) {
            const song = result.metadata.music[0];
            const title = song.title || 'Unknown';
            const artist = song.artists?.[0]?.name || 'Unknown';

            const caption = `
🎵 *MICKEY SHAZAM IDENTIFIED!*
━━━━━━━━━━━━━━━━━━━━━━
📌 *Title:* ${title}
👤 *Artist:* ${artist}
💿 *Album:* ${song.album?.name || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━
_Bonyeza button hapa chini kupata wimbo huu._`;

            await sendButtons(sock, chatId, {
                title: '🎧 SONG FINDER',
                text: caption,
                footer: 'Mickey Glitch Tech',
                buttons: [
                    { id: `.play ${artist} ${title}`, text: '📥 DOWNLOAD MP3' }
                ]
            }, { quoted: message });

        } else {
            await sock.sendMessage(chatId, { text: '❌ *Wimbo haukutambulika. Jaribu sehemu yenye sauti safi.*' });
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("SHAZAM ERROR:", err);
        // Usitume error ndefu kwa user, mpe tu ishara kuwa imefeli
    }
}

module.exports = shazamCommand;

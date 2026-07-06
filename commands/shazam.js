const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const acrcloud = require('acrcloud');
const fs = require('fs-extra');
const path = require('path');
const settings = require('../settings');
const { exec } = require('child_process');
const util = require('util');
const axios = require('axios');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const execAsync = util.promisify(exec);

// CONFIGURATION
const CONFIG = {
    FOOTER: '𝐌𝐢𝐜𝐤𝐞𝐲 𝐆𝐥𝐢𝐭𝐜𝐡 𝐓𝐞𝐜𝐡𝐧𝐨𝐥𝐨𝐠𝐲',
    BANNER: 'https://github.com/Mickeymozy/Mickey-Vip/blob/main/chatbot.png?raw=true'
};

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

            // Kusafisha majina
            const cleanArtist = artist.replace(/[^\w\s]/gi, '');
            const cleanTitle = title.replace(/[^\w\s]/gi, '');

            const playCmd = ".play " + cleanArtist + " - " + cleanTitle;
            const buttonText = "📥 Download Track";

            const caption = `🎵 *SHAZAM IDENTIFIED!*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📌 *Title:* ${title}\n` +
                `👤 *Artist:* ${artist}\n` +
                `💿 *Album:* ${song.album?.name || 'N/A'}\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `_Bonyeza button kupata wimbo huu._`;

            const nativeButtons = [
                { buttonId: playCmd, buttonText: { displayText: buttonText }, type: 1 }
            ];

            await sendNativeButtonV2(sock, chatId, message, caption, CONFIG.FOOTER, "🎵 SHAZAM DETECTOR", nativeButtons);

        } else {
            await sock.sendMessage(chatId, { text: '❌ *Wimbo haukutambulika.*' });
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("SHAZAM ERROR:", err);
    }
}

// Muundo ule ule kamili wa kutuma picha na button kama kwenye alive
async function sendNativeButtonV2(sock, chatId, message, textBody, footerText, headerName, buttonsList) {
    try {
        const fetchBuffer = async (url) => {
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
            return Buffer.from(res.data);
        };

        async function resizeImg(buffer, width = 300, height = 300) {
            try {
                const sharp = require('sharp');
                return await sharp(buffer).resize(width, height, { fit: 'cover' }).toBuffer();
            } catch {
                return buffer;
            }
        }

        let thumbnailBuffer = null;
        if (CONFIG.BANNER) {
            try {
                const buf = await fetchBuffer(CONFIG.BANNER);
                thumbnailBuffer = await resizeImg(buf, 300, 300);
            } catch (e) {
                console.error('[shazam] thumbnail fetch failed', e && e.message ? e.message : e);
            }
        }

        const contextInfo = {
            forwardingScore: 999,
            isForwarded: true,
        };
        const mentionJid = message.key?.participant || message.key?.remoteJid;
        if (mentionJid) contextInfo.mentionedJid = [mentionJid];

        const msg = generateWAMessageFromContent(chatId, {
            buttonsMessage: {
                contentText: textBody,
                footerText: footerText,
                headerType: 6,
                locationMessage: {
                    degreesLatitude: 0,
                    degreesLongitude: 0,
                    name: headerName,
                    address: 'Track Finder',
                    jpegThumbnail: thumbnailBuffer
                },
                viewOnce: true,
                contextInfo,
                buttons: buttonsList
            }
        }, { userJid: (sock && sock.user && sock.user.id) || '', quoted: message || undefined });

        await sock.relayMessage(chatId, msg.message, {
            messageId: msg.key.id,
            additionalNodes: [
                {
                    tag: 'biz',
                    attrs: {},
                    content: [
                        {
                            tag: 'interactive',
                            attrs: { type: 'native_flow', v: '1' },
                            content: [
                                {
                                    tag: 'native_flow',
                                    attrs: { v: '9', name: 'mixed' }
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    } catch (err) {
        console.error('sendNativeButtonV2 error inside shazam:', err);
        await sock.sendMessage(chatId, { text: textBody }, { quoted: message });
    }
}

module.exports = shazamCommand;
module.exports.buttonHandlers = {};

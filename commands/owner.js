const os = require('os');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const axios = require('axios');

// ==============================================
// 👑 OWNER INFO CONFIG
// ==============================================
const CONFIG = {
    FOOTER: '👑 MICKDADY • PROFILE 👑',
    OWNER: {
        NAME: 'Mickdady',
        TITLE: 'Base Developer',
        LOCATION: 'Tanzania 🇹🇿',
        PHONE_1: '0615944741',
        PHONE_2: '0612130873'
    },
    // Picha zinabadilika badilika zenyewe (Randomized)
    IMAGES: [
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg',
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy2.jpg',
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy3.jpg',
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy4.jpg'
    ]
};

/**
 * Main owner command handler (Zamani / Legacy Button style with V2 relay)
 */
const ownerCommand = async (sock, chatId, message) => {
    // Linda isisababishe crash kama message iko undefined
    const safeMessage = message || {};
    const messageKey = safeMessage.key || {};
    
    console.log('[owner] invoked for', chatId, 'from', messageKey.participant || messageKey.remoteJid || 'Unknown');

    try {
        // 1. Chagua picha moja bila mpangilio (Random Image Selection)
        const randomImage = CONFIG.IMAGES[Math.floor(Math.random() * CONFIG.IMAGES.length)];

        // 2. Muonekano mfupi na msafi wa maandishi (Minimalist Appearance)
        const statusMessage = `🤖 * — OWNER INFO*\n\n` +
            `👤 *Jina:* ${CONFIG.OWNER.NAME}\n` +
            `💼 *Cheo:* ${CONFIG.OWNER.TITLE}\n` +
            `📍 *Mahali nilipo:* ${CONFIG.OWNER.LOCATION}\n\n` +
            `_Mickey Glitch Technology™_`;

        // 3. Weka maelezo ya kazi za kupiga simu kwenye mfumo wa button zako za sasa
        const nativeButtons = [
            { buttonId: `phone:${CONFIG.OWNER.PHONE_1}`, buttonText: { displayText: `📞 Call Line 1 (${CONFIG.OWNER.PHONE_1})` }, type: 1 },
            { buttonId: `phone:${CONFIG.OWNER.PHONE_2}`, buttonText: { displayText: `📞 Call Line 2 (${CONFIG.OWNER.PHONE_2})` }, type: 1 }
        ];

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

        const sendNativeButtonV2 = async () => {
            let thumbnailBuffer = null;
            if (randomImage) {
                try {
                    const buf = await fetchBuffer(randomImage);
                    thumbnailBuffer = await resizeImg(buf, 300, 300);
                } catch (e) {
                    console.error('[owner] thumbnail fetch failed', e && e.message ? e.message : e);
                }
            }

            const contextInfo = {
                forwardingScore: 999,
                isForwarded: true,
            };
            const mentionJid = messageKey.participant || messageKey.remoteJid;
            if (mentionJid) contextInfo.mentionedJid = [mentionJid];

            // Muundo wako ule ule wa buttonsMessage na locationMessage kama kwenye alive
            const msg = generateWAMessageFromContent(chatId, {
                buttonsMessage: {
                    contentText: statusMessage,
                    footerText: CONFIG.FOOTER,
                    headerType: 6,
                    locationMessage: {
                        degreesLatitude: 0,
                        degreesLongitude: 0,
                        name: CONFIG.OWNER.NAME,
                        address: CONFIG.OWNER.TITLE,
                        jpegThumbnail: thumbnailBuffer
                    },
                    viewOnce: true,
                    contextInfo,
                    buttons: nativeButtons
                }
            }, { userJid: (sock && sock.user && sock.user.id) || '', quoted: message || undefined });

            // Kutuma kwa kutumia relayMessage yako ile ile na biz nodes
            await sock.relayMessage(chatId, msg.message, {
                messageId: msg.key?.id || sock.generateMessageID(),
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
        };

        try {
            await sendNativeButtonV2();
        } catch (e) {
            console.error('[owner] sendNativeButtonV2 failed:', e && e.message ? e.message : e);
            try {
                await sock.sendMessage(chatId, { text: statusMessage }, { quoted: message });
            } catch (ee) {
                console.error('[owner] fallback send failed', ee && ee.message ? ee.message : ee);
            }
        }

    } catch (error) {
        console.error('Critical Error in Owner Command:', error);
        try {
            await sock.sendMessage(chatId, { 
                text: '❌ *System Error:* Kushindwa kupakia wasifu.\n```' + error.message + '```' 
            }, { quoted: message });
        } catch (e) { }
    }
};

module.exports = ownerCommand;

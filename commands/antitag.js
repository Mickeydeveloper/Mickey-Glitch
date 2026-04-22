const { setAntitag, getAntitag, removeAntitag } = require('../lib/index');
// Tunatumia mfumo mpya wa admin check
const { checkAdminPermissions } = require('../lib/adminCheck');

async function handleAntitagCommand(sock, chatId, userMessage, senderId, dummyAdmin, message) {
    try {
        // 1. Check admin status (Inapita message object kuzuia crash)
        const adminCheck = await checkAdminPermissions(sock, chatId, message);

        /**
         * --- FREE FOR ALL ---
         * Nimeondoa kizuizi cha "isSenderAdmin" ili kila mtu aweze kuwasha/kuzima.
         * Lakini bot bado inahitaji kuwa admin (isBotAdmin) ili iweze ku-kick au kufuta.
         */
        
        if (!adminCheck.isBotAdmin) {
            return await sock.sendMessage(chatId, { 
                text: '*_⚠️ Bot inahitaji kuwa admin ili Antitag ifanye kazi!_*' 
            }, { quoted: message });
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const usage = `\`\`\`ANTITAG SETUP\n\n${prefix}antitag on\n${prefix}antitag set delete | kick\n${prefix}antitag off\n\`\`\``;
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on':
                const existingConfig = await getAntitag(chatId, 'on');
                if (existingConfig?.enabled) {
                    await sock.sendMessage(chatId, { text: '*_Antitag is already on_*' }, { quoted: message });
                    return;
                }
                const result = await setAntitag(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, { 
                    text: result ? '*_Antitag has been turned ON_*' : '*_Failed to turn on Antitag_*' 
                }, { quoted: message });
                break;

            case 'off':
                await removeAntitag(chatId, 'on');
                await sock.sendMessage(chatId, { text: '*_Antitag has been turned OFF_*' }, { quoted: message });
                break;

            case 'set':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, { 
                        text: `*_Please specify an action: ${prefix}antitag set delete | kick_*` 
                    }, { quoted: message });
                    return;
                }
                const setAction = args[1];
                if (!['delete', 'kick'].includes(setAction)) {
                    await sock.sendMessage(chatId, { 
                        text: '*_Invalid action. Choose delete or kick._*' 
                    }, { quoted: message });
                    return;
                }
                const setResult = await setAntitag(chatId, 'on', setAction);
                await sock.sendMessage(chatId, { 
                    text: setResult ? `*_Antitag action set to ${setAction}_*` : '*_Failed to set Antitag action_*' 
                }, { quoted: message });
                break;

            case 'get':
                const status = await getAntitag(chatId, 'on');
                const actionConfig = await getAntitag(chatId, 'on');
                await sock.sendMessage(chatId, { 
                    text: `*_Antitag Configuration:_*\nStatus: ${status ? 'ON' : 'OFF'}\nAction: ${actionConfig ? actionConfig.action : 'Not set'}` 
                }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: `*_Use ${prefix}antitag for usage._*` }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in antitag command:', error);
        // Silent catch kuzuia error za "admin status" kwny chat
    }
}

async function handleTagDetection(sock, chatId, message, senderId) {
    try {
        const antitagSetting = await getAntitag(chatId, 'on');
        if (!antitagSetting || !antitagSetting.enabled) return;

        // Bado tunahitaji bot iwe admin ili ku-kick/delete
        const adminCheck = await checkAdminPermissions(sock, chatId, message).catch(() => null);
        if (!adminCheck?.isBotAdmin) return;

        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const messageText = (
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption || ''
        );

        const numericMentions = messageText.match(/@\d{10,}/g) || [];
        const uniqueNumericMentions = new Set();
        numericMentions.forEach(mention => {
            const numMatch = mention.match(/@(\d+)/);
            if (numMatch) uniqueNumericMentions.add(numMatch[1]);
        });
        
        const totalMentions = Math.max(mentionedJids.length, uniqueNumericMentions.size);

        if (totalMentions >= 3) {
            const groupMetadata = await sock.groupMetadata(chatId);
            const participants = groupMetadata.participants || [];
            const mentionThreshold = Math.ceil(participants.length * 0.5);
            const hasManyNumericMentions = uniqueNumericMentions.size >= 10;
            
            if (totalMentions >= mentionThreshold || hasManyNumericMentions) {
                const action = antitagSetting.action || 'delete';
                
                // Futa ujumbe kwanza kwa kila action
                await sock.sendMessage(chatId, {
                    delete: { remoteJid: chatId, fromMe: false, id: message.key.id, participant: senderId }
                });

                if (action === 'kick') {
                    await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
                    await sock.sendMessage(chatId, {
                        text: `🚫 *Antitag Detected!*\n@${senderId.split('@')[0]} ametolewa kwa kutag watu wote.`,
                        mentions: [senderId]
                    });
                } else {
                    await sock.sendMessage(chatId, { text: `⚠️ *Tagall Detected!* Meseji imefutwa.` }, { quoted: message });
                }
            }
        }
    } catch (error) {
        console.error('Tag Detection Error:', error);
    }
}

module.exports = { handleAntitagCommand, handleTagDetection };

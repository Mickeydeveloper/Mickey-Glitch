/**
 * antilink.js
 * Antilink handler iliyoboreshwa - Inatumia isAdmin mpya
 */

const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');
const { isAdmin } = require('../lib/isAdmin');   // ← Hii ni muhimu

// Helper function ku-get antilink setting (kwa urahisi)
function getAntilinkSetting(chatId) {
    const config = getAntilink(chatId, 'on');
    return config?.enabled ? (config.action || 'delete') : 'off';
}

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, message) {
    try {
        // ←←← Tumia isAdmin iliyoboreshwa
        const adminStatus = await isAdmin(sock, chatId, senderId);
        
        if (!adminStatus.isGroup) {
            await sock.sendMessage(chatId, { 
                text: '*_❌ Hii command inafanya kazi kwenye group pekee!_*' 
            }, { quoted: message });
            return;
        }

        if (!adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, { 
                text: '```😞ᴏɴʟʏ ꜰᴏʀ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴ!```' 
            }, { quoted: message });
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(/\s+/);
        const action = args[0];

        if (!action) {
            const usage = `\`\`\`🔰 ANTILINK SETUP\n\n` +
                         `${prefix}antilink on\n` +
                         `${prefix}antilink set delete|kick|warn\n` +
                         `${prefix}antilink off\n` +
                         `${prefix}antilink get\`\`\``;
            
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on':
                const existing = getAntilink(chatId, 'on');
                if (existing?.enabled) {
                    await sock.sendMessage(chatId, { 
                        text: '*_✅ Antilink tayari imewekwa ON!_*' 
                    }, { quoted: message });
                    return;
                }

                const result = await setAntilink(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, { 
                    text: result ? 
                        '*_⚡ Antilink imewekwa ON! Hakuna link itakayoruhusiwa_*' : 
                        '*_❌ Imeshindwa kuwasha Antilink_*' 
                }, { quoted: message });
                break;

            case 'off':
                await removeAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { 
                    text: '*_✅ Antilink imezimwa vizuri_*' 
                }, { quoted: message });
                break;

            case 'set':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, { 
                        text: `*_⚠️ Tumia: ${prefix}antilink set delete | kick | warn_*` 
                    }, { quoted: message });
                    return;
                }

                const newAction = args[1];
                if (!['delete', 'kick', 'warn'].includes(newAction)) {
                    await sock.sendMessage(chatId, { 
                        text: '*_❌ Action invalid! Chagua: delete, kick, au warn_*' 
                    }, { quoted: message });
                    return;
                }

                const setResult = await setAntilink(chatId, 'on', newAction);
                await sock.sendMessage(chatId, { 
                    text: setResult ? 
                        `*_✅ Antilink action imewekwa kuwa: ${newAction}_*` : 
                        '*_❌ Imeshindwa kubadilisha action_*' 
                }, { quoted: message });
                break;

            case 'get':
            case 'status':
                const config = getAntilink(chatId, 'on');
                const statusText = config?.enabled ? '✅ ON' : '❌ OFF';
                const actionText = config?.enabled ? config.action : 'Hakuna';

                let reply = `*📊 ANTILINK STATUS*\n\n`;
                reply += `• Status: ${statusText}\n`;
                reply += `• Action: ${actionText}\n`;
                reply += `• Group: ${adminStatus.groupName || 'Unknown'}`;

                await sock.sendMessage(chatId, { text: reply }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { 
                    text: `*_❌ Command si sahihi. Tumia ${prefix}antilink kuona maelekezo_*` 
                }, { quoted: message });
        }

    } catch (error) {
        console.error('Error in handleAntilinkCommand:', error);
        await sock.sendMessage(chatId, { 
            text: '*_❌ Kuna tatizo katika kutekeleza command_*' 
        }, { quoted: message });
    }
}

async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    try {
        const antilinkSetting = getAntilinkSetting(chatId);
        if (antilinkSetting === 'off') return;

        const linkPatterns = {
            whatsapp: /chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/i,
            channel: /wa\.me\/channel\/[A-Za-z0-9]{20,}/i,
            allLinks: /https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/i,
        };

        let shouldDelete = false;
        let reason = '';

        if (antilinkSetting === 'delete' || antilinkSetting === 'kick' || antilinkSetting === 'warn') {
            if (linkPatterns.whatsapp.test(userMessage) || 
                linkPatterns.channel.test(userMessage) || 
                linkPatterns.allLinks.test(userMessage)) {
                shouldDelete = true;
                reason = 'Link iliyokatazwa';
            }
        }

        if (shouldDelete) {
            // Delete message
            try {
                const msgKey = message.key;
                await sock.sendMessage(chatId, { delete: msgKey });
            } catch (e) {
                console.error('Delete failed:', e.message);
            }

            // Warning message
            const warningText = `⚠️ *@${senderId.split('@')[0]}*, Kupost link ni marufuku hapa!`;
            await sock.sendMessage(chatId, { 
                text: warningText, 
                mentions: [senderId] 
            });
        }
    } catch (error) {
        console.error('Error in handleLinkDetection:', error);
    }
}

module.exports = {
    handleAntilinkCommand,
    handleLinkDetection,
};
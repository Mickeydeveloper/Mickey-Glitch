const { checkAdminPermissions } = require('../lib/adminCheck'); 
const store = require('../lib/lightweight_store');

async function deleteCommand(sock, chatId, message, text) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;

        // Tunacheki tu ikiwa BOT ni admin (Bot lazima iwe admin ili ifute msg za watu)
        const { isBotAdmin } = await checkAdminPermissions(sock, chatId, senderId);

        if (!isBotAdmin) {
            return await sock.sendMessage(chatId, { 
                text: '⚠️ Nahitaji kuwa admin ili kufuta meseji (Bot must be admin).' 
            }, { quoted: message });
        }

        // --- (Admin Check ya sender imeondolewa hapa ili iwe FREE kwa wote) ---

        const ctxInfo = message.message?.extendedTextMessage?.contextInfo || {};
        const repliedMsgId = ctxInfo.stanzaId; 
        const repliedParticipant = ctxInfo.participant;

        // 1. UKIREPLY UJUMBE
        if (repliedMsgId) {
            try {
                await sock.sendMessage(chatId, {
                    delete: {
                        remoteJid: chatId,
                        fromMe: false,
                        id: repliedMsgId,
                        participant: repliedParticipant
                    }
                });
                return await sock.sendMessage(chatId, { delete: message.key });
            } catch (e) {
                return await sock.sendMessage(chatId, { text: '❌ Imeshindikana kufuta (Del failed).' }, { quoted: message });
            }
        }

        // 2. KUFUTA KWA IDADI (BULK DELETE)
        const msgText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const parts = msgText.trim().split(/\s+/);
        let countArg = parts.length > 1 ? parseInt(parts[1], 10) : null;

        if (!countArg || isNaN(countArg) || countArg <= 0) {
            return await sock.sendMessage(chatId, { 
                text: '💡 *Usage:* Reply msg au tumia `.del 5` kufuta meseji za mwisho.' 
            }, { quoted: message });
        }

        countArg = Math.min(countArg, 50); 
        const chatMessages = Array.isArray(store.messages[chatId]) ? store.messages[chatId] : [];
        const toDelete = [];

        for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < countArg; i--) {
            const m = chatMessages[i];
            if (!m.message?.protocolMessage && m.key.id !== message.key.id) {
                toDelete.push(m);
            }
        }

        if (toDelete.length === 0) {
            return await sock.sendMessage(chatId, { text: 'Hakuna msg za kufuta (No msg found).' }, { quoted: message });
        }

        for (const m of toDelete) {
            try {
                await sock.sendMessage(chatId, {
                    delete: {
                        remoteJid: chatId,
                        fromMe: m.key.fromMe,
                        id: m.key.id,
                        participant: m.key.participant || m.key.remoteJid
                    }
                });
                await new Promise(r => setTimeout(r, 200)); 
            } catch (err) {}
        }

        await sock.sendMessage(chatId, { delete: message.key });

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: '❌ Hitilafu imetokea (Err occurred).' });
    }
}

module.exports = deleteCommand;

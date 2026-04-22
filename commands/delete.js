const { checkAdminPermissions } = require('../lib/adminCheck');
const store = require('../lib/lightweight_store');

async function deleteCommand(sock, chatId, message, text) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;

        // Bado tunahitaji hii ili kujua kama BOT ni admin (Bot lazima iwe admin ili ifute)
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        // 1. Check kama bot ni admin (Hii ni lazima ibaki)
        if (!isBotAdmin) {
            return await sock.sendMessage(chatId, { text: '⚠️ Nahitaji kuwa admin ili kufuta meseji (I need to be admin).' }, { quoted: message });
        }

        // --- SEHEMU ILIYOONDOLEWA (Admin check kwa sender imeondolewa hapa) ---

        const ctxInfo = message.message?.extendedTextMessage?.contextInfo || {};
        const repliedMsgId = ctxInfo.stanzaId; 
        const repliedParticipant = ctxInfo.participant;

        // --- SCENARIO A: UKIREPLY UJUMBE ---
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
                return await sock.sendMessage(chatId, { text: '❌ Imeshindikana kufuta (Delete failed).' }, { quoted: message });
            }
        }

        // --- SCENARIO B: KUFUTA KWA IDADI (BULK DELETE) ---
        const msgText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const parts = msgText.trim().split(/\s+/);
        let countArg = parts.length > 1 ? parseInt(parts[1], 10) : null;

        if (!countArg || isNaN(countArg) || countArg <= 0) {
            return await sock.sendMessage(chatId, { 
                text: '💡 *Usage:* Reply ujumbe au tumia `.del 5` kufuta meseji tano za mwisho.' 
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
            return await sock.sendMessage(chatId, { text: 'Hakuna meseji za kufuta (No msg found).' }, { quoted: message });
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
        await sock.sendMessage(chatId, { text: '❌ Hitilafu imetokea (Error occurred).' });
    }
}

module.exports = deleteCommand;

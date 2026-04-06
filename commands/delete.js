const isAdmin = require('../lib/isAdmin');
const store = require('../lib/lightweight_store');

async function deleteCommand(sock, chatId, message, senderId) {
    try {
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        // 1. Check kama bot ni admin
        if (!isBotAdmin) {
            return await sock.sendMessage(chatId, { text: '⚠️ Nahitaji kuwa admin ili kufuta meseji (I need to be admin).' }, { quoted: message });
        }

        // 2. Check kama aliyetuma command ni admin
        if (!isSenderAdmin) {
            return await sock.sendMessage(chatId, { text: '❌ Admins tu ndio wanaweza kufuta (Only admins can delete).' }, { quoted: message });
        }

        const ctxInfo = message.message?.extendedTextMessage?.contextInfo || {};
        const repliedMsgId = ctxInfo.stanzaId; // ID ya meseji iliyoreply-wa
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
                // Futa pia command yenyewe ya admin
                return await sock.sendMessage(chatId, { delete: message.key });
            } catch (e) {
                return await sock.sendMessage(chatId, { text: '❌ Imeshindikana kufuta (Delete failed).' }, { quoted: message });
            }
        }

        // --- SCENARIO B: KUFUTA KWA IDADI (BULK DELETE) ---
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const parts = text.trim().split(/\s+/);
        let countArg = parts.length > 1 ? parseInt(parts[1], 10) : null;

        if (!countArg || isNaN(countArg) || countArg <= 0) {
            return await sock.sendMessage(chatId, { 
                text: '💡 *Usage:* Reply ujumbe au tumia `.del 5` kufuta meseji tano za mwisho.' 
            }, { quoted: message });
        }

        countArg = Math.min(countArg, 50); // Limit isiwe nyingi sana
        const chatMessages = Array.isArray(store.messages[chatId]) ? store.messages[chatId] : [];
        const toDelete = [];

        // Tafuta meseji kuanzia ya mwisho (tuna-skip protocol msgs na command yenyewe)
        for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < countArg; i--) {
            const m = chatMessages[i];
            if (!m.message?.protocolMessage && m.key.id !== message.key.id) {
                toDelete.push(m);
            }
        }

        if (toDelete.length === 0) {
            return await sock.sendMessage(chatId, { text: 'Hakuna meseji za kufuta (No messages found).' }, { quoted: message });
        }

        // Futa meseji moja baada ya nyingine
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
                await new Promise(r => setTimeout(r, 200)); // Delay kidogo kuzuia spam
            } catch (err) {}
        }

        // Futa command ya admin mwishoni
        await sock.sendMessage(chatId, { delete: message.key });

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: '❌ Hitilafu imetokea (Error occurred).' });
    }
}

module.exports = deleteCommand;

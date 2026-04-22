const { checkAdminPermissions } = require('../lib/adminCheck');
const store = require('../lib/lightweight_store');

async function deleteCommand(sock, chatId, message, text) {
    try {
        // 1. Tumia mfumo ule ule wa promote (Inapita message object nzima)
        // Hii itazuia ile error ya "Error checking admin status"
        const adminCheck = await checkAdminPermissions(sock, chatId, message);

        // Angalia kama BOT ni admin (Lazima bot iwe admin kufuta msg za wengine)
        if (!adminCheck.isBotAdmin) {
            return await sock.sendMessage(chatId, { 
                text: '⚠️ Nahitaji kuwa admin ili kufuta meseji (Bot must be admin).' 
            }, { quoted: message });
        }

        // --- FREE FOR ALL: Hatutumii adminCheck.canExecute hapa ---

        const ctxInfo = message.message?.extendedTextMessage?.contextInfo || {};
        const repliedMsgId = ctxInfo.stanzaId; 
        const repliedParticipant = ctxInfo.participant;

        // --- SCENARIO A: KUFUTA UJUMBE ULIO-REPLY-WA ---
        if (repliedMsgId) {
            try {
                await sock.sendMessage(chatId, {
                    delete: {
                        remoteJid: chatId,
                        fromMe: repliedParticipant === (sock.user.id.split(':')[0] + '@s.whatsapp.net'),
                        id: repliedMsgId,
                        participant: repliedParticipant
                    }
                });
                // Futa pia command yenyewe
                return await sock.sendMessage(chatId, { delete: message.key });
            } catch (e) {
                // Ikishindwa, inatoka bila kuleta kelele
                return;
            }
        }

        // --- SCENARIO B: BULK DELETE (KUFUTA KWA IDADI) ---
        const parts = (text || "").trim().split(/\s+/);
        let countArg = parts.length > 1 ? parseInt(parts[1], 10) : null;

        if (!countArg || isNaN(countArg) || countArg <= 0) {
            return await sock.sendMessage(chatId, { 
                text: '💡 *Usage:* Reply msg au tumia `.del 5` kufuta meseji za mwisho.' 
            }, { quoted: message });
        }

        countArg = Math.min(countArg, 50); 
        const chatMessages = Array.isArray(store.messages[chatId]) ? store.messages[chatId] : [];
        const toDelete = [];

        // Tafuta meseji kuanzia ya mwisho (skip command yenyewe)
        for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < countArg; i--) {
            const m = chatMessages[i];
            if (!m.message?.protocolMessage && m.key.id !== message.key.id) {
                toDelete.push(m);
            }
        }

        if (toDelete.length === 0) return;

        // Tekeleza ufutaji mmoja baada ya mwingine
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

        // Mwishowe futa command ya mtumiaji
        await sock.sendMessage(chatId, { delete: message.key });

    } catch (err) {
        // Log kimyakimya kuzuia spam ya error kwny chat
        console.error('Delete Error:', err);
    }
}

module.exports = deleteCommand;

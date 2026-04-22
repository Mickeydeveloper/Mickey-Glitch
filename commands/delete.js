const { checkAdminPermissions } = require('../lib/adminCheck'); // Mpya
const store = require('../lib/lightweight_store');

async function deleteCommand(sock, chatId, message, text) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;

        // Tunatumia checkAdminPermissions kuchek hali ya admin kwny group
        const { isSenderAdmin, isBotAdmin } = await checkAdminPermissions(sock, chatId, senderId);

        // 1. Bot lazima iwe admin ili iweze kufuta meseji za wengine
        if (!isBotAdmin) {
            return await sock.sendMessage(chatId, { 
                text: '⚠️ Bot inahitaji kuwa admin ili kufuta meseji (Bot needs admin).' 
            }, { quoted: message });
        }

        // 2. Tumeondoa check ya isSenderAdmin hapa ili kila mtu (free) aweze kutumia command

        const ctxInfo = message.message?.extendedTextMessage?.contextInfo || {};
        const repliedMsgId = ctxInfo.stanzaId; 
        const repliedParticipant = ctxInfo.participant;

        // --- SCENARIO A: KUFUTA UJUMBE ULIO-REPLY-WA ---
        if (repliedMsgId) {
            try {
                await sock.sendMessage(chatId, {
                    delete: {
                        remoteJid: chatId,
                        fromMe: false, // Inaruhusu kufuta meseji ambazo si zako
                        id: repliedMsgId,
                        participant: repliedParticipant
                    }
                });
                // Futa pia command yenyewe
                return await sock.sendMessage(chatId, { delete: message.key });
            } catch (e) {
                return await sock.sendMessage(chatId, { text: '❌ Imeshindikana (Failed to del).' }, { quoted: message });
            }
        }

        // --- SCENARIO B: BULK DELETE (KUFUTA KWA IDADI) ---
        const msgText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const parts = msgText.trim().split(/\s+/);
        let countArg = parts.length > 1 ? parseInt(parts[1], 10) : null;

        if (!countArg || isNaN(countArg) || countArg <= 0) {
            return await sock.sendMessage(chatId, { 
                text: '💡 *Usage:* Reply msg au tumia `.del 5`.' 
            }, { quoted: message });
        }

        countArg = Math.min(countArg, 50); // Limit kuzuia crash
        const chatMessages = Array.isArray(store.messages[chatId]) ? store.messages[chatId] : [];
        const toDelete = [];

        for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < countArg; i--) {
            const m = chatMessages[i];
            // Skip meseji za system na command yenyewe
            if (!m.message?.protocolMessage && m.key.id !== message.key.id) {
                toDelete.push(m);
            }
        }

        if (toDelete.length === 0) {
            return await sock.sendMessage(chatId, { text: 'Hakuna msg (No msg found).' }, { quoted: message });
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
                await new Promise(r => setTimeout(r, 200)); // Delay ya usalama
            } catch (err) {}
        }

        await sock.sendMessage(chatId, { delete: message.key });

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: '❌ Hitilafu (Err occurred).' });
    }
}

module.exports = deleteCommand;

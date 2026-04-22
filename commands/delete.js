const { checkAdminPermissions } = require('../lib/adminCheck'); 
const store = require('../lib/lightweight_store');

/**
 * Delete Command - Inaruhusu kila mtu kufuta meseji (Free for all)
 * Bot lazima iwe admin ili ifute meseji za watu wengine kwny group.
 */
async function deleteCommand(sock, chatId, message, text) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');

        let isBotAdmin = false;

        // 1. Angalia hali ya admin tu ikiwa ni group
        if (isGroup) {
            try {
                const perms = await checkAdminPermissions(sock, chatId, senderId);
                isBotAdmin = perms.isBotAdmin;
            } catch (e) {
                console.log("Admin check error:", e);
                // Ikishindwa kucheki admin, tunazindua isBotAdmin kuwa false kuzuia crash
            }
        }

        const ctxInfo = message.message?.extendedTextMessage?.contextInfo || {};
        const repliedMsgId = ctxInfo.stanzaId; 
        const repliedParticipant = ctxInfo.participant;

        // 2. SCENARIO A: KUFUTA UJUMBE ULIO-REPLY-WA
        if (repliedMsgId) {
            // Kama si admin na unajaribu kufuta meseji ya mtu mwingine kwny group
            if (isGroup && !isBotAdmin && repliedParticipant !== sock.user.id.split(':')[0] + '@s.whatsapp.net') {
                return await sock.sendMessage(chatId, { 
                    text: '⚠️ Nahitaji kuwa admin ili kufuta meseji za wengine (Bot must be admin).' 
                }, { quoted: message });
            }

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
                return await sock.sendMessage(chatId, { text: '❌ Imeshindikana kufuta (Del failed).' }, { quoted: message });
            }
        }

        // 3. SCENARIO B: BULK DELETE (KUFUTA KWA IDADI)
        // Tunatumia parameter 'text' iliyopita kwenye function
        const parts = (text || "").trim().split(/\s+/);
        let countArg = parts.length > 1 ? parseInt(parts[1], 10) : null;

        if (!countArg || isNaN(countArg) || countArg <= 0) {
            return await sock.sendMessage(chatId, { 
                text: '💡 *Usage:* Reply msg au tumia `.del 5` kufuta meseji za mwisho.' 
            }, { quoted: message });
        }

        // Check kama bot ni admin kwa ajili ya bulk delete kwny group
        if (isGroup && !isBotAdmin) {
            return await sock.sendMessage(chatId, { text: '⚠️ Bot lazima iwe admin kwa bulk delete.' }, { quoted: message });
        }

        countArg = Math.min(countArg, 50); 
        const chatMessages = Array.isArray(store.messages[chatId]) ? store.messages[chatId] : [];
        const toDelete = [];

        // Tafuta meseji za kufuta (skip command yenyewe)
        for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < countArg; i--) {
            const m = chatMessages[i];
            if (!m.message?.protocolMessage && m.key.id !== message.key.id) {
                toDelete.push(m);
            }
        }

        if (toDelete.length === 0) {
            return await sock.sendMessage(chatId, { text: 'Hakuna meseji za kufuta.' }, { quoted: message });
        }

        // Anza kufuta
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
                await new Promise(r => setTimeout(r, 250)); // Delay kidogo
            } catch (err) {}
        }

        // Mwishowe futa command ya mtumiaji
        await sock.sendMessage(chatId, { delete: message.key });

    } catch (err) {
        console.error("Main Error:", err);
        await sock.sendMessage(chatId, { text: '❌ Hitilafu imetokea (Err occurred).' });
    }
}

module.exports = deleteCommand;

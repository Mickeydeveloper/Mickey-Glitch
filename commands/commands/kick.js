const isAdmin = require('../lib/isAdmin');

/**
 * kickCommand - Mickey Glitch Advanced Kick System
 * Uwezo: Kick kawaida & Kick All (Admins & Owner protected)
 */
async function kickCommand(sock, chatId, senderId, mentionedJids, m) {
    try {
        if (!sock || !chatId || !m) return;

        const isOwner = m.key.fromMe;
        const text = (m.message?.extendedTextMessage?.text || 
                     m.message?.conversation || '').toLowerCase().trim();

        // 1. Tambua kama ni Kick All au Kick ya kawaida
        const isKickAll = text.includes('kick all');

        // 2. Ruhusa (Permissions)
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            return await sock.sendMessage(chatId, { text: '❌ *Mifanye bot kuwa admin kwanza mwanangu!*' }, { quoted: m });
        }

        if (!isOwner && !isSenderAdmin) {
            return await sock.sendMessage(chatId, { text: '❌ *Hii amri ni ya ma-admin tu!*' }, { quoted: m });
        }

        // 3. Fetch Group Info
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants || [];
        const botId = sock.user?.id.split(':')[0] + '@s.whatsapp.net';
        const ownerNum = '255612130873@s.whatsapp.net'; // Namba yako

        let usersToKick = [];

        if (isKickAll) {
            // Mbinu ya Kick All: Chagua wasio ma-admin tu
            usersToKick = participants
                .filter(p => !p.admin) 
                .map(p => p.id)
                .filter(jid => jid !== botId && jid !== ownerNum);

            if (usersToKick.length === 0) {
                return await sock.sendMessage(chatId, { text: '✨ *Group tayari lina ma-admin tu.*' }, { quoted: m });
            }

            await sock.sendMessage(chatId, { 
                text: `🧹 *USAFI WA JUMLA:* Naondoa wanachama ${usersToKick.length}...\n_Hii itachukua muda kidogo kuzuia bot isifungiwe._`
            }, { quoted: m });

        } else {
            // Mbinu ya Kick Kawaida (Mention au Reply)
            if (mentionedJids && mentionedJids.length > 0) {
                usersToKick = mentionedJids;
            } else if (m.message?.extendedTextMessage?.contextInfo?.participant) {
                usersToKick = [m.message.extendedTextMessage.contextInfo.participant];
            }

            if (usersToKick.length === 0) {
                return await sock.sendMessage(chatId, { 
                    text: '❓ *Oya, m-tag mtu au reply ujumbe wake ili nimtoe!*'
                }, { quoted: m });
            }
        }

        // 4. USALAMA: Hakikisha bot au owner hawapo kwenye list
        usersToKick = usersToKick.filter(id => id !== botId && id !== ownerNum);
        if (usersToKick.length === 0) return;

        // 5. UTEKELEZAJI (Execution)
        if (isKickAll) {
            // Batching: Watu 5 kila baada ya sekunde 2 kuzuia "Rate Limit"
            const batchSize = 5;
            for (let i = 0; i < usersToKick.length; i += batchSize) {
                const batch = usersToKick.slice(i, i + batchSize);
                await sock.groupParticipantsUpdate(chatId, batch, "remove");
                // Delay fupi ya kishkaji
                await new Promise(r => setTimeout(r, 2000));
            }
            
            await sock.sendMessage(chatId, { 
                text: `✅ *Kazi imekamilika!* Wanachama ${usersToKick.length} wametolewa, group sasa ni safi.`
            });
        } else {
            // Kick ya kawaida (Instant)
            await sock.groupParticipantsUpdate(chatId, usersToKick, "remove");
            const usernames = usersToKick.map(jid => `@${jid.split('@')[0]}`);
            await sock.sendMessage(chatId, { 
                text: `✅ ${usernames.join(', ')} ametolewa!`,
                mentions: usersToKick
            });
        }

        await sock.sendMessage(chatId, { react: { text: '🧹', key: m.key } });

    } catch (e) {
        console.error('Kick Error:', e);
        await sock.sendMessage(chatId, { text: '❌ *Hitilafu imetokea! Jaribu tena.*' }).catch(() => null);
    }
}

module.exports = kickCommand;

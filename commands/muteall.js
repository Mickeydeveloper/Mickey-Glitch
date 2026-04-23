/**
 * muteall.js - Mute all group members (Only members can send announcement messages)
 * Usage: .muteall on / .muteall off
 */

async function muteAllCommand(sock, chatId, m, text, options) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            return await sock.sendMessage(chatId, { 
                text: '⚠️ *Amri hii ni ya makundi tu!*' 
            }, { quoted: m });
        }

        // Check if user is group admin
        const groupMeta = await sock.groupMetadata(chatId).catch(() => null);
        if (!groupMeta) {
            return await sock.sendMessage(chatId, { text: '❌ *Imeshindwa kupata taarifa za kikundi.*' }, { quoted: m });
        }

        const senderId = m.key.participant || m.key.remoteJid;
        const userParticipant = groupMeta.participants.find(p => p.id === senderId);
        const isAdmin = userParticipant?.admin === 'admin' || userParticipant?.admin === 'superadmin';
        const isBot = m.key.fromMe;

        if (!isAdmin && !isBot && !options?.isOwner) {
            return await sock.sendMessage(chatId, { 
                text: '⚠️ *Wewe lazima uwe admin ili kutumia amri hii!*' 
            }, { quoted: m });
        }

        // Check if bot is admin
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const botParticipant = groupMeta.participants.find(p => p.id === botId || p.id === sock.user.id);
        const isBotAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';

        if (!isBotAdmin) {
            return await sock.sendMessage(chatId, { 
                text: '❌ *Bot lazima iwe admin ili iweze kuimlemisha wote!*' 
            }, { quoted: m });
        }

        const args = typeof text === 'string' ? text.split(/\s+/) : [];
        const action = args[0]?.toLowerCase();

        if (!action || !['on', 'off'].includes(action)) {
            const menu = `╭━━━━〔 *MUTEALL* 〕━━━━┈⊷\n` +
                `┃\n` +
                `┃ 🔇 *Enable:* \`.muteall on\`\n` +
                `┃ 🔊 *Disable:* \`.muteall off\`\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;
            return await sock.sendMessage(chatId, { text: menu }, { quoted: m });
        }

        try {
            if (action === 'on') {
                // Mute group - only admins can send messages
                await sock.groupSettingUpdate(chatId, 'not_announcement');
                const msg = `╭━━━━〔 *🔇 MUTED* 〕━━━━┈⊷\n` +
                    `┃\n` +
                    `┃ ✅ Kikundi kimeimiichamiishwa\n` +
                    `┃ 📢 Admins tu ndio wanaweza kusoma\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;
                await sock.sendMessage(chatId, { text: msg }, { quoted: m });
            } else {
                // Unmute group - everyone can send messages
                await sock.groupSettingUpdate(chatId, 'announcement');
                const msg = `╭━━━━〔 *🔊 UNMUTED* 〕━━━━┈⊷\n` +
                    `┃\n` +
                    `┃ ✅ Kikundi kimeondolewa imle\n` +
                    `┃ 💬 Wote sasa wanaweza kusoma\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;
                await sock.sendMessage(chatId, { text: msg }, { quoted: m });
            }

            // React with success
            await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (apiErr) {
            console.error('[MUTEALL] API Error:', apiErr.message);
            await sock.sendMessage(chatId, { text: '❌ *Hitilafu! Jaribu tena...*' }, { quoted: m });
        }

    } catch (err) {
        console.error('[MUTEALL] Error:', err.message);
        await sock.sendMessage(chatId, { text: '❌ *Hitilafu! Jaribu tena...*' }, { quoted: m }).catch(() => {});
    }
}

module.exports = muteAllCommand;

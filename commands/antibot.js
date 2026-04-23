/**
 * antibot.js - Prevent bots from joining the group
 * Usage: .antibot on / .antibot off
 */

const fs = require('fs/promises');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/antibot.json');

async function loadAntibotConfig() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

async function saveAntibotConfig(config) {
    try {
        await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
        await fs.writeFile(DATA_FILE, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('[ANTIBOT] Save error:', err.message);
    }
}

async function antiBotCommand(sock, chatId, m, text, options) {
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

        const args = typeof text === 'string' ? text.split(/\s+/) : [];
        const action = args[0]?.toLowerCase();

        if (!action || !['on', 'off'].includes(action)) {
            const menu = `╭━━━━〔 *ANTIBOT* 〕━━━━┈⊷\n` +
                `┃\n` +
                `┃ 🤖 *Enable:* \`.antibot on\`\n` +
                `┃ 🤖 *Disable:* \`.antibot off\`\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;
            return await sock.sendMessage(chatId, { text: menu }, { quoted: m });
        }

        const config = await loadAntibotConfig();

        if (action === 'on') {
            config[chatId] = true;
            await saveAntibotConfig(config);
            
            const msg = `╭━━━━〔 *🤖 ANTIBOT ON* 〕━━━━┈⊷\n` +
                `┃\n` +
                `┃ ✅ Bots wakamatiweza kuwi kwenye kikundi\n` +
                `┃ 🛡️ Kikundi kililindwa sasa\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;
            await sock.sendMessage(chatId, { text: msg }, { quoted: m });
        } else {
            delete config[chatId];
            await saveAntibotConfig(config);
            
            const msg = `╭━━━━〔 *🤖 ANTIBOT OFF* 〕━━━━┈⊷\n` +
                `┃\n` +
                `┃ ❌ Bots sasa wanaweza kuji kwenye kikundi\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;
            await sock.sendMessage(chatId, { text: msg }, { quoted: m });
        }

        // React with success
        await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } }).catch(() => {});

    } catch (err) {
        console.error('[ANTIBOT] Error:', err.message);
        await sock.sendMessage(chatId, { text: '❌ *Hitilafu! Jaribu tena...*' }, { quoted: m }).catch(() => {});
    }
}

// Export with helper function for other files
module.exports = antiBotCommand;
module.exports.isAntibotEnabled = async (chatId) => {
    const config = await loadAntibotConfig();
    return config[chatId] === true;
};

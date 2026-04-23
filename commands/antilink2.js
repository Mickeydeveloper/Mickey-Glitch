/**
 * antilink2.js - Pro WhatsApp Link Monitor (Owner Only)
 * Inafuta link za WhatsApp na kumtumia sender onyo Inbox.
 */
const { setAntilink, getAntilink } = require('../lib/index');
const isOwnerOrSudo = require('../lib/isOwner');

async function handleAntilink2(sock, chatId, m, text, options) {
    const senderId = m.key.participant || m.key.remoteJid;
    
    // 1. AUTHORIZATION: Owner/Sudo Pekee
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId) || m.key.fromMe;
    
    if (!isOwner) {
        return await sock.sendMessage(chatId, { 
            text: '❌ *Amri hii ni kwa ajili ya Owner wa bot pekee!*' 
        }, { quoted: m });
    }

    // 2. PARSE COMMAND
    const args = text.trim().split(/\s+/);
    const action = args[0]?.toLowerCase();

    // 3. EXECUTE ACTIONS (ON/OFF)
    if (action === 'on') {
        await setAntilink(chatId, 'antilink2', 'active');
        let resOn = `╭━━━━〔 *ANTILINK 2 PRO* 〕━━━━┈⊷\n┃\n┃ ✅ *Hali:* \`ENABLED\`\n┃ 👤 *Mamlaka:* \`Owner Only\`\n┃ 🛡️ *Hati:* \`Delete + Inbox Warning\`\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷`;
        await sock.sendMessage(chatId, { text: resOn }, { quoted: m });
        return;
    }

    if (action === 'off') {
        await setAntilink(chatId, 'antilink2', 'inactive');
        let resOff = `╭━━━━〔 *ANTILINK 2 PRO* 〕━━━━┈⊷\n┃\n┃ ❌ *Hali:* \`DISABLED\`\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷`;
        await sock.sendMessage(chatId, { text: resOff }, { quoted: m });
        return;
    }

    // 4. DEFAULT MENU
    const menu = `╭━━━━〔 *ANTILINK 2 PRO* 〕━━━━┈⊷\n┃\n┃ 📌 *MKOA WA OWNER:*\n┃ • \`.antilink2 on\` - Washa Ulinzi\n┃ • \`.antilink2 off\` - Zima Ulinzi\n┃\n┃ ✨ *Kazi:* Inafuta link na kumfata\n┃ mtu Inbox kumpa onyo.\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷`;
    return await sock.sendMessage(chatId, { text: menu }, { quoted: m });
}

/**
 * ENGINE YA KUFUTA (Hii iitwe kule main.js)
 */
async function antilink2Engine(sock, chatId, m, msgText) {
    if (!chatId.endsWith('@g.us')) return;

    // Cheki kama Antilink 2 imewashwa kwenye hili group
    const config = await getAntilink(chatId);
    if (!config || config.antilink2 !== 'active') return;

    // Regex ya link za WhatsApp pekee
    const waLink = /chat.whatsapp.com\/([0-9A-Za-z]{20,26})/i;
    
    if (waLink.test(msgText)) {
        const senderId = m.key.participant || m.key.remoteJid;
        
        // 1. Cheki kama aliyetuma ni Owner/Sudo (Wao wanaruhusiwa)
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId) || m.key.fromMe;
        if (isOwner) return;

        // 2. Futa Meseji Group-ini
        await sock.sendMessage(chatId, { delete: m.key }).catch(() => {});

        // 3. Tuma Onyo Inbox (Private Message)
        const warningMsg = `⚠️ *ONYO LA ANTILINK*\n\nHabari, usitume link za magroup mengine kwenye group letu. Ujumbe wako umefutwa.\n\n*Ujumbe ulioufuta:*`;
        
        try {
            // Tuma onyo na forward ile meseji yake
            await sock.sendMessage(senderId, { text: warningMsg });
            await sock.copyNForward(senderId, m, true);
        } catch (e) {
            console.log('Failed to send inbox warning:', e.message);
        }
    }
}

// Export zote mbili
module.exports = handleAntilink2;
module.exports.antilink2Engine = antilink2Engine;

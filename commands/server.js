const { sendInteractiveMessage } = require('gifted-btns');
const halotel = require('./halotel');
const settings = require('./settings');

const PANEL_PACKAGES = halotel.PANEL_PACKAGES || [];
const createPterodactylServer = halotel.createPterodactylServer;

const CONFIG = settings.CONFIG;
const SAFE_CONFIG = CONFIG || { BANNER: 'https://files.catbox.moe/ljabyq.png', FOOTER: '🚀 Powered by Mickey Glitch Tech' };

async function serverCommand(sock, chatId, m, body = '') {
    try {
        const userName = m.pushName || 'Mteja';
        const userJid = m.key.participant || m.key.remoteJid;

        let input = (
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            m.message?.buttonsResponseMessage?.selectedButtonId ||
            body || ''
        ).toLowerCase().trim();

        // Show server package menu
        if (input === '.server') {
            const panelRows = PANEL_PACKAGES.map(p => ({
                header: p.name,
                title: `RAM: ${p.specs.ram} GB | CPU: ${p.specs.cpu}%`,
                description: `💾 Disk: ${p.specs.disk} GB SSD — TSh ${p.price.toLocaleString()}`,
                id: p.id
            }));

            return await sendInteractiveMessage(sock, chatId, {
                image: { url: SAFE_CONFIG.BANNER },
                text: `Chagua server package, ${userName}:`,
                footer: SAFE_CONFIG.FOOTER,
                interactiveButtons: [{
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({ title: '🛒 CHAGUA SERVER SPECS', sections: [{ title: 'SERVER PACKAGES', rows: panelRows }] })
                }]
            }, { quoted: m });
        }

        // If user selected a panel id
        const selectedPanel = PANEL_PACKAGES.find(p => p.id === input);
        if (selectedPanel) {
            await sock.sendMessage(chatId, { react: { text: '⏳', key: m.key } });
            await sock.sendMessage(chatId, { text: '⏳ *Kuandaa server yako... tafadhali subiri...*' });

            const creation = await createPterodactylServer(userName, userJid, selectedPanel.specs);
            if (creation.success) {
                return await sock.sendMessage(chatId, {
                    text: `*SERVER IMEANDIKWA!* 🎉\n\n🔗 Link: ${creation.link}\n👤 Username: ${creation.username}\n🔑 Password: ${creation.password}\n\nSpecs:\n • RAM: ${selectedPanel.specs.ram} GB\n • CPU: ${selectedPanel.specs.cpu}%\n • DISK: ${selectedPanel.specs.disk} GB\n\nTafadhali badilisha password mara moja.`
                }, { quoted: m });
            }

            return await sock.sendMessage(chatId, { text: `❌ Tatizo: ${creation.error}` }, { quoted: m });
        }

        // fallback: if message is not recognized
        if (!input) {
            return await sock.sendMessage(chatId, { text: 'Tumia .server kuonyesha packages za server.' }, { quoted: m });
        }

    } catch (e) {
        console.error('Server Command Error:', e);
        await sock.sendMessage(chatId, { text: `❌ Server error: ${e.message}` }, { quoted: m });
    }
}

module.exports = serverCommand;

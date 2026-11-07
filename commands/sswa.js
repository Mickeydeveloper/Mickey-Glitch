const isOwnerOrSudo = require('../lib/isOwner');

async function sswaCommand(sock, chatId, message, args = [], options = {}) {
    const senderId = options.senderId || message?.key?.participant || message?.key?.remoteJid || '';
    const allowed = Boolean(message?.key?.fromMe) || await isOwnerOrSudo(senderId, sock, chatId);

    if (!allowed) {
        await sock.sendMessage(chatId, {
            text: '⚠️ Command hii inaruhusiwa kwa owner au sudo pekee.'
        }, { quoted: message });
        return;
    }

    const wweb = sock?.wweb;
    if (!wweb || typeof wweb.run !== 'function') {
        await sock.sendMessage(chatId, {
            text: '❌ Feature ya WhatsApp Web screenshot haipatikani kwenye Baileys iliyopo.'
        }, { quoted: message });
        return;
    }

    const mode = String(Array.isArray(args) ? args[0] || 'chat' : args || 'chat').toLowerCase();
    if (!['chat', 'home', 'login', 'reset'].includes(mode)) {
        await sock.sendMessage(chatId, {
            text: 'Matumizi: .sswa [chat|home|login|reset]'
        }, { quoted: message });
        return;
    }

    try {
        if (typeof wweb.usePuppeteer === 'function') {
            try {
                wweb.usePuppeteer(require('puppeteer'));
            } catch (error) {
                if (error?.code !== 'MODULE_NOT_FOUND') throw error;
            }
        }

        await wweb.run(message, {
            mode,
            usedPrefix: options.config?.prefix || global.prefix || '.',
            command: 'sswa',
            name: sock.getName?.(chatId) || message?.pushName || ''
        });
    } catch (error) {
        console.error('[sswa] WhatsApp Web screenshot failed:', error?.message || error);
        await sock.sendMessage(chatId, {
            text: `❌ SSWA imeshindwa: ${error?.message || 'Kosa lisilotarajiwa.'}`
        }, { quoted: message });
    }
}

sswaCommand.name = 'sswa';
sswaCommand.description = 'Piga screenshot ya chat au WhatsApp Web home';
sswaCommand.category = 'OWNER/ADMIN';
sswaCommand.aliases = ['sswaweb'];

module.exports = sswaCommand;
// plugins/mypanel.js
const { getUserPanel } = require('../lib/createPanel');

module.exports = {
    name: 'mypanel',
    aliases: ['panelinfo', 'mypanels'],
    category: 'panel',
    description: 'Check your panel information',
    usage: '.mypanel',
    permissions: { owner: false },
    
    execute: async (sock, msg, args) => {
        try {
            const jid = msg.key.remoteJid;
            const sender = msg.key.participant || msg.key.remoteJid;
            
            const panel = getUserPanel(sender);
            
            if (!panel) {
                return await sock.sendMessage(jid, {
                    text: `❌ *No Panel Found*\n\n` +
                          `You don't have an active panel.\n` +
                          `Use \`.buy 1gb <username>\` to create one.`
                }, { quoted: msg });
            }

            const statusEmoji = panel.status === 'active' ? '✅' : '❌';
            
            await sock.sendMessage(jid, {
                text: `📊 *Your Panel Information*\n\n` +
                      `🆔 *Panel ID:* ${panel.panelId}\n` +
                      `👤 *Username:* ${panel.username}\n` +
                      `📧 *Email:* ${panel.email}\n` +
                      `🔑 *Password:* \`${panel.password}\`\n` +
                      `📌 *Plan:* ${panel.plan}\n` +
                      `📅 *Created:* ${new Date(panel.created).toLocaleDateString()}\n` +
                      `📊 *Status:* ${statusEmoji} ${panel.status}\n\n` +
                      `_Contact admin for support._`
            }, { quoted: msg });

        } catch (error) {
            console.error('[MYPANEL ERROR]', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Error fetching panel info: ${error.message}`
            }, { quoted: msg });
        }
    }
};
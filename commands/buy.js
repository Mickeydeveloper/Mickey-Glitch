// plugins/buy.js
const createPanel = require('../createPanel');
const config = require('../config');

module.exports = {
    name: 'buy',
    aliases: ['1gb', 'buy1gb', 'purchase', 'panel'],
    category: 'panel',
    description: 'Create a new panel with specified plan',
    usage: '.buy <plan> <username>',
    permissions: { owner: true },
    
    execute: async (sock, msg, args) => {
        try {
            const jid = msg.key.remoteJid;
            const sender = msg.key.participant || msg.key.remoteJid;
            const senderName = msg.pushName || 'User';

            // Parse arguments
            const rawArgs = Array.isArray(args) ? args.join(' ').trim() : String(args || '').trim();
            
            // Extract plan (e.g., 1gb, 2gb, 5gb)
            const sizeMatch = rawArgs.match(/\d+gb/i);
            const plan = sizeMatch ? sizeMatch[0].toLowerCase() : '1gb';
            
            // Extract username (remove plan from args)
            const userName = rawArgs.replace(/\d+gb/i, '').trim() || sender.split('@')[0] || 'mickey';

            // Send processing message
            const processingMsg = await sock.sendMessage(jid, { 
                text: `⏳ *Processing Panel Creation...*\n\n` +
                      `📌 *Plan:* ${plan}\n` +
                      `👤 *Username:* ${userName}\n` +
                      `🔧 *Status:* Initializing...`
            }, { quoted: msg });

            // Call createPanel function
            const result = await createPanel({
                sock,
                msg,
                args: {
                    plan,
                    username: userName,
                    sender,
                    senderName
                }
            });

            // Success response
            if (result && result.success) {
                await sock.sendMessage(jid, { 
                    text: `✅ *Panel Created Successfully!*\n\n` +
                          `📌 *Plan:* ${plan}\n` +
                          `👤 *Username:* ${userName}\n` +
                          `🔑 *Panel ID:* ${result.panelId || 'N/A'}\n` +
                          `📧 *Email:* ${result.email || 'N/A'}\n` +
                          `🔗 *Login Link:* ${result.loginLink || 'N/A'}\n\n` +
                          `_Check your email for login details._`,
                    edit: processingMsg.key
                });
            } else {
                throw new Error(result?.error || 'Panel creation failed');
            }

        } catch (error) {
            console.error('[BUY COMMAND ERROR]', error);
            
            // Error response
            const errorMsg = `❌ *Panel Creation Failed*\n\n` +
                           `📌 *Error:* ${error.message || 'Unknown error'}\n` +
                           `🔄 *Tip:* Try again or contact support.`;
            
            await sock.sendMessage(msg.key.remoteJid, { 
                text: errorMsg 
            }, { quoted: msg });
        }
    }
};
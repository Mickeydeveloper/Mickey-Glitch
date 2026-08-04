// plugins/buy.js
const createPanel = require('../lib/createPanel');
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

            // Create context object for createPanel
            const ctx = {
                sock,
                msg,
                args: rawArgs,
                senderId: sender,
                senderName: senderName,
                reply: async (text) => {
                    return await sock.sendMessage(jid, { text }, { quoted: msg });
                },
                tools: {
                    cmd: {
                        handleError: async (ctx, error, show) => {
                            console.error('[BUY ERROR]', error);
                            if (show) {
                                await sock.sendMessage(jid, {
                                    text: `❌ Error: ${error.message}`
                                }, { quoted: msg });
                            }
                        }
                    }
                }
            };

            // Call createPanel from lib folder
            await createPanel(ctx, {
                plan: plan,
                username: userName,
            });

            // Success message (createPanel should handle its own success message)
            await sock.sendMessage(jid, {
                text: `✅ *Panel Creation Initiated!*\n\n` +
                      `📌 *Plan:* ${plan}\n` +
                      `👤 *Username:* ${userName}\n` +
                      `📧 *Check your email for login details.*\n\n` +
                      `_Processing may take a few moments..._`,
                edit: processingMsg.key
            });

        } catch (error) {
            console.error('[BUY COMMAND ERROR]', error);
            
            const errorMsg = `❌ *Panel Creation Failed*\n\n` +
                           `📌 *Error:* ${error.message || 'Unknown error'}\n` +
                           `🔄 *Tip:* Try again or contact support.`;
            
            await sock.sendMessage(msg.key.remoteJid, { 
                text: errorMsg 
            }, { quoted: msg });
        }
    }
};
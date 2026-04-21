// Temp folder setup for file handling
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const customTemp = path.join(process.cwd(), 'temp');
const customTmp = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp, { recursive: true });
if (!fs.existsSync(customTmp)) fs.mkdirSync(customTmp, { recursive: true });

process.env.TMPDIR = customTemp;
process.env.TEMP = customTemp;
process.env.TMP = customTemp;

const settings = require('./settings');
require('./config.js');
const { safeSendMessage } = require('./lib/myfunc');
const isOwnerOrSudo = require('./lib/isOwner');

// Status handlers
const { handleStatusUpdate } = require('./commands/autostatus');
const { handleStatusForward } = require('./commands/statusforward');

// Command loader
const { autoLoadCommands, getCommand } = require('./lib/autoCommandLoader');
let allCommands = {}; 

try {
    allCommands = autoLoadCommands();
    console.log(chalk.green(`✅ Loaded ${Object.keys(allCommands).length} commands`))
    console.log(chalk.blue(`Available commands: ${Object.keys(allCommands).slice(0, 10).join(', ')}...`))
} catch (e) {
    console.error(chalk.red('Failed to load commands:'), e.message)
}

// Static Import for Help
const helpFunc = require('./commands/help');
// --- 🤖 CHATBOT HANDLER ---
const { handleChatbotMessage } = require('./commands/chatbot');
async function handleMessages(sock, messageUpdate) {
    try {
        if (!sock || !sock.user) return;
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const m = messages[0];
        if (!m?.message) return;

        const chatId = m.key.remoteJid;
        const senderId = m.key.participant || m.key.remoteJid;
        const mType = Object.keys(m.message)[0];

        // --- 🤖 HANDLE CHATBOT FOR ALL MESSAGES ---
        try {
            await handleChatbotMessage(sock, chatId, m);
        } catch (chatErr) {
            // Silent chatbot error
        }

        // --- 🔘 ADVANCED BUTTON HANDLER (reads all buttons from all commands) ---
        let buttonId = null;
        let buttonSource = 'unknown';

        try {
            // Type 1: Interactive Response (List Select / Single Select)
            if (mType === 'interactiveResponseMessage') {
                const nativeFlow = m.message.interactiveResponseMessage.nativeFlowResponseMessage;
                if (nativeFlow?.paramsJson) {
                    try {
                        const parsed = JSON.parse(nativeFlow.paramsJson);
                        // Handle list select response
                        if (parsed.id) {
                            buttonId = parsed.id;
                            buttonSource = 'interactive_list';
                        } else if (parsed.selectedRowId) {
                            buttonId = parsed.selectedRowId;
                            buttonSource = 'interactive_rows';
                        }
                    } catch (parseErr) {
                        console.error(chalk.yellow(`⚠️  Button JSON parse error: ${parseErr.message}`));
                    }
                }
            }
            
            // Type 2: Classic Buttons Response
            if (!buttonId && mType === 'buttonsResponseMessage') {
                buttonId = m.message.buttonsResponseMessage.selectedButtonId;
                buttonSource = 'button_response';
            }

            // Type 3: Template Button Response
            if (!buttonId && mType === 'templateButtonReplyMessage') {
                buttonId = m.message.templateButtonReplyMessage.selectedId;
                buttonSource = 'template_button';
            }

            // Sanitize buttonId: Clean it and ensure it's safe
            if (buttonId) {
                buttonId = String(buttonId).trim();
                console.log(chalk.green(`🔘 Button clicked: ${buttonId} (source: ${buttonSource})`));
            }
        } catch (btnErr) {
            console.error(chalk.red(`❌ Button extraction error: ${btnErr.message}`));
        }

        // --- 📝 MESSAGE PARSING (with robust button ID handling) ---
        let rawBody = '';
        
        if (buttonId) {
            // Enhanced button ID processing
            try {
                // Remove any non-alphanumeric characters except dot and space
                let cleanId = buttonId.replace(/[^a-zA-Z0-9._\- ]/g, '');
                
                // Ensure it starts with dot
                if (!cleanId.startsWith('.')) {
                    cleanId = '.' + cleanId.trim();
                }
                
                rawBody = cleanId.trim();
                console.log(chalk.blue(`📌 Button ID processed: "${buttonId}" → "${rawBody}"`));
            } catch (idErr) {
                console.error(chalk.red(`❌ Button ID processing error: ${idErr.message}`));
                return; // Skip this message if button ID fails
            }
        } else {
            // Try different message types
            const msg = m.message;
            if (msg.conversation) {
                rawBody = msg.conversation;
            } else if (msg.extendedTextMessage) {
                rawBody = msg.extendedTextMessage.text;
            } else if (msg.imageMessage) {
                rawBody = msg.imageMessage.caption || '';
            } else if (msg.videoMessage) {
                rawBody = msg.videoMessage.caption || '';
            } else if (msg.documentMessage) {
                rawBody = msg.documentMessage.caption || '';
            } else if (msg.audioMessage) {
                rawBody = msg.audioMessage.caption || '';
            } else if (msg.stickerMessage) {
                rawBody = ''; // Stickers don't have text
            } else {
                rawBody = '';
            }
        }

        rawBody = rawBody.trim();

        // 1. Check if it starts with prefix (.)
        if (!rawBody.startsWith('.')) {
            return;
        }

        // 2. FIX: Handle ". menu" by removing space after dot
        const cleanBody = rawBody.startsWith('. ')
            ? '.' + rawBody.slice(1).trim()
            : rawBody.trim();

        console.log(chalk.cyan(`📨 Raw: "${rawBody}" → Clean: "${cleanBody}"`))

        const args = cleanBody.split(' ');
        const cmdName = args[0].toLowerCase().slice(1); // Extract command name
        const fullCmd = args[0].toLowerCase(); // Full command with dot

        console.log(chalk.cyan(`   Command: ${cmdName} (from ${fullCmd})`))

        // Validate command name
        if (!cmdName || cmdName.length === 0) {
            console.log(chalk.yellow(`⚠️  Empty command name, skipping`));
            return;
        }

        // Owner check
        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);
        const isOwnerCheck = m.key.fromMe || senderIsOwnerOrSudo; // Bot's own messages count as owner
        console.log(chalk.cyan(`   Is owner: ${isOwnerCheck ? 'YES' : 'NO'}`))

        // --- 🚀 EXECUTION ENGINE ---

        // --- Load commands ONLY from /commands/ folder ---
        const selectedCommand = getCommand(allCommands, cmdName);
        console.log(chalk.cyan(`   Looking for command: ${cmdName}`))
        console.log(chalk.cyan(`   Command found: ${selectedCommand ? 'YES' : 'NO'}`))

        if (selectedCommand) {
            // Sudo Restriction
            const sudoOnly = ['setpp', 'update', 'broadcast', 'cleartmp'];
            if (sudoOnly.includes(cmdName) && !isOwnerCheck) {
                await sock.sendMessage(chatId, { 
                    text: "❌ *ACCESS DENIED:* Owner only!" 
                }, { quoted: m }).catch(() => {});
                return;
            }

            console.log(chalk.blue(`   Executing ${cmdName}...`))
            try {
                // Determine command type and execute with error handling
                if (typeof selectedCommand === 'function') {
                    console.log(chalk.blue(`   Type: Function`))
                    await Promise.race([
                        selectedCommand(sock, chatId, m, cleanBody),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Command timeout')), 30000))
                    ]).catch(funcErr => {
                        console.error(chalk.red(`❌ Function execution error: ${funcErr.message}`));
                        throw funcErr;
                    });
                } else if (selectedCommand.execute && typeof selectedCommand.execute === 'function') {
                    console.log(chalk.blue(`   Type: Module.execute()`))
                    await Promise.race([
                        selectedCommand.execute(sock, chatId, m, cleanBody),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Command timeout')), 30000))
                    ]).catch(modErr => {
                        console.error(chalk.red(`❌ Module execution error: ${modErr.message}`));
                        throw modErr;
                    });
                } else {
                    console.log(chalk.yellow(`   Type: Unknown format`))
                    await sock.sendMessage(chatId, {
                        text: `❌ *Command error*`
                    }, { quoted: m }).catch(() => {});
                }
                console.log(chalk.green(`✅ Command executed successfully`))
            } catch (cmdErr) {
                console.error(chalk.red(`❌ Command execution error: ${cmdErr.message}`));
                // Graceful error handling - don't crash, just log
                try {
                    await sock.sendMessage(chatId, {
                        text: `❌ *Error executing ${cmdName}:*\n${cmdErr.message || 'Unknown error'}`
                    }, { quoted: m }).catch(() => {});
                } catch (sendErr) {
                    console.error(chalk.red(`❌ Failed to send error message: ${sendErr.message}`));
                }
            }
        } else {
            console.log(chalk.yellow(`⚠️ Command not found: ${cmdName}`))
            // Optional: inform user that command doesn't exist
            try {
                await sock.sendMessage(chatId, {
                    text: `❌ *Command not found:* .${cmdName}\n\nType *.menu* to see available commands`
                }, { quoted: m }).catch(() => {});
            } catch (notFoundErr) {
                console.error(chalk.red(`Failed to send not found message: ${notFoundErr.message}`));
            }
        }

    } catch (e) {
        console.error(chalk.red('❌ CRITICAL Message handler error:'), e.message);
        console.error(chalk.red('Stack:'), e.stack);
    }
}

// Status update handler (autostatus & statusforward)
async function handleStatus(sock, messageUpdate) {
    try {
        if (!sock || !messageUpdate?.messages?.length) return;
        await Promise.allSettled([
            handleStatusUpdate(sock, messageUpdate),
            handleStatusForward(sock, messageUpdate)
        ]);
    } catch (e) {
        // Silent fail for status handler
    }
}

module.exports = { handleMessages, handleStatus };

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
const helpFunc = require('./commands/menu');
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

        // 2. Handle ". menu" by removing space after dot
        const cleanBody = rawBody.startsWith('. ')
            ? '.' + rawBody.slice(1).trim()
            : rawBody.trim();

        const args = cleanBody.split(' ');
        const cmdName = args[0].toLowerCase().slice(1); // Extract command name
        
        // Validate command name
        if (!cmdName || cmdName.length === 0) {
            return;
        }

        // Owner check
        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);
        const isOwnerCheck = m.key.fromMe || senderIsOwnerOrSudo;

        // --- 🚀 EXECUTION ENGINE ---

        // --- Load commands ONLY from /commands/ folder ---
        const selectedCommand = getCommand(allCommands, cmdName);

        if (selectedCommand) {
            // Sudo Restriction
            const sudoOnly = ['setpp', 'update', 'broadcast', 'cleartmp'];
            if (sudoOnly.includes(cmdName) && !isOwnerCheck) {
                await sock.sendMessage(chatId, { 
                    text: "❌ *ACCESS DENIED:* Owner only!" 
                }, { quoted: m }).catch(() => {});
                return;
            }

            try {
                // Execute command with timeout protection
                const commandTimeout = cmdName.includes('play') || cmdName.includes('video') || cmdName.includes('download') ? 60000 : 20000;
                
                if (typeof selectedCommand === 'function') {
                    // Direct function call
                    await Promise.race([
                        selectedCommand(sock, chatId, m, cleanBody),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Command timeout')), commandTimeout))
                    ]);
                } else if (selectedCommand.execute && typeof selectedCommand.execute === 'function') {
                    // Module with execute method
                    await Promise.race([
                        selectedCommand.execute(sock, chatId, m, cleanBody),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Command timeout')), commandTimeout))
                    ]);
                } else {
                    // Unknown format - try calling directly
                    await Promise.race([
                        selectedCommand(sock, chatId, m, cleanBody),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Command timeout')), commandTimeout))
                    ]);
                }
            } catch (cmdErr) {
                // Silently handle command errors - don't spam user
                console.error(`[${cmdName}] Error:`, cmdErr.message);
            }
        }
        // Don't send "not found" message for non-existent commands to reduce spam

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

// Function to reload commands (called after reconnection)
function reloadCommands() {
    try {
        // Clear the require cache for all command modules
        const commandsPath = path.join(process.cwd(), 'commands');
        if (fs.existsSync(commandsPath)) {
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                delete require.cache[path.resolve(filePath)];
            }
        }
        
        allCommands = autoLoadCommands();
        console.log(chalk.cyan(`🔄 Commands reloaded: ${Object.keys(allCommands).length} commands available`));
        return allCommands;
    } catch (err) {
        console.error(chalk.red('Failed to reload commands:'), err.message);
        return allCommands;
    }
}

module.exports = { handleMessages, handleStatus, reloadCommands };

const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { sendButtons } = require('gifted-btns');
const { sendInteractiveMessage } = require('gifted-btns');

/**
 * Main command handler
 */
const aliveCommand = async (sock, chatId, message) => {
    try {
        // ==================== SHOW MENU ====================
        const senderName = message.pushName || 'User';
        const botName = 'MICKEY GLITCH';
        const prefix = '.';
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const dateStr = now.format('ddd, MMM D, YYYY');
        const timeStr = now.format('HH:mm:ss');
        const hr = now.hour();
        const greet = hr < 12 ? 'Habari za Asubuhi ☀️' : hr < 18 ? 'Habari za Mchana 🌤️' : 'Habari za Jioni 🌙';

        const uptimeSec = process.uptime();
        const hrs = Math.floor(uptimeSec / 3600);
        const mins = Math.floor((uptimeSec % 3600) / 60);
        const runtimeStr = `${hrs}h ${mins}m`;

        const helpText = `╔════════════════════╗
  ✨ *${botName}* — *V3.0*
╚════════════════════╝
┌  👋 *${greet}*
│  👤 *User:* ${senderName}
│  🕒 *Time:* ${timeStr}
│  📅 *Date:* ${dateStr}
│  💻 *OS:* ${os.platform()}
│  ⏳ *Up:* ${runtimeStr}
└────────────────────┘`;

        // Send interactive message with sections and picker list
        return await sendInteractiveMessage(sock, chatId, {
            text: helpText,
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '📋 Choose a Category',
                        sections: [
                            {
                                title: '🎮 Main Commands',
                                rows: [
                                    { header: '📋', title: 'Full Menu', description: 'View all available commands', id: 'cmd_menu' },
                                    { header: '⚡', title: 'Ping', description: 'Check bot speed', id: 'cmd_ping' },
                                    { header: '👑', title: 'Owner Info', description: 'Bot owner information', id: 'cmd_owner' }
                                ]
                            },
                            {
                                title: '🤖 AI & Chat',
                                rows: [
                                    { header: '🤖', title: 'AI Chat', description: 'Talk to AI assistant', id: 'cmd_ai' },
                                    { header: '💬', title: 'Chatbot', description: 'Interactive chat', id: 'cmd_chatbot' },
                                    { header: '🔤', title: 'Translate', description: 'Translate text', id: 'cmd_translate' }
                                ]
                            },
                            {
                                title: '🎵 Media',
                                rows: [
                                    { header: '🎵', title: 'Play Music', description: 'Search & play songs', id: 'cmd_play' },
                                    { header: '🎬', title: 'Video', description: 'Download videos', id: 'cmd_video' },
                                    { header: '🖼️', title: 'Images', description: 'Image generation & tools', id: 'cmd_img' }
                                ]
                            },
                            {
                                title: '🎭 Fun & Stickers',
                                rows: [
                                    { header: '🎭', title: 'Stickers', description: 'Create & manage stickers', id: 'cmd_sticker' },
                                    { header: '😂', title: 'Compliment', description: 'Get a nice compliment', id: 'cmd_compliment' },
                                    { header: '🎪', title: 'Character', description: 'Text art & characters', id: 'cmd_character' }
                                ]
                            },
                            {
                                title: '⚙️ Settings',
                                rows: [
                                    { header: '⚙️', title: 'Bot Settings', description: 'Configure bot settings', id: 'cmd_settings' },
                                    { header: '🛡️', title: 'Group Manage', description: 'Group management tools', id: 'cmd_groupmanage' },
                                    { header: '❌', title: 'Exit', description: 'Close this menu', id: 'cmd_cancel' }
                                ]
                            }
                        ]
                    })
                }
            ]
        }, { quoted: message });

    } catch (e) {
        console.error("Error in help.js:", e);
        await sock.sendMessage(chatId, { text: "Hitilafu imetokea! (Error loading menu)" });
    }
};

/**
 * Handle button responses from interactive message
 */
const handleButtonResponse = async (sock, message, buttonId, chatId) => {
    const userMessage = message.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson
        ? JSON.parse(message.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)
        : null;
    
    const selectedId = userMessage?.id || buttonId;

    try {
        // Map button IDs to commands
        const commandMap = {
            'cmd_menu': '.menu',
            'cmd_ping': '.ping',
            'cmd_owner': '.owner',
            'cmd_ai': '.ai',
            'cmd_chatbot': '.chatbot',
            'cmd_translate': '.translate',
            'cmd_play': '.play',
            'cmd_video': '.video',
            'cmd_img': '.imagine',
            'cmd_sticker': '.sticker',
            'cmd_compliment': '.compliment',
            'cmd_character': '.character',
            'cmd_settings': '.settings',
            'cmd_groupmanage': '.groupmanage',
            'cmd_cancel': null
        };

        const command = commandMap[selectedId];

        if (selectedId === 'cmd_cancel') {
            return await sock.sendMessage(chatId, { text: '✅ Menu closed.' });
        }

        if (command) {
            // Send text message that will trigger the command
            const replyMessage = {
                text: command,
                contextInfo: {
                    quotedMessage: message.message
                }
            };
            return await sock.sendMessage(chatId, replyMessage);
        }

    } catch (e) {
        console.error("Error handling button response:", e);
        await sock.sendMessage(chatId, { text: "Hitilafu imetokea! (Error processing selection)" });
    }
};

// Export main command as default, with handler attached
aliveCommand.handleButtonResponse = handleButtonResponse;
module.exports = aliveCommand;

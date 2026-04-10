const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { sendButtons } = require('gifted-btns');
const { sendInteractiveMessage } = require('gifted-btns');

/**
 * Main command handler - Display all available commands
 */
const aliveCommand = async (sock, chatId, message) => {
    try {
        const senderName = message.pushName || 'User';
        const botName = 'MICKEY GLITCH';

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

        return await sendInteractiveMessage(sock, chatId, {
            text: helpText,
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '📋 CHAGUA AMRI',
                        sections: [
                            {
                                title: '🎮 COMMANDS',
                                rows: [
                                    { header: '📋', title: 'Menu', description: 'View all commands', id: '.help' },
                                    { header: '⚡', title: 'Ping', description: 'Speed test', id: '.ping' },
                                    { header: '👑', title: 'Owner', description: 'Owner info', id: '.owner' },
                                    { header: '❤️', title: 'Alive', description: 'Bot status check', id: '.alive' },
                                    { header: '⚙️', title: 'Settings', description: 'Bot configuration', id: '.settings' }
                                ]
                            },
                            {
                                title: '🤖 AI & NLP',
                                rows: [
                                    { header: '🤖', title: 'AI', description: 'AI assistant', id: '.ai' },
                                    { header: '💬', title: 'Chatbot', description: 'Interactive chat', id: '.chatbot' },
                                    { header: '🔤', title: 'Translate', description: 'Translate text', id: '.translate' },
                                    { header: '🎯', title: 'TTS', description: 'Text to speech', id: '.tts' },
                                    { header: '🔍', title: 'Truecaller', description: 'Lookup phone', id: '.truecaller' }
                                ]
                            },
                            {
                                title: '🎵 MEDIA',
                                rows: [
                                    { header: '🎵', title: 'Play', description: 'Play music', id: '.play' },
                                    { header: '🎬', title: 'Video', description: 'Download video', id: '.video' },
                                    { header: '🖼️', title: 'Imagine', description: 'AI image generate', id: '.imagine' },
                                    { header: '🎭', title: 'Sticker', description: 'Create stickers', id: '.sticker' },
                                    { header: '📸', title: 'Shazam', description: 'Identify song', id: '.shazam' }
                                ]
                            },
                            {
                                title: '📥 DOWNLOADS',
                                rows: [
                                    { header: '🎥', title: 'TikTok', description: 'Download from TikTok', id: '.tiktok' },
                                    { header: '📷', title: 'Instagram', description: 'Download from Instagram', id: '.instagram' },
                                    { header: '👍', title: 'Facebook', description: 'Download from Facebook', id: '.facebook' },
                                    { header: '🔗', title: 'URL', description: 'Download from URL', id: '.url' },
                                    { header: '🎵', title: 'SongID', description: 'Get song details', id: '.songid' }
                                ]
                            },
                            {
                                title: '🎨 STICKERS & ART',
                                rows: [
                                    { header: '🎭', title: 'Sticker', description: 'Create sticker', id: '.sticker' },
                                    { header: '✂️', title: 'StickerCrop', description: 'Crop sticker', id: '.stickercrop' },
                                    { header: '🔄', title: 'Sticker-Alt', description: 'Alt sticker format', id: '.sticker-alt' },
                                    { header: '✈️', title: 'StickerTelegram', description: 'Telegram sticker', id: '.stickertelegram' },
                                    { header: '🎪', title: 'Character', description: 'Text art', id: '.character' }
                                ]
                            },
                            {
                                title: '👥 GROUP MANAGE',
                                rows: [
                                    { header: '🔇', title: 'Mute', description: 'Mute member', id: '.mute' },
                                    { header: '🔊', title: 'Unmute', description: 'Unmute member', id: '.unmute' },
                                    { header: '👊', title: 'Kick', description: 'Kick member', id: '.kick' },
                                    { header: '➕', title: 'Add', description: 'Add member', id: '.add' },
                                    { header: '⬆️', title: 'Promote', description: 'Promote member', id: '.promote' }
                                ]
                            },
                            {
                                title: '👥 GROUP MANAGE 2',
                                rows: [
                                    { header: '⬇️', title: 'Demote', description: 'Demote member', id: '.demote' },
                                    { header: '🏷️', title: 'Tag', description: 'Tag members', id: '.tag' },
                                    { header: '📢', title: 'TagAll', description: 'Tag everyone', id: '.tagall' },
                                    { header: '🏷️❌', title: 'TagNotAdmin', description: 'Tag non-admins', id: '.tagnotadmin' },
                                    { header: '🤐', title: 'HideTag', description: 'Hide tag mention', id: '.hidetag' }
                                ]
                            },
                            {
                                title: '🛡️ PROTECTION',
                                rows: [
                                    { header: '🔗', title: 'AntiLink', description: 'Stop group links', id: '.antilink' },
                                    { header: '🏷️', title: 'AntiTag', description: 'Stop tag spam', id: '.antitag' },
                                    { header: '🚫', title: 'AntiBadword', description: 'Filter bad words', id: '.antibadword' },
                                    { header: '📵', title: 'AntiCall', description: 'Block calls', id: '.anticall' },
                                    { header: '🗑️', title: 'AntiDelete', description: 'Recover deleted', id: '.antidelete' }
                                ]
                            },
                            {
                                title: '🛡️ PROTECTION 2',
                                rows: [
                                    { header: '💬', title: 'Mention', description: 'Mention alerts', id: '.mention' },
                                    { header: '📲', title: 'AntiStatusMention', description: 'Status mention alert', id: '.antistatusmention' },
                                    { header: '⛔', title: 'PMBlocker', description: 'Block PMs', id: '.pmblocker' },
                                    { header: '👻', title: 'Ghost', description: 'Ghost mode', id: '.ghost' },
                                    { header: '⚠️', title: 'Warn', description: 'Warn member', id: '.warn' }
                                ]
                            },
                            {
                                title: '📊 PROFILE & AVATAR',
                                rows: [
                                    { header: '👤', title: 'SetPP', description: 'Set profile pic', id: '.setpp' },
                                    { header: '👤', title: 'GetPP', description: 'Get profile pic', id: '.getpp' },
                                    { header: '👤', title: 'PP', description: 'My profile pic', id: '.pp' },
                                    { header: '👥', title: 'GroupManage', description: 'Group settings', id: '.groupmanage' },
                                    { header: '📝', title: 'Whois', description: 'User info', id: '.whois' }
                                ]
                            },
                            {
                                title: '✨ FUN',
                                rows: [
                                    { header: '😂', title: 'Compliment', description: 'Get compliment', id: '.compliment' },
                                    { header: '🏆', title: 'TopMembers', description: 'Active members', id: '.topmembers' },
                                    { header: '🎵', title: 'Lyrics', description: 'Get lyrics', id: '.lyrics' },
                                    { header: '⛅', title: 'Weather', description: 'Weather info', id: '.weather' },
                                    { header: '❌', title: 'Cancel', description: 'Close menu', id: '.cancel' }
                                ]
                            }
                        ]
                    })
                }
            ],
            contextInfo: {
                externalAdReply: {
                    title: '🎉 MICKEY GLITCH',
                    body: 'COMMAND MENU - Bonyeza Button',
                    mediaUrl: 'https://water-billing-292n.onrender.com/1761205727440.png',
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    thumbnail: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'),
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
                }
            }
        }, { quoted: message });

    } catch (e) {
        console.error("Error in help.js:", e);
        await sock.sendMessage(chatId, { text: "❌ Hitilafu imetokea!" });
    }
};

/**
 * Complete handler for all button responses
 * Works from selection all the way through execution
 */
const handleButtonResponse = async (sock, message, buttonId, chatId) => {
    try {
        // Extract the selected ID from the interactive response
        let selectedId = buttonId;

        // If message has interactive response data, parse it
        if (message.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
            try {
                const params = JSON.parse(message.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
                selectedId = params.id || buttonId;
            } catch (parseError) {
                console.log('Parse error, using buttonId:', buttonId);
                selectedId = buttonId;
            }
        }

        console.log(`[HELP HANDLER] Selected ID: ${selectedId}`);

        // Comprehensive command mapping with all commands
        const commandMap = {
            // Main Commands
            '.help': '.help',
            '.ping': '.ping',
            '.owner': '.owner',
            '.alive': '.alive',
            '.settings': '.settings',

            // AI & NLP
            '.ai': '.ai',
            '.chatbot': '.chatbot',
            '.translate': '.translate',
            '.tts': '.tts',
            '.truecaller': '.truecaller',

            // Media
            '.play': '.play',
            '.video': '.video',
            '.imagine': '.imagine',
            '.sticker': '.sticker',
            '.shazam': '.shazam',

            // Downloads
            '.tiktok': '.tiktok',
            '.instagram': '.instagram',
            '.facebook': '.facebook',
            '.url': '.url',
            '.songid': '.songid',

            // Stickers & Art
            '.stickercrop': '.stickercrop',
            '.sticker-alt': '.sticker-alt',
            '.stickertelegram': '.stickertelegram',
            '.character': '.character',

            // Group Management
            '.mute': '.mute',
            '.unmute': '.unmute',
            '.kick': '.kick',
            '.add': '.add',
            '.promote': '.promote',
            '.demote': '.demote',
            '.tag': '.tag',
            '.tagall': '.tagall',
            '.tagnotadmin': '.tagnotadmin',
            '.hidetag': '.hidetag',

            // Protection
            '.antilink': '.antilink',
            '.antitag': '.antitag',
            '.antibadword': '.antibadword',
            '.anticall': '.anticall',
            '.antidelete': '.antidelete',
            '.mention': '.mention',
            '.antistatusmention': '.antistatusmention',
            '.pmblocker': '.pmblocker',
            '.ghost': '.ghost',
            '.warn': '.warn',

            // Profile & Avatar
            '.setpp': '.setpp',
            '.getpp': '.getpp',
            '.pp': '.pp',
            '.groupmanage': '.groupmanage',
            '.whois': '.whois',

            // Fun
            '.compliment': '.compliment',
            '.topmembers': '.topmembers',
            '.lyrics': '.lyrics',
            '.weather': '.weather',

            // Cancel
            '.cancel': null
        };

        // Handle cancel option
        if (selectedId === '.cancel') {
            await sock.sendMessage(chatId, { 
                text: '✅ *Menu Closed*\n\nType *.help* anytime to open menu again',
                contextInfo: { quotedMessage: message.message }
            });
            return;
        }

        // Get the command from the map
        const command = commandMap[selectedId];

        if (!command) {
            console.log(`[HELP HANDLER] Unknown command ID: ${selectedId}`);
            await sock.sendMessage(chatId, { 
                text: `❌ *Amri haijulikani:* ${selectedId}\n\nJaribu tena au type *.help*`,
                contextInfo: { quotedMessage: message.message }
            });
            return;
        }

        console.log(`[HELP HANDLER] Executing command: ${command}`);

        // Send the command as a text message to trigger normal command processing
        const commandMessage = {
            text: command,
            contextInfo: {
                quotedMessage: message.message
            }
        };

        // Send command message
        const sentMsg = await sock.sendMessage(chatId, commandMessage);
        console.log(`[HELP HANDLER] Command message sent: ${command}`);

        return sentMsg;

    } catch (error) {
        console.error('[HELP HANDLER] Error in handleButtonResponse:', error);
        try {
            await sock.sendMessage(chatId, { 
                text: `⚠️ *Hitilafu imetokea!*\n\nJeshe: ${error.message || 'Unknown error'}\n\nJaribu tena au type *.help*`,
                contextInfo: { quotedMessage: message.message }
            });
        } catch (sendError) {
            console.error('Could not send error message:', sendError);
        }
    }
};

// Export main command as default, with handler attached
aliveCommand.handleButtonResponse = handleButtonResponse;
module.exports = aliveCommand;
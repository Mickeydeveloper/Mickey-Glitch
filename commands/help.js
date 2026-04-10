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
                                    { header: '📋', title: 'Menu', description: 'View all commands', id: 'cmd_menu' },
                                    { header: '⚡', title: 'Ping', description: 'Speed test', id: '.ping' },
                                    { header: '👑', title: 'Owner', description: 'Owner info', id: '.owner' },
                                    { header: '❤️', title: 'Alive', description: 'Bot status check', id: '.alive' },
                                    { header: '⚙️', title: 'Settings', description: 'Bot configuration', id: '.settings' }
                                ]
                            },
                            {
                                title: '🤖 AI & NLP',
                                rows: [
                                    { header: '🤖', title: 'AI', description: 'AI assistant', id: 'cmd_ai' },
                                    { header: '💬', title: 'Chatbot', description: 'Interactive chat', id: 'cmd_chatbot' },
                                    { header: '🔤', title: 'Translate', description: 'Translate text', id: 'cmd_translate' },
                                    { header: '🎯', title: 'TTS', description: 'Text to speech', id: 'cmd_tts' },
                                    { header: '🔍', title: 'Truecaller', description: 'Lookup phone', id: 'cmd_truecaller' }
                                ]
                            },
                            {
                                title: '🎵 MEDIA',
                                rows: [
                                    { header: '🎵', title: 'Play', description: 'Play music', id: 'cmd_play' },
                                    { header: '🎬', title: 'Video', description: 'Download video', id: 'cmd_video' },
                                    { header: '🖼️', title: 'Imagine', description: 'AI image generate', id: 'cmd_imagine' },
                                    { header: '🎭', title: 'Sticker', description: 'Create stickers', id: 'cmd_sticker' },
                                    { header: '📸', title: 'Shazam', description: 'Identify song', id: 'cmd_shazam' }
                                ]
                            },
                            {
                                title: '📥 DOWNLOADS',
                                rows: [
                                    { header: '🎥', title: 'TikTok', description: 'Download from TikTok', id: 'cmd_tiktok' },
                                    { header: '📷', title: 'Instagram', description: 'Download from Instagram', id: 'cmd_instagram' },
                                    { header: '👍', title: 'Facebook', description: 'Download from Facebook', id: 'cmd_facebook' },
                                    { header: '🔗', title: 'URL', description: 'Download from URL', id: 'cmd_url' },
                                    { header: '🎵', title: 'SongID', description: 'Get song details', id: 'cmd_songid' }
                                ]
                            },
                            {
                                title: '🎨 STICKERS & ART',
                                rows: [
                                    { header: '🎭', title: 'Sticker', description: 'Create sticker', id: 'cmd_sticker' },
                                    { header: '✂️', title: 'StickerCrop', description: 'Crop sticker', id: 'cmd_stickercrop' },
                                    { header: '🔄', title: 'Sticker-Alt', description: 'Alt sticker format', id: 'cmd_sticker-alt' },
                                    { header: '✈️', title: 'StickerTelegram', description: 'Telegram sticker', id: 'cmd_stickertelegram' },
                                    { header: '🎪', title: 'Character', description: 'Text art', id: 'cmd_character' }
                                ]
                            },
                            {
                                title: '👥 GROUP MANAGE',
                                rows: [
                                    { header: '🔇', title: 'Mute', description: 'Mute member', id: 'cmd_mute' },
                                    { header: '🔊', title: 'Unmute', description: 'Unmute member', id: 'cmd_unmute' },
                                    { header: '👊', title: 'Kick', description: 'Kick member', id: 'cmd_kick' },
                                    { header: '➕', title: 'Add', description: 'Add member', id: 'cmd_add' },
                                    { header: '⬆️', title: 'Promote', description: 'Promote member', id: 'cmd_promote' }
                                ]
                            },
                            {
                                title: '👥 GROUP MANAGE 2',
                                rows: [
                                    { header: '⬇️', title: 'Demote', description: 'Demote member', id: 'cmd_demote' },
                                    { header: '🏷️', title: 'Tag', description: 'Tag members', id: 'cmd_tag' },
                                    { header: '📢', title: 'TagAll', description: 'Tag everyone', id: 'cmd_tagall' },
                                    { header: '🏷️❌', title: 'TagNotAdmin', description: 'Tag non-admins', id: 'cmd_tagnotadmin' },
                                    { header: '🤐', title: 'HideTag', description: 'Hide tag mention', id: 'cmd_hidetag' }
                                ]
                            },
                            {
                                title: '🛡️ PROTECTION',
                                rows: [
                                    { header: '🔗', title: 'AntiLink', description: 'Stop group links', id: 'cmd_antilink' },
                                    { header: '🏷️', title: 'AntiTag', description: 'Stop tag spam', id: 'cmd_antitag' },
                                    { header: '🚫', title: 'AntiBadword', description: 'Filter bad words', id: 'cmd_antibadword' },
                                    { header: '📵', title: 'AntiCall', description: 'Block calls', id: 'cmd_anticall' },
                                    { header: '🗑️', title: 'AntiDelete', description: 'Recover deleted', id: 'cmd_antidelete' }
                                ]
                            },
                            {
                                title: '🛡️ PROTECTION 2',
                                rows: [
                                    { header: '💬', title: 'Mention', description: 'Mention alerts', id: 'cmd_mention' },
                                    { header: '📲', title: 'AntiStatusMention', description: 'Status mention alert', id: 'cmd_antistatusmention' },
                                    { header: '⛔', title: 'PMBlocker', description: 'Block PMs', id: 'cmd_pmblocker' },
                                    { header: '👻', title: 'Ghost', description: 'Ghost mode', id: 'cmd_ghost' },
                                    { header: '⚠️', title: 'Warn', description: 'Warn member', id: 'cmd_warn' }
                                ]
                            },
                            {
                                title: '📊 PROFILE & AVATAR',
                                rows: [
                                    { header: '👤', title: 'SetPP', description: 'Set profile pic', id: 'cmd_setpp' },
                                    { header: '👤', title: 'GetPP', description: 'Get profile pic', id: 'cmd_getpp' },
                                    { header: '👤', title: 'PP', description: 'My profile pic', id: 'cmd_pp' },
                                    { header: '👥', title: 'GroupManage', description: 'Group settings', id: 'cmd_groupmanage' },
                                    { header: '📝', title: 'Whois', description: 'User info', id: 'cmd_whois' }
                                ]
                            },
                            {
                                title: '✨ FUN',
                                rows: [
                                    { header: '😂', title: 'Compliment', description: 'Get compliment', id: 'cmd_compliment' },
                                    { header: '🏆', title: 'TopMembers', description: 'Active members', id: 'cmd_topmembers' },
                                    { header: '🎵', title: 'Lyrics', description: 'Get lyrics', id: 'cmd_lyrics' },
                                    { header: '⛅', title: 'Weather', description: 'Weather info', id: 'cmd_weather' },
                                    { header: '❌', title: 'Cancel', description: 'Close menu', id: 'cmd_cancel' }
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
            'cmd_menu': 'cmd_menu',
            'cmd_ping': 'cmd_ping',
            'cmd_owner': 'cmd_owner',
            'cmd_alive': 'cmd_alive',
            'cmd_settings': 'cmd_settings',

            // AI & NLP
            'cmd_ai': 'cmd_ai',
            'cmd_chatbot': 'cmd_chatbot',
            'cmd_translate': 'cmd_translate',
            'cmd_tts': 'cmd_tts',
            'cmd_truecaller': 'cmd_truecaller',

            // Media
            'cmd_play': 'cmd_play',
            'cmd_video': 'cmd_video',
            'cmd_imagine': 'cmd_imagine',
            'cmd_sticker': 'cmd_sticker',
            'cmd_shazam': 'cmd_shazam',

            // Downloads
            'cmd_tiktok': 'cmd_tiktok',
            'cmd_instagram': 'cmd_instagram',
            'cmd_facebook': 'cmd_facebook',
            'cmd_url': 'cmd_url',
            'cmd_songid': 'cmd_songid',

            // Stickers & Art
            'cmd_stickercrop': 'cmd_stickercrop',
            'cmd_sticker-alt': 'cmd_sticker-alt',
            'cmd_stickertelegram': 'cmd_stickertelegram',
            'cmd_character': 'cmd_character',

            // Group Management
            'cmd_mute': 'cmd_mute',
            'cmd_unmute': 'cmd_unmute',
            'cmd_kick': 'cmd_kick',
            'cmd_add': 'cmd_add',
            'cmd_promote': 'cmd_promote',
            'cmd_demote': 'cmd_demote',
            'cmd_tag': 'cmd_tag',
            'cmd_tagall': 'cmd_tagall',
            'cmd_tagnotadmin': 'cmd_tagnotadmin',
            'cmd_hidetag': 'cmd_hidetag',

            // Protection
            'cmd_antilink': 'cmd_antilink',
            'cmd_antitag': 'cmd_antitag',
            'cmd_antibadword': 'cmd_antibadword',
            'cmd_anticall': 'cmd_anticall',
            'cmd_antidelete': 'cmd_antidelete',
            'cmd_mention': 'cmd_mention',
            'cmd_antistatusmention': 'cmd_antistatusmention',
            'cmd_pmblocker': 'cmd_pmblocker',
            'cmd_ghost': 'cmd_ghost',
            'cmd_warn': 'cmd_warn',

            // Profile & Avatar
            'cmd_setpp': 'cmd_setpp',
            'cmd_getpp': 'cmd_getpp',
            'cmd_pp': 'cmd_pp',
            'cmd_groupmanage': 'cmd_groupmanage',
            'cmd_whois': 'cmd_whois',

            // Fun
            'cmd_compliment': 'cmd_compliment',
            'cmd_topmembers': 'cmd_topmembers',
            'cmd_lyrics': 'cmd_lyrics',
            'cmd_weather': 'cmd_weather',

            // Cancel
            'cmd_cancel': null
        };

        // Handle cancel option
        if (selectedId === 'cmd_cancel') {
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
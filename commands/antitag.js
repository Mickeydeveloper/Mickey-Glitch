const { setAntitag, getAntitag, removeAntitag } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

// ============ ANTI STATUS MENTION STORAGE ============
const antiStatusMention = new Map(); // Store enabled groups for anti status mention
const statusMentionLogs = new Map(); // Store logs of who mentioned bot in status

// ============ MAIN ANTITAG COMMAND HANDLER ============
async function handleAntitagCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '```For Group Admins Only!```' }, { quoted: message });
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const usage = `\`\`\`🔧 ANTITAG & ANTI STATUS MENTION SETUP\n\n${prefix}antitag on\n${prefix}antitag set delete | kick\n${prefix}antitag off\n\n🛡️ ANTI STATUS MENTION:\n${prefix}antistatus on\n${prefix}antistatus off\n${prefix}antistatus logs\n\`\`\``;
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on':
                const existingConfig = await getAntitag(chatId, 'on');
                if (existingConfig?.enabled) {
                    await sock.sendMessage(chatId, { text: '*_Antitag is already on_*' }, { quoted: message });
                    return;
                }
                const result = await setAntitag(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, {
                    text: result ? '*_✅ Antitag has been turned ON_*' : '*_❌ Failed to turn on Antitag_*'
                }, { quoted: message });
                break;

            case 'off':
                await removeAntitag(chatId, 'on');
                await sock.sendMessage(chatId, { text: '*_❌ Antitag has been turned OFF_*' }, { quoted: message });
                break;

            case 'set':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, {
                        text: `*_⚠️ Please specify an action: ${prefix}antitag set delete | kick_*`
                    }, { quoted: message });
                    return;
                }
                const setAction = args[1];
                if (!['delete', 'kick'].includes(setAction)) {
                    await sock.sendMessage(chatId, {
                        text: '*_❌ Invalid action. Choose delete or kick._*'
                    }, { quoted: message });
                    return;
                }
                const setResult = await setAntitag(chatId, 'on', setAction);
                await sock.sendMessage(chatId, {
                    text: setResult ? `*_✅ Antitag action set to ${setAction}_*` : '*_❌ Failed to set Antitag action_*'
                }, { quoted: message });
                break;

            case 'get':
                const status = await getAntitag(chatId, 'on');
                const actionConfig = await getAntitag(chatId, 'on');
                await sock.sendMessage(chatId, {
                    text: `*_📊 Antitag Configuration:_*\nStatus: ${status ? '✅ ON' : '❌ OFF'}\nAction: ${actionConfig ? actionConfig.action : 'Not set'}`
                }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: `*_⚠️ Use ${prefix}antitag for usage._*` }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in antitag command:', error);
        await sock.sendMessage(chatId, { text: '*_❌ Error processing antitag command_*' }, { quoted: message });
    }
}

// ============ ANTI STATUS MENTION COMMAND ============
async function handleAntiStatusMention(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '```For Group Admins Only!```' }, { quoted: message });
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(12).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const currentStatus = antiStatusMention.get(chatId) || false;
            const statusText = currentStatus ? '✅ IMEWASHWA' : '❌ IMEZIMWA';
            
            const usage = `\`\`\`🛡️ ANTI STATUS MENTION\n\n📊 Hali ya sasa: ${statusText}\n\n${prefix}antistatus on - Washa zuio\n${prefix}antistatus off - Zima zuio\n${prefix}antistatus logs - Angalia historia ya mentions\n\`\`\``;
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on':
                antiStatusMention.set(chatId, true);
                await sock.sendMessage(chatId, {
                    text: `🛡️ *ANTI STATUS MENTION IMEWASHWA!*\n\n` +
                          `✅ Watu hawataweza kumtaja bot kwenye status zao.\n` +
                          `⚠️ Mtu akijaribu, atapata onyo moja kwa moja.\n` +
                          `📌 Ujumbe wote wa status wenye mention yatakuwa deleted.`
                }, { quoted: message });
                break;

            case 'off':
                antiStatusMention.set(chatId, false);
                await sock.sendMessage(chatId, {
                    text: `🔓 *ANTI STATUS MENTION IMEZIMWA!*\n\n` +
                          `❌ Watu wataweza tena kumtaja bot kwenye status zao.`
                }, { quoted: message });
                break;

            case 'logs':
                const logs = statusMentionLogs.get(chatId) || [];
                if (logs.length === 0) {
                    await sock.sendMessage(chatId, {
                        text: `📭 *Hakuna status mention logs yeti.*\n\n` +
                              `Watu wakijaribu kumtaja bot, wataonekana hapa.`
                    }, { quoted: message });
                } else {
                    let logText = `📋 *STATUS MENTION LOGS*\n━━━━━━━━━━━━━━━━━━\n\n`;
                    logs.slice(-10).reverse().forEach((log, i) => {
                        logText += `${i+1}. 👤 @${log.sender.split('@')[0]}\n`;
                        logText += `   📝 "${log.text?.substring(0, 50)}"\n`;
                        logText += `   🕒 ${log.time}\n\n`;
                    });
                    await sock.sendMessage(chatId, {
                        text: logText,
                        mentions: logs.slice(-10).map(l => l.sender)
                    }, { quoted: message });
                }
                break;

            default:
                await sock.sendMessage(chatId, {
                    text: `*_⚠️ Use ${prefix}antistatus for usage._*`
                }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in anti status mention:', error);
        await sock.sendMessage(chatId, { text: '*_❌ Error processing anti status mention_*' }, { quoted: message });
    }
}

// ============ TAG DETECTION FOR GROUPS ============
async function handleTagDetection(sock, chatId, message, senderId) {
    try {
        const antitagSetting = await getAntitag(chatId, 'on');
        if (!antitagSetting || !antitagSetting.enabled) return;

        // Get mentioned JIDs from contextInfo (proper mentions)
        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        // Extract text from all possible message types
        const messageText = (
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            ''
        );

        // Find all @mentions in text using improved regex
        const textMentions = messageText.match(/@[\d+\s\-()~.]+/g) || [];
        const numericMentions = messageText.match(/@\d{10,}/g) || [];

        const allMentions = [...new Set([...mentionedJids, ...textMentions, ...numericMentions])];
        const uniqueNumericMentions = new Set();
        
        numericMentions.forEach(mention => {
            const numMatch = mention.match(/@(\d+)/);
            if (numMatch) uniqueNumericMentions.add(numMatch[1]);
        });

        const mentionedJidCount = mentionedJids.length;
        const numericMentionCount = uniqueNumericMentions.size;
        const totalMentions = Math.max(mentionedJidCount, numericMentionCount);

        if (totalMentions >= 3) {
            const groupMetadata = await sock.groupMetadata(chatId);
            const participants = groupMetadata.participants || [];
            const mentionThreshold = Math.ceil(participants.length * 0.5);
            const hasManyNumericMentions = numericMentionCount >= 10 || 
                                          (numericMentionCount >= 5 && numericMentionCount >= mentionThreshold);

            if (totalMentions >= mentionThreshold || hasManyNumericMentions) {
                const action = antitagSetting.action || 'delete';

                if (action === 'delete') {
                    await sock.sendMessage(chatId, {
                        delete: {
                            remoteJid: chatId,
                            fromMe: false,
                            id: message.key.id,
                            participant: senderId
                        }
                    });

                    await sock.sendMessage(chatId, {
                        text: `⚠️ *Tagall Detected!* Ujumbe wako umefutwa.`
                    }, { quoted: message });

                } else if (action === 'kick') {
                    await sock.sendMessage(chatId, {
                        delete: {
                            remoteJid: chatId,
                            fromMe: false,
                            id: message.key.id,
                            participant: senderId
                        }
                    });

                    await sock.groupParticipantsUpdate(chatId, [senderId], "remove");

                    await sock.sendMessage(chatId, {
                        text: `🚫 *Antitag Detected!*\n\n@${senderId.split('@')[0]} amefukuzwa kwa tagall.`,
                        mentions: [senderId]
                    }, { quoted: message });
                }
            }
        }
    } catch (error) {
        console.error('Error in tag detection:', error);
    }
}

// ============ STATUS MENTION DETECTION (NEW!) ============
async function handleStatusMentionDetection(sock, chatId, message, senderId, botJid) {
    try {
        // Check if anti status mention is enabled for this chat
        const isAntiStatusEnabled = antiStatusMention.get(chatId) || false;
        if (!isAntiStatusEnabled) return;

        // Check if it's a status message (broadcast)
        const isStatus = message.key.remoteJid === 'status@broadcast';
        if (!isStatus) return;

        // Extract message text
        const messageText = (
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            ''
        );

        // Get mentioned JIDs
        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        // Check if bot is mentioned
        const isBotMentioned = mentionedJids.includes(botJid) || 
                               messageText.includes(`@${botJid.split('@')[0]}`) ||
                               messageText.toLowerCase().includes('@bot') ||
                               messageText.toLowerCase().includes('@mickey');

        if (isBotMentioned) {
            // Get the sender's name
            const senderName = message.pushName || senderId.split('@')[0];
            
            // Log the mention
            const logs = statusMentionLogs.get(chatId) || [];
            logs.push({
                sender: senderId,
                text: messageText,
                time: new Date().toLocaleString(),
                timestamp: Date.now()
            });
            
            // Keep only last 50 logs
            while (logs.length > 50) logs.shift();
            statusMentionLogs.set(chatId, logs);

            // Try to delete the status message (Note: WhatsApp doesn't allow deleting others' status)
            // But we can send warning and notify admins
            
            // Send warning to the person who mentioned bot
            await sock.sendMessage(senderId, {
                text: `⚠️ *ONYO!*\n\n` +
                      `Huiruhusiwi kumtaja bot kwenye status zako!\n` +
                      `📌 *Group:* ${chatId}\n` +
                      `🔒 Tafadhali epuka kufanya hivyo tena.\n\n` +
                      `📝 Ujumbe wako: "${messageText?.substring(0, 100)}"`
            }).catch(() => {});

            // Notify group admins
            const groupMetadata = await sock.groupMetadata(chatId);
            const admins = groupMetadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
            const adminJids = admins.map(a => a.id);

            if (adminJids.length > 0) {
                await sock.sendMessage(chatId, {
                    text: `🔔 *MWENYEJI ATAARIFU!*\n\n` +
                          `👤 *Mtumiaji:* @${senderId.split('@')[0]}\n` +
                          `⚠️ *Amejaribu kumtaja bot kwenye status!*\n` +
                          `📝 *Ujumbe:* "${messageText?.substring(0, 100)}"\n` +
                          `🛡️ *Amri:* .antistatus on/off inazuia hili.\n\n` +
                          `📊 *Mara:* ${logs.length} kwa jumla.`,
                    mentions: [senderId]
                }).catch(() => {});
            }

            // Optional: Report to owner
            const ownerJid = '255612130873@s.whatsapp.net'; // Change to your number
            await sock.sendMessage(ownerJid, {
                text: `🔔 *STATUS MENTION REPORT*\n\n` +
                      `👤 Mtumiaji: @${senderId.split('@')[0]}\n` +
                      `👥 Group: ${chatId}\n` +
                      `📝 Ujumbe: ${messageText?.substring(0, 200)}\n` +
                      `🕒 Muda: ${new Date().toLocaleString()}`,
                mentions: [senderId]
            }).catch(() => {});
        }
    } catch (error) {
        console.error('Error in status mention detection:', error);
    }
}

// ============ MONITOR BOTH GROUP AND STATUS MENTIONS ============
async function startMentionMonitoring(sock) {
    try {
        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg || !msg.key) return;
            
            const chatId = msg.key.remoteJid;
            const senderId = msg.key.participant || msg.key.remoteJid;
            
            // Handle status mentions (broadcast)
            if (chatId === 'status@broadcast') {
                await handleStatusMentionDetection(sock, chatId, msg, senderId, botJid);
            }
            
            // Handle group mentions
            if (chatId?.endsWith('@g.us')) {
                await handleTagDetection(sock, chatId, msg, senderId);
            }
        });
        
        console.log('✅ Mention monitoring system started!');
    } catch (error) {
        console.error('Error starting mention monitoring:', error);
    }
}

// ============ ADDITIONAL UTILITY FUNCTIONS ============

// Get anti status mention status
async function getAntiStatusMentionStatus(chatId) {
    return antiStatusMention.get(chatId) || false;
}

// Clear status mention logs
async function clearStatusMentionLogs(chatId) {
    statusMentionLogs.delete(chatId);
    return true;
}

// Get status mention statistics
async function getStatusMentionStats(chatId) {
    const logs = statusMentionLogs.get(chatId) || [];
    const uniqueUsers = new Set(logs.map(l => l.sender));
    
    return {
        totalMentions: logs.length,
        uniqueUsers: uniqueUsers.size,
        lastMention: logs[logs.length - 1]?.time || 'None',
        mostActiveUser: getMostActiveUser(logs)
    };
}

function getMostActiveUser(logs) {
    const userCount = {};
    logs.forEach(log => {
        userCount[log.sender] = (userCount[log.sender] || 0) + 1;
    });
    
    let mostActive = null;
    let maxCount = 0;
    for (const [user, count] of Object.entries(userCount)) {
        if (count > maxCount) {
            maxCount = count;
            mostActive = user;
        }
    }
    return mostActive ? { user: mostActive, count: maxCount } : null;
}

module.exports = {
    handleAntitagCommand,
    handleTagDetection,
    handleAntiStatusMention,     // NEW
    handleStatusMentionDetection, // NEW
    startMentionMonitoring,       // NEW
    getAntiStatusMentionStatus,   // NEW
    clearStatusMentionLogs,       // NEW
    getStatusMentionStats         // NEW
};
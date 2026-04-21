/**
 * warn.js - Advanced Warn System with Auto-Kick
 * Inatumia isAdmin mpya na inafanya kazi vizuri
 */

const fs = require('fs');
const path = require('path');
const { isAdmin } = require('../lib/isAdmin');

// Define paths
const databaseDir = path.join(process.cwd(), 'data');
const warningsPath = path.join(databaseDir, 'warnings.json');

// Initialize warnings file
function initializeWarningsFile() {
    if (!fs.existsSync(databaseDir)) {
        fs.mkdirSync(databaseDir, { recursive: true });
    }
    if (!fs.existsSync(warningsPath)) {
        fs.writeFileSync(warningsPath, JSON.stringify({}, null, 2));
    }
}

async function warnCommand(sock, chatId, senderId, mentionedJids, message) {
    try {
        initializeWarningsFile();

        // === Check if it's a group ===
        const adminStatus = await isAdmin(sock, chatId, senderId);

        if (!adminStatus.isGroup) {
            return sock.sendMessage(chatId, { 
                text: '*_❌ Hii command inafanya kazi kwenye group pekee!_*' 
            }, { quoted: message });
        }

        if (!adminStatus.isBotAdmin) {
            return sock.sendMessage(chatId, { 
                text: '*_❌ Bot lazima iwe Admin ili kutumia warn command!_\n\nNipandishe vyeo kwanza.*' 
            }, { quoted: message });
        }

        if (!adminStatus.isSenderAdmin) {
            return sock.sendMessage(chatId, { 
                text: '*_❌ Only group admins can use .warn command!_*' 
            }, { quoted: message });
        }

        // Get user to warn (mentioned or replied)
        let userToWarn = null;

        if (mentionedJids && mentionedJids.length > 0) {
            userToWarn = mentionedJids[0];
        } 
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToWarn = message.message.extendedTextMessage.contextInfo.participant;
        }

        if (!userToWarn) {
            return sock.sendMessage(chatId, { 
                text: '*_❌ Tafadhali mention user au reply kwenye ujumbe wake ili kumwarn!_*' 
            }, { quoted: message });
        }

        // Prevent warning bot or self
        if (userToWarn === senderId) {
            return sock.sendMessage(chatId, { 
                text: '*_❌ Huwezi kujiwarn mwenyewe!_*' 
            }, { quoted: message });
        }

        // Read warnings
        let warnings = {};
        try {
            warnings = JSON.parse(fs.readFileSync(warningsPath, 'utf8'));
        } catch (e) {
            warnings = {};
        }

        if (!warnings[chatId]) warnings[chatId] = {};
        if (!warnings[chatId][userToWarn]) warnings[chatId][userToWarn] = 0;

        warnings[chatId][userToWarn]++;
        fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));

        const warningCount = warnings[chatId][userToWarn];

        const warnMessage = `*『 ⚠️ WARNING ALERT ⚠️ 』*\n\n` +
            `👤 *Mteja:* @${userToWarn.split('@')[0]}\n` +
            `⚠️ *Warning Count:* ${warningCount}/3\n` +
            `👑 *Aliye warn:* @${senderId.split('@')[0]}\n\n` +
            `📅 *Tarehe:* ${new Date().toLocaleString('en-US', { 
                timeZone: 'Africa/Dar_es_Salaam', 
                hour12: true 
            })}`;

        await sock.sendMessage(chatId, { 
            text: warnMessage,
            mentions: [userToWarn, senderId]
        }, { quoted: message });

        // Auto Kick after 3 warnings
        if (warningCount >= 3) {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Small delay

            await sock.groupParticipantsUpdate(chatId, [userToWarn], "remove");

            // Clean record after kick
            delete warnings[chatId][userToWarn];
            fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));

            const kickMsg = `*『 AUTO KICK 』*\n\n` +
                `@${userToWarn.split('@')[0]} *ameondolewa* baada ya kupata warnings 3! ⚠️`;

            await sock.sendMessage(chatId, { 
                text: kickMsg,
                mentions: [userToWarn]
            });
        }

    } catch (error) {
        console.error('Error in warnCommand:', error);
        
        await sock.sendMessage(chatId, { 
            text: '*_❌ Imeshindwa kutoa warning. Hakikisha bot ni Admin na ina ruhusa._*' 
        }, { quoted: message });
    }
}

module.exports = warnCommand;
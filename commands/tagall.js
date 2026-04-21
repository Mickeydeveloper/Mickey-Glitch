/**
 * tagall.js
 * Tag All command iliyoboreshwa - Inatumia isAdmin mpya
 */

const gtts = require('gtts');
const fs = require('fs');
const path = require('path');
const { isAdmin } = require('../lib/isAdmin');

function stripEmoji(text) {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}|\u{1F1E6}-\u{1F1FF}]/gu, '');
}

async function tagAllCommand(sock, chatId, senderId, message) {
    try {
        // Tumia isAdmin iliyoboreshwa
        const adminStatus = await isAdmin(sock, chatId, senderId);

        if (!adminStatus.isGroup) {
            await sock.sendMessage(chatId, { 
                text: '*_❌ Hii command inafanya kazi kwenye group pekee!_*' 
            }, { quoted: message });
            return;
        }

        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, { 
                text: '*_⚠️ Bot lazima iwe Admin ili iweze kutag wote!_\n\nNipandishe vyeo kwanza.' 
            }, { quoted: message });
            return;
        }

        // Optional: Ni vizuri sender pia awe admin
        if (!adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, { 
                text: '*_❌ Only group admins can use .tagall command!_*' 
            }, { quoted: message });
            return;
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants || [];

        if (participants.length === 0) {
            return sock.sendMessage(chatId, { text: '*_Hakuna washiriki katika group hii._*' }, { quoted: message });
        }

        // ==================== TEXT MESSAGE ====================
        let messageText = `📢 *TAG ALL*\n\n`;
        messageText += `👥 *Jumla ya washiriki:* ${participants.length}\n`;
        messageText += `👤 *Aliyeita:* @${senderId.split('@')[0]}\n`;
        messageText += `🏷️ *Group:* ${groupMetadata.subject || 'Unknown'}\n\n`;
        messageText += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        participants.forEach((p) => {
            messageText += `◦ @${p.id.split('@')[0]}\n`;
        });

        messageText = stripEmoji(messageText);

        // ==================== VOICE NOTE TEXT ====================
        const audioText = `Habari wanakikundi wote. Kuna ujumbe muhimu umetumwa hapa kwenye group na ${senderId.split('@')[0]}. Tafadhali kila mmoja aangalie mara moja. Asanteni sana!`;

        const fileName = `tagall_${Date.now()}.mp3`;
        const filePath = path.join(__dirname, '../tmp', fileName); // Tumia tmp folder

        // Tuma text message kwanza
        const sentText = await sock.sendMessage(chatId, {
            text: messageText,
            mentions: participants.map(p => p.id)
        }, { quoted: message });

        // Generate and send voice note
        const speech = new gtts(audioText, 'sw'); // Swahili voice

        speech.save(filePath, async (err) => {
            if (err) {
                console.error("gTTS Error:", err);
                await sock.sendMessage(chatId, { 
                    text: '*_❌ Imeshindwa kutengeneza sauti._*' 
                }, { quoted: message });
                return;
            }

            try {
                // Tuma Voice Note
                await sock.sendMessage(chatId, {
                    audio: { url: filePath },
                    mimetype: 'audio/mp4',
                    ptt: true, // Push to talk (voice note)
                    mentions: participants.map(p => p.id)
                }, { quoted: message });

                // Auto delete text message baada ya sekunde 30
                if (sentText?.key) {
                    setTimeout(async () => {
                        try {
                            await sock.sendMessage(chatId, { delete: sentText.key });
                        } catch (e) {
                            console.error('Auto delete failed:', e);
                        }
                    }, 30000);
                }

            } catch (audioError) {
                console.error('Error sending audio:', audioError);
            } finally {
                // Cleanup - futa file
                if (fs.existsSync(filePath)) {
                    setTimeout(() => {
                        try { fs.unlinkSync(filePath); } catch {}
                    }, 5000);
                }
            }
        });

    } catch (error) {
        console.error('Error in tagall command:', error);
        await sock.sendMessage(chatId, { 
            text: '*_❌ Kuna tatizo katika kutekeleza .tagall command._*' 
        }, { quoted: message });
    }
}

module.exports = tagAllCommand;
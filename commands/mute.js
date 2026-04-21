/**
 * mute.js
 * Mute & Unmute command iliyoboreshwa - Inatumia isAdmin mpya
 */

const { isAdmin } = require('../lib/isAdmin');

async function handleMuteCommand(sock, chatId, senderId, message, args = '') {
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
                text: '*_❌ Bot lazima iwe Admin ili kutumia mute/unmute!_\n\nNipandishe vyeo kwanza.' 
            }, { quoted: message });
            return;
        }

        if (!adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, { 
                text: '*_❌ Only group admins can use this command!_*' 
            }, { quoted: message });
            return;
        }

        const commandArgs = args.toString().toLowerCase().trim();
        const isMute = commandArgs.startsWith('mute');

        // Extract duration (kwa mute pekee)
        let durationInMinutes = null;
        if (isMute) {
            const durationMatch = commandArgs.match(/(\d+)/);
            if (durationMatch) {
                durationInMinutes = parseInt(durationMatch[1]);
            }
        }

        if (isMute) {
            // ====================== MUTE ======================
            await sock.groupSettingUpdate(chatId, 'announcement'); // Mute group

            let replyText = '*_🔇 Group imefungwa (Muted)! Hakuna mtu anaweza kuandika._*';

            if (durationInMinutes && durationInMinutes > 0) {
                replyText = `*_🔇 Group imefungwa kwa dakika ${durationInMinutes} tu!_*`;

                const durationMs = durationInMinutes * 60 * 1000;

                setTimeout(async () => {
                    try {
                        await sock.groupSettingUpdate(chatId, 'not_announcement');
                        await sock.sendMessage(chatId, { 
                            text: '*_🔊 Group imefunguliwa tena (Auto Unmute)!_*' 
                        });
                    } catch (err) {
                        console.error('Auto unmute error:', err);
                    }
                }, durationMs);
            }

            await sock.sendMessage(chatId, { text: replyText }, { quoted: message });

        } else {
            // ====================== UNMUTE ======================
            await sock.groupSettingUpdate(chatId, 'not_announcement'); // Unmute group

            await sock.sendMessage(chatId, { 
                text: '*_🔊 Group imefunguliwa! Wote wanaweza kuandika sasa._*' 
            }, { quoted: message });
        }

    } catch (error) {
        console.error('Error in mute/unmute command:', error);
        await sock.sendMessage(chatId, { 
            text: '*_❌ Kuna tatizo katika kutekeleza command. Jaribu tena._*' 
        }, { quoted: message });
    }
}

// ====================== Helper Functions (Optional) ======================

// Unaweza kuitumia kama function moja au kando
async function muteGroup(sock, chatId) {
    return sock.groupSettingUpdate(chatId, 'announcement');
}

async function unmuteGroup(sock, chatId) {
    return sock.groupSettingUpdate(chatId, 'not_announcement');
}

module.exports = {
    handleMuteCommand,
    muteGroup,
    unmuteGroup
};
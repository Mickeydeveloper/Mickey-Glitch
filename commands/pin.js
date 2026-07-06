const fs = require('fs/promises');
const fsExists = require('fs');
const path = require('path');
const axios = require('axios');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// CONFIGURATION
const CONFIG = {
    FOOTER: '𝐌𝐢𝐜𝐤𝐞𝐲 𝐆𝐥𝐢𝐭𝐜𝐡 𝐓𝐞𝐜𝐡𝐧𝐨𝐥𝐨𝐠𝐲',
    BANNER: 'https://github.com/Mickeymozy/Mickey-Vip/blob/main/chatbot.png?raw=true',
    FILE_PATH: path.join(__dirname, '../data/pinConfig.json'),
    DEFAULT_PIN: '0000',
    DURATION: 60 * 60 * 1000 // 1 hour
};

let verifiedSessions = new Map(); // Store verified users with expiry time

// ────────────────────────────────────────────
// Load/Save PIN Configuration
async function loadPinConfig() {
    try {
        const data = await fs.readFile(CONFIG.FILE_PATH, 'utf8');
        return JSON.parse(data);
    } catch {
        const defaultConfig = { pin: CONFIG.DEFAULT_PIN, enabled: false };
        await savePinConfig(defaultConfig);
        return defaultConfig;
    }
}

async function savePinConfig(config) {
    try {
        await fs.mkdir(path.dirname(CONFIG.FILE_PATH), { recursive: true });
        await fs.writeFile(CONFIG.FILE_PATH, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('[PIN] Save failed:', err.message);
    }
}

// Check if user is currently verified
function isUserVerified(userId) {
    if (!verifiedSessions.has(userId)) return false;
    const expiryTime = verifiedSessions.get(userId);
    if (Date.now() > expiryTime) {
        verifiedSessions.delete(userId);
        return false;
    }
    return true;
}

// Set user as verified
function setUserVerified(userId) {
    const expiryTime = Date.now() + CONFIG.DURATION;
    verifiedSessions.set(userId, expiryTime);
}

// ────────────────────────────────────────────
// PIN Command Handler
async function pinCommand(sock, chatId, message, args = []) {
    const senderId = message.key.participant || message.key.remoteJid;
    const config = await loadPinConfig();

    // Only owner can configure PIN
    const isOwner = message.key.fromMe;
    if (!isOwner) {
        await sock.sendMessage(chatId, { text: '⛔ Only bot owner can configure PIN' }, { quoted: message });
        return;
    }

    const cmd = (args[0] || '').toLowerCase();

    // .pin on - Enable PIN protection
    if (cmd === 'on') {
        await savePinConfig({ ...config, enabled: true });
        await sock.sendMessage(chatId, { 
            text: `🔒 *PIN Protection: ENABLED*\n\nAll commands now require PIN verification.\n\n📌 Default PIN: ${config.pin}\n\nUse: .pin ${config.pin}` 
        }, { quoted: message });
        return;
    }

    // .pin off - Disable PIN protection
    if (cmd === 'off') {
        await savePinConfig({ ...config, enabled: false });
        verifiedSessions.clear(); // Clear all sessions
        await sock.sendMessage(chatId, { 
            text: `🔓 *PIN Protection: DISABLED*\n\nAll commands are now accessible without PIN.` 
        }, { quoted: message });
        return;
    }

    // .pin set <new_pin> - Set custom PIN
    if (cmd === 'set') {
        if (!args[1]) {
            return sock.sendMessage(chatId, { text: '⚠️ Usage: .pin set <new_pin>' }, { quoted: message });
        }
        const newPin = args[1];
        if (newPin.length < 4) {
            return sock.sendMessage(chatId, { text: '⚠️ PIN must be at least 4 characters' }, { quoted: message });
        }
        await savePinConfig({ ...config, pin: newPin });
        await sock.sendMessage(chatId, {
            text: `✅ *PIN Updated!*\n\n🔐 New PIN: ${newPin}`
        }, { quoted: message });
        return;
    }

    // .pin status - Show PIN status
    if (cmd === 'status') {
        const status = config.enabled ? '🔒 ENABLED' : '🔓 DISABLED';
        await sock.sendMessage(chatId, {
            text: `🔐 *PIN Security Status*\n\nProtection: ${status}\nCurrent PIN: ${config.pin}`
        }, { quoted: message });
        return;
    }

    // Show main button menu if no args are passed
    if (!cmd) {
        const statusText = config.enabled ? '🔒 ENABLED' : '🔓 DISABLED';
        const statusMessage = `🔐 *PIN SECURITY SYSTEM*

*— CURRENT STATUS —*
🛡️ *Protection:* ${statusText}
🔑 *Current PIN:* \`${config.pin}\`

*— MANUAL USAGE —*
➡️ \`.pin set <new>\` - Set new pin

_Use buttons below to easily switch status._`;

        const nativeButtons = [
            { buttonId: '.pin on', buttonText: { displayText: '🔒 PIN ON' }, type: 1 },
            { buttonId: '.pin off', buttonText: { displayText: '🔓 PIN OFF' }, type: 1 },
            { buttonId: '.pin status', buttonText: { displayText: '📊 STATUS' }, type: 1 }
        ];

        await sendNativeButtonV2(sock, chatId, message, statusMessage, CONFIG.FOOTER, "🔐 PIN CONTROL PANEL", nativeButtons);
        return;
    }

    await sock.sendMessage(chatId, { text: '❓ Unknown command. Use .pin for help' }, { quoted: message });
}

// ────────────────────────────────────────────
// Verify PIN Command - User enters PIN
async function verifyPinCommand(sock, chatId, message, pinInput) {
    const senderId = message.key.participant || message.key.remoteJid;
    const config = await loadPinConfig();

    if (!config.enabled) {
        setUserVerified(senderId);
        await sock.sendMessage(chatId, { text: '✅ Access granted (PIN disabled)' }, { quoted: message });
        return true;
    }

    const isValid = pinInput === config.pin;
    if (isValid) {
        setUserVerified(senderId);
        const expiryTime = new Date(Date.now() + CONFIG.DURATION).toLocaleTimeString();
        await sock.sendMessage(chatId, { 
            text: `✅ *PIN Verified!*\n\n🟢 Access Granted\n⏰ Valid until: ${expiryTime}` 
        }, { quoted: message });
        return true;
    } else {
        await sock.sendMessage(chatId, { 
            text: `❌ *Wrong PIN!*\n\n🔴 Access Denied\n\n🔐 Try again with correct PIN` 
        }, { quoted: message });
        return false;
    }
}

// Check if user needs PIN verification
async function checkPinVerification(userId) {
    const config = await loadPinConfig();
    if (!config.enabled) return true;
    return isUserVerified(userId);
}

// Muundo ule ule kamili wa kutuma picha na button kama kwenye alive
async function sendNativeButtonV2(sock, chatId, message, textBody, footerText, headerName, buttonsList) {
    try {
        const fetchBuffer = async (url) => {
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
            return Buffer.from(res.data);
        };

        async function resizeImg(buffer, width = 300, height = 300) {
            try {
                const sharp = require('sharp');
                return await sharp(buffer).resize(width, height, { fit: 'cover' }).toBuffer();
            } catch {
                return buffer;
            }
        }

        let thumbnailBuffer = null;
        if (CONFIG.BANNER) {
            try {
                const buf = await fetchBuffer(CONFIG.BANNER);
                thumbnailBuffer = await resizeImg(buf, 300, 300);
            } catch (e) {
                console.error('[pin-ui] thumbnail fetch failed', e && e.message ? e.message : e);
            }
        }

        const contextInfo = {
            forwardingScore: 999,
            isForwarded: true,
        };
        const mentionJid = message?.key?.participant || message?.key?.remoteJid;
        if (mentionJid) contextInfo.mentionedJid = [mentionJid];

        const msg = generateWAMessageFromContent(chatId, {
            buttonsMessage: {
                contentText: textBody,
                footerText: footerText,
                headerType: 6,
                locationMessage: {
                    degreesLatitude: 0,
                    degreesLongitude: 0,
                    name: headerName,
                    address: 'Security Settings',
                    jpegThumbnail: thumbnailBuffer
                },
                viewOnce: true,
                contextInfo,
                buttons: buttonsList
            }
        }, { userJid: (sock && sock.user && sock.user.id) || '', quoted: message || undefined });

        await sock.relayMessage(chatId, msg.message, {
            messageId: msg.key?.id || sock.generateMessageID(),
            additionalNodes: [
                {
                    tag: 'biz',
                    attrs: {},
                    content: [
                        {
                            tag: 'interactive',
                            attrs: { type: 'native_flow', v: '1' },
                            content: [
                                {
                                    tag: 'native_flow',
                                    attrs: { v: '9', name: 'mixed' }
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    } catch (err) {
        console.error('sendNativeButtonV2 error inside pin panel:', err);
        await sock.sendMessage(chatId, { text: textBody }, { quoted: message });
    }
}

module.exports = {
    pinCommand,
    verifyPinCommand,
    checkPinVerification,
    isUserVerified,
    loadPinConfig,
    DEFAULT_PIN: CONFIG.DEFAULT_PIN
};

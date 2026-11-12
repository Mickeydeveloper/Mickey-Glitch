const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const configPath = path.join(__dirname, '..', 'data', 'autoreact.json');

function initConfig() {
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
    }

    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
        fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
        return { enabled: false };
    }
}

function parseCommandArgs(message) {
    const text = (
        message?.message?.conversation ||
        message?.message?.extendedTextMessage?.text ||
        message?.message?.imageMessage?.caption ||
        message?.message?.videoMessage?.caption ||
        ''
    ).trim();

    if (!text) return [];
    return text.split(/\s+/).slice(1);
}

function getStickerReactionPayload(message) {
    return {
        messagecontextinfo: {
            messageassociation: {
                associationtype: 11,
                parentmessagekey: message?.key || {}
            }
        },
        stickermessage: {
            url: 'https://mmg.whatsapp.net/v/t62.15575-24/818766779_1129097639778153_6590267083545743956_n.enc?ccb=11-4&oh=01_q5aa5ghne2hdble-cwkjxnd2kbq-dpck_oue8ymzftwyle7bsq&oe=6adac196&_nc_sid=5e03e0',
            filesha256: 'uoa2mnxeustnlphuku4sbdrzkn/tfi7yn8zdabycnos=',
            fileencsha256: 'l2lsgklak7sxkvhbhunwy2gyet1ohacr8o7htmfx0ss=',
            mediakey: 'rsi+fyarjydzsdlgh4r6g5ouviynzmbrfvoaitali7u=',
            mimetype: 'application/was',
            directpath: '/v/t62.15575-24/818766779_1129097639778153_6590267083545743956_n.enc?ccb=11-4&oh=01_q5aa5ghne2hdble-cwkjxnd2kbq-dpck_oue8ymzftwyle7bsq&oe=6adac196&_nc_sid=5e03e0',
            islottie: true
        }
    };
}

async function sendStickerReaction(sock, chatId, message) {
    try {
        const payload = getStickerReactionPayload(message);
        return await sock.relayMessage(chatId, payload, {});
    } catch (error) {
        console.error('[AutoReact] relayMessage failed:', error?.message || error);
        try {
            await sock.sendMessage(chatId, {
                text: '⚠️ Auto reaction payload failed to send.'
            }, { quoted: message });
        } catch {}
        return null;
    }
}

async function autoreactCommand(sock, chatId, message, args = []) {
    try {
        const senderId = message?.key?.participant || message?.key?.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!message?.key?.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ This command is only available for the owner!'
            }, { quoted: message });
            return;
        }

        const actionArgs = Array.isArray(args) && args.length ? args : parseCommandArgs(message);
        let action = 'toggle';

        if (actionArgs.length > 0) {
            action = String(actionArgs[0]).toLowerCase();
        }

        const config = initConfig();

        if (action === 'on' || action === 'enable') {
            config.enabled = true;
        } else if (action === 'off' || action === 'disable') {
            config.enabled = false;
        } else if (action === 'toggle' || action === 'status') {
            config.enabled = !config.enabled;
        } else {
            await sock.sendMessage(chatId, {
                text: '❌ Invalid option! Use: .autoreact on/off\nExample: .autoreact on'
            }, { quoted: message });
            return;
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        try {
            await sendStickerReaction(sock, chatId, message);
        } catch {}

        await sock.sendMessage(chatId, {
            text: `✅ Auto-react ${config.enabled ? 'enabled' : 'disabled'}!`
        }, { quoted: message });
    } catch (error) {
        console.error('[AutoReact] Error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Error processing auto-react command.'
        }, { quoted: message });
    }
}

function isAutoreactEnabled() {
    try {
        return !!initConfig().enabled;
    } catch {
        return false;
    }
}

module.exports = autoreactCommand;
module.exports.command = ['autoreact', 'areact'];
module.exports.aliases = ['areact'];
module.exports.help = [
    'autoreact on',
    'autoreact off',
    'autoreact'
];
module.exports.tags = ['owner'];
module.exports.group = false;
module.exports.owner = true;
module.exports.isAutoreactEnabled = isAutoreactEnabled;
module.exports.sendStickerReaction = sendStickerReaction;

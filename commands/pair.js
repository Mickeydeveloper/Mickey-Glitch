/**
 * pair.js - Advanced Custom Pairing Code
 * Inatuma creds.json kiotomatiki baada ya pairing kufanikiwa
 */

const { useMultiFileAuthState, makeWASocket, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const activeSessions = new Map();

// ====================== MAIN PAIR COMMAND ======================
async function pairingCommand(sock, chatId, message) {
    const userJid = message.key.participant || message.key.remoteJid;
    const userNumber = userJid.split('@')[0];

    if (activeSessions.has(userJid)) {
        return sock.sendMessage(chatId, {
            text: '*_⚠️ Unayo pairing session inayoendelea. Tumia .cancelpair kukomesha._*'
        }, { quoted: message });
    }

    await sock.sendMessage(chatId, {
        text: `🔄 *Inatengeneza Pairing Code...*\nSubiri kidogo...`
    }, { quoted: message });

    try {
        const sessionDir = `./sessions_${userNumber}`;
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const client = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: undefined,
            browser: Browsers.macOS('Mickey Glitch'),
            markOnlineOnConnect: false,
        });

        activeSessions.set(userJid, { client, sessionDir });

        client.ev.on('creds.update', saveCreds);

        client.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                await handleSuccessfulPairing(sock, chatId, userJid, sessionDir, message);
                activeSessions.delete(userJid);
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                if (statusCode !== DisconnectReason.loggedOut) {
                    activeSessions.delete(userJid);
                }
            }
        });

        // Generate Pairing Code
        setTimeout(async () => {
            try {
                const code = await client.requestPairingCode(userNumber);

                const pairingText = `🔑 *YOUR PAIRING CODE*\n\n` +
                    `➤ *${code}*\n\n` +
                    `📌 *Maagizo:*\n` +
                    `1. Fungua WhatsApp kwenye simu\n` +
                    `2. Settings → Linked Devices → Link a Device\n` +
                    `3. Chagua "Link with Phone Number"\n` +
                    `4. Ingiza code hii\n\n` +
                    `⚠️ Code inaisha baada ya dakika 10.`;

                await sock.sendMessage(chatId, { text: pairingText }, { quoted: message });

            } catch (err) {
                console.error(err);
                await sock.sendMessage(chatId, { text: '❌ Imeshindwa kutengeneza code. Jaribu tena.' }, { quoted: message });
                activeSessions.delete(userJid);
            }
        }, 3000);

    } catch (error) {
        console.error('Pairing Error:', error);
        await sock.sendMessage(chatId, { text: '❌ Kuna tatizo katika kuanzisha pairing.' }, { quoted: message });
        activeSessions.delete(userJid);
    }
}

// ====================== SUCCESSFUL PAIRING HANDLER ======================
async function handleSuccessfulPairing(sock, chatId, userJid, sessionDir, originalMessage) {
    try {
        await sock.sendMessage(chatId, {
                text: `✅ *Pairing Ime Fanikiwa Kabisa!*\n\nInatuma \`creds.json\`...`

        const credsPath = path.join(sessionDir, 'creds.json');

        // Subiri kidogo ili file iandikwe vizuri
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (fs.existsSync(credsPath)) {
            const credsBuffer = fs.readFileSync(credsPath);

            await sock.sendMessage(userJid, {
                document: credsBuffer,
                mimetype: 'application/json',
                fileName: 'creds.json',
                caption: `✅ *Hii ndio creds.json yako*\n\n` +
                        `• Hifadhi vizuri\n` +
                        `• Usishare na mtu yeyote\n` +
                        `• Unaweza kuitumia kuanzisha bot yako upya`
            });

            await sock.sendMessage(chatId, {
                text: `✅ *creds.json imetumwa kwa namba yako!*\n\nUsishare na mtu yeyote.`
            }, { quoted: originalMessage });
        } else {
            await sock.sendMessage(chatId, {
                text: '⚠️ creds.json haikupatikana. Jaribu tena pairing.'
            });
        }

    } catch (err) {
        console.error('Failed to send creds.json:', err);
        await sock.sendMessage(chatId, {
            text: '✅ Pairing imefanikiwa lakini imeshindwa kutuma creds.json.\nJaribu .pair tena.'
        });
    }
}

// ====================== CANCEL PAIRING ======================
async function cancelPairingCommand(sock, chatId, message) {
    const userJid = message.key.participant || message.key.remoteJid;

    if (activeSessions.has(userJid)) {
        const session = activeSessions.get(userJid);
        try {
            session.client.end();
        } catch {}
        activeSessions.delete(userJid);

        await sock.sendMessage(chatId, {
            text: '✅ Pairing session imesimamishwa.'
        }, { quoted: message });
    } else {
        await sock.sendMessage(chatId, {
            text: 'Hakuna pairing session inayoendelea.'
        }, { quoted: message });
    }
}

module.exports = {
    pairingCommand,
    cancelPairingCommand,
    name: 'pair',
    alias: ['paircode', 'pairing', 'connect'],
    description: 'Generate pairing code and auto send creds.json'
};
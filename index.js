require('./settings')
const settings = require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const pino = require("pino")
const path = require('path')
const customLogger = require('./lib/silentLogger')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay,
    jidNormalizedUser
} = require("@whiskeysockets/baileys")

// Boresha Logger kuzuia Buffer Timeout
const logger = pino({ 
    level: 'silent', // Zima logi zisizo na lazima kuzuia mzigo
    sync: false 
})

// RAM Management - Garbage Collection
if (typeof global.gc === 'function') {
    setInterval(() => { global.gc(); }, 3 * 60 * 1000); // Kila baada ya dk 3
}

// Global Error Handler (Silent Mode kwa Errors za kijinga)
const silentErrors = ['Bad MAC', 'SessionError', 'Failed to decrypt', 'status@broadcast', 'skmsg'];
const isSilentError = (err) => silentErrors.some(msg => err?.includes(msg));

process.on('uncaughtException', (err) => {
    if (isSilentError(err.message)) return;
    console.error('Critical Error:', err);
});

process.on('unhandledRejection', (reason) => {
    if (isSilentError(reason?.message)) return;
    // Zuia kufurika kwa logi za [ERROR] kwenye console
});

const { handleMessages, handleStatus } = require('./main')

async function startXeonBotInc() {
    const { state, saveCreds } = await useMultiFileAuthState(`./session`)
    const { version } = await fetchLatestBaileysVersion()

    const XeonBotInc = makeWASocket({
        version,
        logger: logger, // Tumia logger tulioifanyia optimization
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"], 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => { return { conversation: 'Mickey Glitch' } } // Fix decryption errors
    })

    // PAIRING LOGIC
    if (!XeonBotInc.authState.creds.registered) {
        let phoneNumber = settings.ownerNumber.replace(/[^0-9]/g, '')
        await delay(10000) 
        try {
            let code = await XeonBotInc.requestPairingCode(phoneNumber, "MICKDADY")
            code = code?.match(/.{1,4}/g)?.join("-") || code
            console.log(chalk.black(chalk.bgGreen(`\n PAIRING CODE: ${code} \n`)))
        } catch (e) {}
    }

    XeonBotInc.ev.on('creds.update', saveCreds)

    XeonBotInc.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        
        if (qr) console.log(chalk.yellow(`📱 SCAN QR CODE`))
        if (connection === "connecting") console.log(chalk.blue(`Connecting...`))
        
        if (connection === "open") {
            console.log(chalk.green(`✅ ${settings.botName} IS ONLINE!`))
            // Owner Notification
            try {
                const ownerJid = jidNormalizedUser(XeonBotInc.user.id)
                await XeonBotInc.sendMessage(ownerJid, { text: `🚀 *MICKEY GLITCH V3* is now Active!` })
            } catch (e) {}
        }

        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output?.statusCode
            if (reason !== DisconnectReason.loggedOut) {
                console.log(chalk.yellow(`🔄 Reconnecting...`))
                startXeonBotInc()
            }
        }
    })

    XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = chatUpdate.messages[0]
            if (!mek.message || (mek.key && mek.key.remoteJid === 'status@broadcast')) return

            await Promise.all([
                handleMessages(XeonBotInc, chatUpdate),
                handleStatus(XeonBotInc, chatUpdate)
            ]).catch(() => {})
        } catch (err) {}
    })

    return XeonBotInc
}

startXeonBotInc()

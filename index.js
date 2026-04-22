require('./settings')
const settings = require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const pino = require("pino")
const path = require('path')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")

// Import connection handler kutoka lib
const { handleConnection } = require('./lib/connection')
const { handleMessages, handleStatus } = require('./main')

const logger = pino({ level: 'silent' })

async function startMickeyBot() {
    const { state, saveCreds } = await useMultiFileAuthState(`./session`)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: logger,
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"], 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        markOnlineOnConnect: true,
        connectTimeoutMs: 120000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 30000,
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => { return { conversation: 'Mickey Glitch' } },
        syncFullHistory: false
    })

    // PAIRING LOGIC
    if (!sock.authState.creds.registered) {
        let phoneNumber = settings.ownerNumber.replace(/[^0-9]/g, '')
        if (phoneNumber) {
            console.log(chalk.cyan(`\n♻️  Pairing kodi inatumwa kwenda: ${phoneNumber}...`))
            await delay(10000)
            try {
                let code = await sock.requestPairingCode(phoneNumber, "MICKDADY")
                code = code?.match(/.{1,4}/g)?.join("-") || code
                console.log(chalk.black(chalk.bgGreen(`\n ✅ PAIRING CODE: ${code} \n`)))
            } catch (e) {
                console.log(chalk.red("❌ Pairing failed:"), e.message)
            }
        }
    }

    sock.ev.on('creds.update', saveCreds)

    // CONNECTION UPDATE (Sasa inatoka lib/connection.js)
    sock.ev.on('connection.update', async (update) => {
        await handleConnection(sock, update, startMickeyBot)
    })

    // MESSAGES UPSERT
    sock.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = chatUpdate.messages[0]
            if (!mek.message || (mek.key && mek.key.remoteJid === 'status@broadcast')) return

            await Promise.all([
                handleMessages(sock, chatUpdate),
                handleStatus(sock, chatUpdate)
            ]).catch(() => {})
        } catch (err) {}
    })

    return sock
}

startMickeyBot()

// Anti-Crash
process.on('uncaughtException', (err) => {
    if (err.message.includes('Bad MAC') || err.message.includes('SessionError')) return
    console.error('Critical Error:', err.message)
})

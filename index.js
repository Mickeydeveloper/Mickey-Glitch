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
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay,
    jidNormalizedUser
} = require("@whiskeysockets/baileys")

// Logger Config
const logger = pino({ level: 'silent' })

// RAM Management
if (typeof global.gc === 'function') {
    setInterval(() => { global.gc(); }, 3 * 60 * 1000);
}

const { handleMessages, handleStatus } = require('./main')

async function startXeonBotInc() {
    // Hakikisha folder la session lipo
    const { state, saveCreds } = await useMultiFileAuthState(`./session`)
    const { version } = await fetchLatestBaileysVersion()

    const XeonBotInc = makeWASocket({
        version,
        logger: logger,
        printQRInTerminal: false,
        // Browser lazima iwe hivi kwa ajili ya Pairing Code
        browser: ["Ubuntu", "Chrome", "20.0.04"], 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        retryRequestDelayMs: 100,
        connectTimeoutMs: 60000, // Ongeza muda wa kuunganisha
        defaultQueryTimeoutMs: 0,
        getMessage: async (key) => { return { conversation: 'Mickey Glitch' } }
    })

    // PAIRING LOGIC (Lekebisho la kukwama "Logging")
    if (!XeonBotInc.authState.creds.registered) {
        let phoneNumber = settings.ownerNumber.replace(/[^0-9]/g, '')
        
        if (!phoneNumber) {
            console.log(chalk.red("\n❌ ERROR: Owner number haipo kwenye settings.js!"));
        } else {
            console.log(chalk.cyan(`\n♻️  Jaribio la kutuma Pairing Code kwenda: ${phoneNumber}...`))
            await delay(10000) // Subiri kidogo socket itulie
            try {
                let code = await XeonBotInc.requestPairingCode(phoneNumber, "MICKDADY")
                code = code?.match(/.{1,4}/g)?.join("-") || code
                console.log(chalk.black(chalk.bgGreen(`\n ✅ PAIRING CODE: ${code} \n`)))
            } catch (e) {
                console.log(chalk.red("❌ Imeshindwa kupata kodi:"), e.message)
            }
        }
    }

    XeonBotInc.ev.on('creds.update', saveCreds)

    XeonBotInc.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) console.log(chalk.yellow(`📱 SCAN QR CODE (Kama pairing imefeli)`))
        if (connection === "connecting") console.log(chalk.blue(`⏳ Inatafuta mawasiliano... (Connecting)`))

        if (connection === "open") {
            console.log(chalk.green(`\n✅ ${settings.botName} IMEWAKA TAYARI!\n`))
            try {
                const ownerJid = jidNormalizedUser(XeonBotInc.user.id)
                await XeonBotInc.sendMessage(ownerJid, { text: `🚀 *MICKEY GLITCH V3* ipo hewani sasa!` })
            } catch (e) {}
        }

        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output?.statusCode
            if (reason !== DisconnectReason.loggedOut) {
                console.log(chalk.yellow(`🔄 Connection imekata. Inajirudia...`))
                startXeonBotInc()
            } else {
                console.log(chalk.red(`❌ Session imeisha (Logged Out). Futa folder la session uwashe upya.`))
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

// Shikilia errors za system zisizozuilika
process.on('uncaughtException', (err) => {
    if (err.message.includes('Bad MAC') || err.message.includes('SessionError')) return
    console.error('System Error:', err.message)
})

startXeonBotInc()

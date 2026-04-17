require('./settings')
const settings = require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const pino = require("pino")
const path = require('path')
const customLogger = require('./lib/silentLogger')
const systemMonitor = require('./lib/systemMonitor')
const sessionCleanup = require('./lib/sessionCleanup')
const autoSystem = require('./lib/autoSystem')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay,
    jidNormalizedUser
} = require("@whiskeysockets/baileys")

async function startXeonBotInc() {
    // 1. Futa session ya zamani inayoweza kukwamisha pairing mpya
    const { state, saveCreds } = await useMultiFileAuthState(`./session`)
    const { version } = await fetchLatestBaileysVersion()

    const XeonBotInc = makeWASocket({
        version,
        logger: customLogger,
        printQRInTerminal: false,
        // TUMEBORESHA HAPA: Kutumia Chrome kwenye Linux ili WhatsApp iweze ku-trust device
        browser: ["Ubuntu", "Chrome", "20.0.04"], 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, customLogger),
        },
        markOnlineOnConnect: true,
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
    })

    // PAIRING LOGIC (Nguvu ya MICKDADY)
    if (!XeonBotInc.authState.creds.registered) {
        let phoneNumber = settings.ownerNumber.replace(/[^0-9]/g, '')
        
        console.log(chalk.cyan(`\n[📡] System inatayarisha pairing kwa: ${phoneNumber}...`))
        
        // MUHIMU: Subiri sekunde 15 ili socket iunganishwe kikamilifu na server za WA
        await delay(15000) 

        try {
            console.log(chalk.yellow(`[⏳] Inatengeneza Code (MICKDADY)...`))
            
            // HAPA: Tunatumia custom code yako
            let code = await XeonBotInc.requestPairingCode(phoneNumber, "MICKDADY")
            code = code?.match(/.{1,4}/g)?.join("-") || code
            
            console.log(chalk.black(chalk.bgGreen(`\n  PAIRING CODE: ${code}  \n`)))
            console.log(chalk.white("👉 Fungua WhatsApp > Linked Devices > Link with Phone Number"));
            console.log(chalk.white(`👉 Kisha ingiza code hiyo hapo juu sasa hivi!`));

        } catch (error) {
            console.error(chalk.red('\n❌ Pairing imefeli:'), error.message)
            console.log(chalk.gray("Huenda WhatsApp wamekuwekea 'Cool-off period'. Subiri dk 10 jaribu tena."));
        }
    }

    XeonBotInc.ev.on('creds.update', saveCreds)

    XeonBotInc.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr, receivedPendingNotifications } = update
        
        // Display QR code for pairing
        if (qr) {
            console.log(chalk.yellow(`\n━━━━━━━━━━━━━━━━━━━━━━`))
            console.log(chalk.yellow(`📱 SCAN QR CODE NA WAIT`))
            console.log(chalk.yellow(`━━━━━━━━━━━━━━━━━━━━━━\n`))
        }
        
        // Connection state messages with better formatting
        if (connection === "connecting") {
            console.log(chalk.blue(`\n[⏳] ${settings.botName}: Inaiunganisha kwenye WhatsApp...`))
        }
        
        if (connection === "authenticating") {
            console.log(chalk.cyan(`[🔐] ${settings.botName}: Inakatatizi...`))
        }
        
        if (connection === "open") {
            console.log(chalk.green(`\n` + `━━━━━━━━━━━━━━━━━━━━━━`))
            console.log(chalk.green(`✅ ${settings.botName} IKO ONLINE!`))
            console.log(chalk.green(`🤖 Bot Ready: ${new Date().toLocaleTimeString()}`))
            console.log(chalk.green(`━━━━━━━━━━━━━━━━━━━━━━\n`))
            
            if (receivedPendingNotifications) {
                console.log(chalk.yellow(`📨 Kumekuwa na messages zilizopigwa kwa wakati wa offline...`))
            }

            // Start immediate cleanup on connection
            setTimeout(() => {
                console.log(chalk.cyan(`🧹 Running startup cleanup...`))
                sessionCleanup.fullCleanup()
                console.log(chalk.green(`✅ Startup cleanup complete!\n`))
            }, 2000)

            // Start auto-cleanup scheduler (every 6 hours)
            sessionCleanup.startAutoCleanup(6)
        }
        
        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output?.statusCode
            console.log(chalk.red(`\n[❌] CONNECTION CLOSED - Code: ${reason}`))
            
            if (reason === DisconnectReason.badSession) {
                console.log(chalk.red("Session imeharibika - Uninstall and reinstall the bot"))
            } else if (reason === DisconnectReason.connectionClosed) {
                console.log(chalk.yellow("Connection ilifungwa - Inareconnect..."))
            } else if (reason === DisconnectReason.connectionLost) {
                console.log(chalk.yellow("Connection iliyotaka - Inareconnect..."))
            } else if (reason === DisconnectReason.connectionReplaced) {
                console.log(chalk.yellow("Connection ilibadilishwa - Uninstall and restart"))
            } else if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.red("Umekutoka - Bot itasimama"))
            }
            
            if (reason !== DisconnectReason.loggedOut && reason !== DisconnectReason.badSession) {
                console.log(chalk.yellow(`[⏳] Inareconnect in 5 seconds...`))
                await delay(5000)
                startXeonBotInc()
            }
        }
        
        if (connection === "blocked") {
            console.log(chalk.red(`\n[🚫] ACCOUNT BLOCKED BY WHATSAPP!\nKamatia Support!`))
        }
    })

    // Handler ya message (main.js)
    XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = chatUpdate.messages[0]
            if (!mek.message || mek.key.fromMe) return
            const { handleMessages, handleStatus } = require('./main')
            
            // Run both handlers in parallel
            await Promise.all([
                handleMessages(XeonBotInc, chatUpdate).catch(err => {
                    console.error(chalk.red(`[❌] Message Handler Error:`), err.message)
                }),
                handleStatus(XeonBotInc, chatUpdate).catch(err => {
                    console.error(chalk.red(`[❌] Status Handler Error:`), err.message)
                })
            ])
        } catch (err) {
            console.error(chalk.red(`[❌] Messages Event Handler Error:`, err.message))
        }
    })

    return XeonBotInc
}

startXeonBotInc()

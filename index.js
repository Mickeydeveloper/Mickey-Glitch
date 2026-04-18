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

// Enable garbage collection for better RAM management
if (typeof global.gc === 'function') {
    console.log('🧠 Garbage collection enabled for optimal RAM usage');
    // Run GC every 5 minutes
    setInterval(() => {
        global.gc();
    }, 5 * 60 * 1000);
}

// Global error handler for session decryption errors
process.on('uncaughtException', (err) => {
    if (err.message?.includes('Bad MAC') || err.name === 'SessionError' || err.message?.includes('Failed to decrypt message')) {
        // Silently ignore session decryption errors
        return;
    }
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    if (reason?.message?.includes('Bad MAC') || reason?.name === 'SessionError' || reason?.message?.includes('Failed to decrypt message')) {
        // Silently ignore session decryption errors
        return;
    }
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Import message handlers once at startup
const { handleMessages, handleStatus } = require('./main')

async function startXeonBotInc() {
    // Load WhatsApp session
    const { state, saveCreds } = await useMultiFileAuthState(`./session`)
    const { version } = await fetchLatestBaileysVersion()

    const XeonBotInc = makeWASocket({
        version,
        logger: customLogger,
        printQRInTerminal: false,
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

    // PAIRING LOGIC (MICKDADY Power)
    if (!XeonBotInc.authState.creds.registered) {
        let phoneNumber = settings.ownerNumber.replace(/[^0-9]/g, '')
        
        console.log(chalk.cyan(`\n[📡] System is preparing to pair with: ${phoneNumber}...`))
        
        // Important: Wait 15 seconds for socket to fully connect with WA servers
        await delay(15000) 

        try {
            console.log(chalk.yellow(`[⏳] Generating Pairing Code (MICKDADY)...`))
            
            // Using custom code
            let code = await XeonBotInc.requestPairingCode(phoneNumber, "MICKDADY")
            code = code?.match(/.{1,4}/g)?.join("-") || code
            
            console.log(chalk.black(chalk.bgGreen(`\n  PAIRING CODE: ${code}  \n`)))
            console.log(chalk.white("👉 Open WhatsApp > Linked Devices > Link with Phone Number"));
            console.log(chalk.white(`👉 Then enter the code above now!`));

        } catch (error) {
            console.error(chalk.red('\n❌ Pairing failed:'), error.message)
            console.log(chalk.gray("WhatsApp may have set a 'Cool-off period'. Wait 10 minutes and try again."));
        }
    }

    XeonBotInc.ev.on('creds.update', saveCreds)

    XeonBotInc.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr, receivedPendingNotifications } = update
        
        // QR code for pairing
        if (qr) {
            console.log(chalk.yellow(`📱 SCAN QR CODE AND WAIT`))
        }
        
        // Connection state messages
        if (connection === "connecting") {
            console.log(chalk.blue(`Connecting to WhatsApp...`))
        }
        
        if (connection === "authenticating") {
            console.log(chalk.cyan(`Authenticating...`))
        }
        
        if (connection === "open") {
            console.log(chalk.green(`✅ ${settings.botName} IS ONLINE!`))
            if (receivedPendingNotifications) {
                console.log(chalk.yellow(`📨 Loaded pending messages`))
            }

            // Send notification to owner
            try {
                const ownerJid = settings.ownerNumber.endsWith('@s.whatsapp.net') 
                    ? settings.ownerNumber 
                    : settings.ownerNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
                
                const connectionTime = new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                })
                
                const connectionDate = new Date().toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                })
                
                // Send text message instead of image
                await XeonBotInc.sendMessage(ownerJid, {
                    text: `✅ *MICKEY GLITCH ONLINE*\n\n⏰ Connected: ${connectionTime}\n📅 Date: ${connectionDate}\n🟢 Status: Active\n\nType *.menu* for commands!`
                }).catch(() => {})
            } catch (err) {
                // Silent fail
            }
        }
        
        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output?.statusCode
            console.log(chalk.red(`❌ Connection closed (Code: ${reason})`))
            
            if (reason === DisconnectReason.badSession) {
                console.log(chalk.red("❌ Bad session - Delete session folder and restart"))
            } else if (reason === DisconnectReason.connectionClosed) {
                console.log(chalk.yellow("⏳ Connection closed, reconnecting..."))
            } else if (reason === DisconnectReason.connectionLost) {
                console.log(chalk.yellow("⏳ Connection lost, reconnecting..."))
            } else if (reason === DisconnectReason.connectionReplaced) {
                console.log(chalk.yellow("⚠️  Connection replaced, restart bot"))
            } else if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.red("❌ Logged out - Stopping"))
            }
            
            if (reason !== DisconnectReason.loggedOut && reason !== DisconnectReason.badSession) {
                console.log(chalk.yellow(`Reconnecting in 5 seconds...`))
                await delay(5000)
                startXeonBotInc()
            }
        }
        
        if (connection === "blocked") {
            console.log(chalk.red(`Account blocked by WhatsApp!`))
            console.log(chalk.red(`Contact support.`))
        }
    }).catch(err => {
        // Suppress session-related errors in connection updates
        if (err.message?.includes('Bad MAC') || err.name === 'SessionError') {
            return;
        }
        console.error(chalk.red(`❌ Connection update error: ${err.message}`))
    })

    // Message handler from main.js
    XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = chatUpdate.messages[0]
            if (!mek.message) return

            // Allow processing own messages for testing
            if (mek.key.fromMe) {
                console.log(chalk.yellow(`⚠️ Processing own message`))
            }

            await Promise.all([
                handleMessages(XeonBotInc, chatUpdate).catch(err => {
                    console.error(chalk.red(`❌ Message handler error: ${err.message}`))
                }),
                handleStatus(XeonBotInc, chatUpdate).catch(err => {})
            ])
        } catch (err) {
            // Suppress Bad MAC and Session decryption errors
            if (err.message?.includes('Bad MAC') || err.name === 'SessionError' || err.message?.includes('Failed to decrypt message')) {
                // Silently ignore session decryption errors
                return;
            }
            console.error(chalk.red(`❌ Event handler error: ${err.message}`))
        }
    })

    return XeonBotInc
}

startXeonBotInc()

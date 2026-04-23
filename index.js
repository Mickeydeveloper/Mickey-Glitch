require('./settings')

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidDecode
} = require('@whiskeysockets/baileys')

const chalk = require('chalk')
const pino = require('pino')
const fs = require('fs')

const { handleMessage, handleButtons } = require('./main')

// ================= SETTINGS =================
const SESSION_DIR = './session'
const CUSTOM_PAIR = "MICKY-GLITCH" // unaweza badilisha

// ================= START BOT =================
async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Mickey Bot', 'Chrome', '1.0.0']
    })

    // ================= PAIRING =================
    if (!sock.authState.creds.registered) {
        console.log(chalk.yellow('\n🔐 PAIRING MODE\n'))

        const code = await sock.requestPairingCode(CUSTOM_PAIR)

        console.log(chalk.green(`✅ CODE: ${code}`))
        console.log(chalk.cyan('📱 WhatsApp > Linked Devices > Enter Code\n'))
    }

    // ================= CONNECTION =================
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update

        if (connection === 'connecting') {
            console.log(chalk.yellow('🔄 Connecting...'))
        }

        if (connection === 'open') {
            console.log(chalk.green('✅ Connected Successfully'))
            console.log(chalk.cyan('🚀 Bot is now ONLINE\n'))
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode

            if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.red('❌ Session expired. Delete session & re-pair.'))
            } else {
                console.log(chalk.yellow('🔁 Reconnecting...'))
                setTimeout(startBot, 3000)
            }
        }
    })

    // ================= SAVE SESSION =================
    sock.ev.on('creds.update', saveCreds)

    // ================= MESSAGE HANDLER =================
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        try {
            if (type !== 'notify') return

            const msg = messages[0]
            if (!msg.message) return

            // avoid status crash
            if (msg.key && msg.key.remoteJid === 'status@broadcast') {
                await handleMessage(sock, msg)
                return
            }

            await handleMessage(sock, msg)
            await handleButtons(sock, msg)

        } catch (err) {
            console.log(chalk.red('❌ Message Error:'), err)
        }
    })

    // ================= GROUP UPDATE SAFETY =================
    sock.ev.on('group-participants.update', async (data) => {
        try {
            // unaweza kuongeza welcome/bye hapa bila kuharibu system
        } catch {}
    })

    // ================= ANTICRASH =================
    process.on('uncaughtException', (err) => {
        console.log(chalk.red('❌ Uncaught Error:'), err.message)
    })

    process.on('unhandledRejection', (err) => {
        console.log(chalk.red('❌ Promise Error:'), err)
    })
}

// ================= AUTO START =================
startBot()

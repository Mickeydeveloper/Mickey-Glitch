require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main')
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, sleep, reSize } = require('./lib/myfunc')

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")

const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")

// ────────────────[ CONFIG ]───────────────────
global.botname = "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™"
global.themeemoji = "•"
const phoneNumber = "255615858685"

const channelRD = {
    id: '120363398106360290@newsletter',
    name: '🅼🅸🅲🅺🄴🆈'
}

// Owner numbers for unlock
const OWNER_NUMBERS = ['0612130873', '06159447410'] // Tanzanian format without country code
const OWNER_NUMBERS_FULL = ['255612130873@s.whatsapp.net', '2556159447410@s.whatsapp.net'] // Full WhatsApp format

// Lock system variables
let isLocked = true // Start locked
let lockHistory = [] // Array to store lock/unlock events
let unlockAttempts = [] // Array to store unlock attempts

// Try to make serverMessageId look more realistic (random in reasonable range)
const fakeServerMsgId = () => Math.floor(Math.random() * 10000) + 100

// ────────────────[ LOCK SYSTEM FUNCTIONS ]───────────────────
function addToLockHistory(action, sender, reason = '') {
    const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Dar_es_Salaam' })
    const entry = {
        action,
        sender: sender || 'System',
        timestamp,
        reason,
        status: action === 'LOCK' ? '🔒 LOCKED' : '🔓 UNLOCKED'
    }
    lockHistory.unshift(entry)
    
    // Keep only last 50 entries
    if (lockHistory.length > 50) {
        lockHistory = lockHistory.slice(0, 50)
    }
    
    // Save to file
    saveLockHistory()
}

function saveLockHistory() {
    try {
        fs.writeFileSync('./lock_history.json', JSON.stringify(lockHistory, null, 2))
    } catch (err) {
        console.error('Failed to save lock history:', err)
    }
}

function loadLockHistory() {
    try {
        if (fs.existsSync('./lock_history.json')) {
            lockHistory = JSON.parse(fs.readFileSync('./lock_history.json', 'utf8'))
        }
    } catch (err) {
        console.error('Failed to load lock history:', err)
        lockHistory = []
    }
}

function isOwner(senderNumber) {
    const cleanNumber = senderNumber.replace(/[^0-9]/g, '')
    const tanzaniaNumber = cleanNumber.startsWith('255') ? cleanNumber.slice(3) : cleanNumber
    
    return OWNER_NUMBERS.includes(tanzaniaNumber) || OWNER_NUMBERS_FULL.includes(senderNumber)
}

function generateLockChart() {
    const totalEvents = lockHistory.length
    const locks = lockHistory.filter(e => e.action === 'LOCK').length
    const unlocks = lockHistory.filter(e => e.action === 'UNLOCK').length
    const failedAttempts = unlockAttempts.length
    
    let chart = `
╔══════════════════════════════════════╗
║              🔐 LOCK STATUS          ║
╠══════════════════════════════════════╣
║ 📊 Total Events: ${totalEvents}                    ║
║ 🔒 Locks: ${locks}                              ║
║ 🔓 Unlocks: ${unlocks}                          ║
║ ❌ Failed Attempts: ${failedAttempts}             ║
╠══════════════════════════════════════╣
║ 📈 STATUS HISTORY (Last 10):          ║
`
    
    const recentHistory = lockHistory.slice(0, 10)
    recentHistory.forEach((event, index) => {
        const timeAgo = getTimeAgo(event.timestamp)
        chart += `║ ${index + 1}. ${event.status} by ${event.sender.slice(0, 15)}... ${timeAgo} ║\n`
    })
    
    chart += `╚══════════════════════════════════════╝`
    
    return chart
}

function getTimeAgo(timestamp) {
    const now = new Date()
    const eventTime = new Date(timestamp)
    const diffMs = now - eventTime
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
}

// ────────────────[ STORE & SETTINGS ]───────────────────
const store = require('./lib/lightweight_store')
store.readFromFile()
const settings = require('./settings')

setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

// Load lock history on startup
loadLockHistory()

// Memory watchdog
setInterval(() => { if (global.gc) global.gc() }, 60000)
setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 450) {
        console.log(chalk.red("Memory > 450 MB → restarting..."))
        process.exit(1)
    }
}, 30000)

// ────────────────[ PAIRING ]───────────────────
const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code")
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null

const question = (text) => {
    if (rl) return new Promise(resolve => rl.question(text, resolve))
    return Promise.resolve(settings.ownerNumber || phoneNumber)
}

// ────────────────[ MAIN ]───────────────────
async function startXeonBotInc() {
    try {
        const { version } = await fetchLatestBaileysVersion()
        const { state, saveCreds } = await useMultiFileAuthState(`./session`)
        const msgRetryCounterCache = new NodeCache()

        const XeonBotInc = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !pairingCode,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: true,
            getMessage: async (key) => {
                let jid = jidNormalizedUser(key.remoteJid)
                let msg = await store.loadMessage(jid, key.id)
                return msg?.message || undefined
            },
            msgRetryCounterCache
        })

        XeonBotInc.ev.on('creds.update', saveCreds)
        store.bind(XeonBotInc.ev)

        // ──── Messages ────
        XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
            try {
                const mek = chatUpdate.messages?.[0]
                if (!mek?.message) return

                // Check if bot is locked
                if (isLocked && !isOwner(mek.key.remoteJid)) {
                    console.log(chalk.yellow(`[LOCKED] Ignoring message from ${mek.key.remoteJid}`))
                    return // Block all bot functions when locked
                }

                // Handle owner unlock commands
                if (isOwner(mek.key.remoteJid)) {
                    const msgText = (mek.message?.conversation || 
                                   mek.message?.extendedTextMessage?.text || 
                                   '').toLowerCase().trim()
                    
                    if (msgText === 'unlock' || msgText === '.unlock' || msgText === '!unlock') {
                        if (!isLocked) {
                            await XeonBotInc.sendMessage(mek.key.remoteJid, { 
                                text: `🔓 *Bot already unlocked!*\n\nStatus: ${generateLockChart()}` 
                            })
                            return
                        }
                        
                        isLocked = false
                        addToLockHistory('UNLOCK', mek.key.remoteJid)
                        await XeonBotInc.sendMessage(mek.key.remoteJid, { 
                            text: `🔓 *Bot Unlocked Successfully!*\n\n${generateLockChart()}` 
                        })
                        console.log(chalk.green(`[UNLOCK] Bot unlocked by owner: ${mek.key.remoteJid}`))
                        return
                    }
                    
                    if (msgText === 'lock' || msgText === '.lock' || msgText === '!lock') {
                        if (isLocked) {
                            await XeonBotInc.sendMessage(mek.key.remoteJid, { 
                                text: `🔒 *Bot already locked!*\n\nStatus: ${generateLockChart()}` 
                            })
                            return
                        }
                        
                        isLocked = true
                        addToLockHistory('LOCK', mek.key.remoteJid, 'Manual lock by owner')
                        await XeonBotInc.sendMessage(mek.key.remoteJid, { 
                            text: `🔒 *Bot Locked Successfully!*\n\nStatus: ${generateLockChart()}` 
                        })
                        console.log(chalk.red(`[LOCK] Bot locked by owner: ${mek.key.remoteJid}`))
                        return
                    }
                    
                    if (msgText === 'lockstatus' || msgText === '.lockstatus' || msgText === '!status') {
                        const statusEmoji = isLocked ? '🔒' : '🔓'
                        await XeonBotInc.sendMessage(mek.key.remoteJid, { 
                            text: `\( {statusEmoji} *Lock Status*\n\n \){generateLockChart()}` 
                        })
                        return
                    }
                }

                // Handle unlock attempts from non-owners
                if (!isOwner(mek.key.remoteJid)) {
                    const msgText = (mek.message?.conversation || 
                                   mek.message?.extendedTextMessage?.text || 
                                   '').toLowerCase().trim()
                    
                    if (msgText === 'unlock' || msgText === '.unlock' || msgText === '!unlock') {
                        unlockAttempts.push({
                            sender: mek.key.remoteJid,
                            timestamp: new Date().toLocaleString('en-GB', { timeZone: 'Africa/Dar_es_Salaam' })
                        })
                        await XeonBotInc.sendMessage(mek.key.remoteJid, { 
                            text: `❌ *Access Denied!*\n\n🔒 Bot is locked and only authorized owners can unlock it.\n\n📞 *Owner Numbers:*\n• 0612130873\n• 06159447410\n\nContact them to unlock the bot.` 
                        })
                        console.log(chalk.red(`[FAILED UNLOCK] Attempt by: ${mek.key.remoteJid}`))
                        return
                    }
                }

                if (mek.key?.remoteJid === 'status@broadcast') {
                    await handleStatus(XeonBotInc, chatUpdate)
                    return
                }

                await handleMessages(XeonBotInc, chatUpdate, true)
            } catch (err) {
                console.error("messages.upsert error:", err)
            }
        })

        // ──── Connection ────
        XeonBotInc.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect } = s

            if (connection === 'open') {
                console.log(chalk.green(`${global.themeemoji} Bot Connected Successfully! ✅`))

                const botJid = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net'

                // Auto subscribe newsletter
                try {
                    await XeonBotInc.subscribeNewsletter(channelRD.id)
                    console.log(chalk.green(`${global.themeemoji} Subscribed to ${channelRD.name} ✅`))
                } catch (err) {
                    console.log(chalk.yellow(`${global.themeemoji} Newsletter subscribe failed: ${err.message}`))
                }

                // Initial lock status
                if (isLocked) {
                    addToLockHistory('LOCK', 'System', 'Initial boot - locked by default')
                    console.log(chalk.red(`[SYSTEM] Bot started in LOCKED mode`))
                } else {
                    addToLockHistory('UNLOCK', 'System', 'Initial boot - unlocked')
                    console.log(chalk.green(`[SYSTEM] Bot started in UNLOCKED mode`))
                }

                // Welcome message (with fake forward look)
                const lockStatus = isLocked ? '🔒 LOCKED' : '🔓 UNLOCKED'
                const proCaption = `
╔══════════════════════╗
║   *CONNECTION SUCCESS* ╚══════════════════════╝

✨ *SYSTEM STATUS:* Online
🤖 *BOT NAME:* ${global.botname}
📡 *CHANNEL:* ${channelRD.name}
🔐 *LOCK STATUS:* ${lockStatus}
📞 *OWNERS:* 0612130873, 06159447410
🕒 *TIME:* ${new Date().toLocaleString('en-GB')}
⚙️ *RAM:* ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB

> *Verified boot sequence completed.*
> *Lock system active - ${isLocked ? 'Contact owner to unlock' : 'All functions available'}*.`.trim()

                await XeonBotInc.sendMessage(botJid, {
                    video: { url: 'https://files.catbox.moe/usg5b4.mp4' },
                    caption: proCaption,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: channelRD.id,
                            newsletterName: channelRD.name,
                            serverMessageId: fakeServerMsgId()
                        }
                    }
                })
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
                if (shouldReconnect) {
                    console.log(chalk.yellow("Reconnecting..."))
                    startXeonBotInc()
                }
            }
        })

        // ──── Better sendMessage wrapper ────
        const originalSendMessage = XeonBotInc.sendMessage.bind(XeonBotInc)

        XeonBotInc.sendMessage = async (jid, content, options = {}) => {
            // Check lock status before sending any message
            if (isLocked && !OWNER_NUMBERS_FULL.includes(jid) && !isOwner(jid)) {
                console.log(chalk.yellow(`[LOCKED] Blocking message to ${jid}`))
                return // Don't send messages when locked except to owners
            }

            // Never apply fake-forward to:
            // • newsletters themselves
            // • status
            // • messages that already have their own contextInfo logic
            if (
                jid?.includes('@newsletter') ||
                jid === 'status@broadcast' ||
                content?.poll ||
                content?.buttonsMessage ||
                content?.templateMessage ||
                options?.contextInfo?.forwardedNewsletterMessageInfo ||   // already has real forward
                options?.forward                   // using real forward
            ) {
                return originalSendMessage(jid, content, options)
            }

            // Prepare safe contextInfo
            const ctx = options.contextInfo || {}
            const finalContext = {
                ...ctx,
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: channelRD.id,
                    newsletterName: channelRD.name,
                    serverMessageId: fakeServerMsgId()   // ← randomized
                }
            }

            // Preserve mentions / quoted message if they exist
            if (ctx.mentionedJid) finalContext.mentionedJid = ctx.mentionedJid
            if (ctx.quotedMessage) finalContext.quotedMessage = ctx.quotedMessage

            options.contextInfo = finalContext

            return originalSendMessage(jid, content, options)
        }

        // ──── Pairing code ────
        if (pairingCode && !XeonBotInc.authState.creds.registered) {
            let number = (global.phoneNumber || await question(chalk.bgBlack(chalk.greenBright(`Input Number: `))))
                .replace(/[^0-9]/g, '')

            setTimeout(async () => {
                let code = await XeonBotInc.requestPairingCode(number)
                console.log(chalk.black(chalk.bgGreen(`Pairing Code:`)), chalk.white(code?.match(/.{1,4}/g)?.join("-")))
            }, 3000)
        }

        return XeonBotInc

    } catch (error) {
        console.error('Startup failed:', error)
        await delay(5000)
        startXeonBotInc()
    }
}

startXeonBotInc()

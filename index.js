require('dotenv').config()
require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main')
const { handleAnticall } = require('./commands/anticall')
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, sleep, reSize } = require('./lib/myfunc')

// ────────────────[ SUPPRESS NODE WARNINGS ]───────────────────
// Suppress non-critical Node.js and library warnings
process.on('warning', (warning) => {
    // Suppress specific warnings for cleaner logs
    if (warning.code === 'MaxListenersExceededWarning' ||
        warning.name === 'DeprecationWarning' ||
        warning.message?.includes('ExperimentalWarning')) {
        return
    }
    console.warn(warning)
})

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

const silentLogger = require('./lib/silentLogger')

const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")

// ────────────────[ SUPPRESS VERBOSE LOGS ]───────────────────
// Intercept console.log to filter out noisy debug messages
const originalLog = console.log
const originalError = console.error
let logBuffer = []
const BUFFER_SIZE = 5
const THROTTLE_MS = 2000

// Session log patterns to filter
const SESSION_LOG_PATTERNS = [
    /Closing (open )?session/i,
    /SessionEntry/i,
    /chainKey/i,
    /currentRatchet/i,
    /registrationId/i,
    /ephemeralKeyPair/i,
    /lastRemoteEphemeralKey/i,
    /indexInfo/i,
    /pendingPreKey/i,
    /baseKey/i,
    /privKey/i,
    /pubKey/i,
    /rootKey/i,
    /prekey bundle/i,
    /_chains/i,
    /messageKeys/i,
    /<Buffer/i,
    /merkleNode/i,
    /preKeyId/i,
    /signedPreKeyId/i,
    /identityKeyPair/i
]

console.log = function(...args) {
    const message = args.join(' ')
    
    // Filter out noisy session logs - check all patterns
    for (const pattern of SESSION_LOG_PATTERNS) {
        if (pattern.test(message)) {
            return // Silently discard these logs
        }
    }
    
    // Call original log
    originalLog.apply(console, arguments)
}

console.error = function(...args) {
    // Convert Error objects to readable strings
    const formattedArgs = args.map(arg => {
        if (arg instanceof Error) {
            return arg.message || String(arg)
        }
        if (typeof arg === 'object' && arg !== null) {
            try {
                return JSON.stringify(arg)
            } catch {
                return String(arg)
            }
        }
        return String(arg)
    })
    
    const message = formattedArgs.join(' ')
    
    // Suppress noisy decryption errors and session logs
    const errorPatterns = [
        /Bad MAC/i,
        /decrypt/i,
        /Session error/i,
        /rate-overlimit/i,
        /Closing (open )?session/i,
        /SessionEntry/i,
        /prekey bundle/i,
        /No session/i
    ]
    
    for (const pattern of errorPatterns) {
        if (pattern.test(message)) {
            return
        }
    }
    
    // Call original error with formatted arguments
    originalError.apply(console, formattedArgs)
}

// ────────────────[ CONFIG ]───────────────────
global.botname = "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™"
global.themeemoji = "•"
const phoneNumber = "255615858685"

const channelRD = {
    id: '120363398106360290@newsletter',
    name: '🅼🅸🅲🅺🅴🆈'
}

const OWNER_JID = jidNormalizedUser(phoneNumber + '@s.whatsapp.net')

// Fake serverMessageId
const fakeServerMsgId = () => Math.floor(Math.random() * 10000) + 100

// ────────────────[ STORE & SETTINGS ]───────────────────
const store = require('./lib/lightweight_store')
store.readFromFile()
const settings = require('./settings')

// ✅ Optimized storage: write store less frequently (60s instead of 30s)
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 60000)

// ✅ Aggressive garbage collection - every 45 seconds for low-RAM environments
setInterval(() => {
    try {
        if (global.gc) {
            global.gc()
        }
    } catch (e) {}
}, 45000)

// ✅ Aggressive memory management - restart at 300MB instead of 500MB
setInterval(() => {
    const memUsage = process.memoryUsage()
    const rssUsed = memUsage.rss / 1024 / 1024
    const heapUsed = memUsage.heapUsed / 1024 / 1024
    
    if (rssUsed > 300) {
        console.log(chalk.bgRed.white('  ⚠️  MEMORY CRITICAL  ⚠️  '), chalk.red(`RAM: ${rssUsed.toFixed(0)}MB → Auto-restart`))
        process.exit(1)
    } else if (rssUsed > 250) {
        // Warn before critical
        console.log(chalk.bgYellow.black('  ⚠️  MEMORY WARNING  ⚠️  '), chalk.yellow(`RAM: ${rssUsed.toFixed(0)}MB - Cleaning up`))
        // Force cleanup
        try {
            store.writeToFile()
        } catch (e) {}
    }
}, 30000) // Check every 30 seconds

// ✅ Periodic metadata cache cleanup - every 30 minutes
setInterval(() => {
    try {
        const { clearAllMetadataCache, getCacheStats } = require('./lib/groupMetadataCache')
        const stats = getCacheStats()
        if (stats.cacheSize > 0) {
            clearAllMetadataCache()
            console.log(chalk.cyan(`[CACHE] Cleared ${stats.cacheSize} metadata cache entries`))
        }
    } catch (e) {}
}, 30 * 60 * 1000) // Every 30 minutes

// ────────────────[ CLEANUP SYSTEM ]───────────────────
const TMP_FOLDERS = [
    path.join(__dirname, 'tmp'),
    path.join(__dirname, 'temp')
    // You can add more folders here if needed
]

function deleteFolderRecursive(dirPath) {
    if (!fs.existsSync(dirPath)) return
    try {
        fs.readdirSync(dirPath).forEach(file => {
            const curPath = path.join(dirPath, file)
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath)
            } else {
                fs.unlinkSync(curPath)
            }
        })
        fs.rmdirSync(dirPath)
    } catch (err) {
        console.log(chalk.yellow(`[cleanup] Could not fully remove ${dirPath} → ${err.message}`))
    }
}

function cleanTempFolders() {
    let cleanedCount = 0
    let totalSizeBytes = 0

    TMP_FOLDERS.forEach(folder => {
        if (!fs.existsSync(folder)) {
            try { fs.mkdirSync(folder, { recursive: true }) } catch (e) {}
            return
        }

        try {
            const files = fs.readdirSync(folder)
            cleanedCount += files.length

            files.forEach(file => {
                const filePath = path.join(folder, file)
                try {
                    const stats = fs.statSync(filePath)
                    totalSizeBytes += stats.size
                    // ✅ Force delete even if locked
                    fs.unlinkSync(filePath)
                } catch (e) {
                    // Try force delete on Windows
                    try {
                        fs.rmSync(filePath, { force: true })
                    } catch (err) {}
                }
            })

            // Recreate clean folder
            try {
                deleteFolderRecursive(folder)
                fs.mkdirSync(folder, { recursive: true })
            } catch (e) {}
        } catch (err) {
            // Silent cleanup errors
        }
    })

    return { cleanedCount, totalSizeBytes }
}

// ✅ NEW: Clean old Baileys store files
function cleanOldBaileysFiles() {
    const sessionDir = path.join(process.cwd(), 'session')
    if (!fs.existsSync(sessionDir)) return
    
    try {
        const files = fs.readdirSync(sessionDir)
        const now = Date.now()
        const ONE_DAY = 24 * 60 * 60 * 1000
        let cleaned = 0
        
        files.forEach(file => {
            // Skip essential files
            if (file === 'creds.json' || file === 'pre-key-1.json' || file === '.gitignore') return
            
            const filePath = path.join(sessionDir, file)
            try {
                const stat = fs.statSync(filePath)
                // Delete files older than 1 day
                if (now - stat.mtimeMs > ONE_DAY) {
                    fs.unlinkSync(filePath)
                    cleaned++
                }
            } catch (e) {}
        })
        
        if (cleaned > 0) console.log(chalk.cyan(`[BAILEYS] Cleaned ${cleaned} old session files`))
    } catch (e) {}
}

async function notifyCleanup(sock, result) {
    if (!sock || !OWNER_JID) return

    const sizeMB = (result.totalSizeBytes / (1024 * 1024)).toFixed(2)
    const timeStr = new Date().toLocaleString('en-US', {
        timeZone: 'Africa/Dar_es_Salaam',
        hour12: true,
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
    const message = 
`🧹 *AUTO CLEANUP COMPLETED*
📅 ${timeStr} (EAT)
🗑 Removed files: ${result.cleanedCount}
💾 Freed ≈ ${sizeMB} MB`

    try {
        await sock.sendMessage(OWNER_JID, { text: message })
        console.log(chalk.green('[cleanup] Notification sent to owner'))
    } catch (err) {
        console.log(chalk.yellow(`[cleanup] Failed to notify owner → ${err.message}`))
    }
}

// ────────────────[ SCHEDULED CLEANUPS ]───────────────────

// ✅ Every 3 hours for aggressive storage cleanup
setInterval(async () => {
    console.log(chalk.cyan('[CLEANUP] Starting aggressive cleanup...'))
    const result = cleanTempFolders()
    if (result.cleanedCount > 0) console.log(chalk.green(`[CLEANUP] Freed ${(result.totalSizeBytes / 1024 / 1024).toFixed(2)}MB`))
    // Also cleanup old baileys store files
    try {
        cleanOldBaileysFiles()
    } catch (e) {}
    if (global.sock && result.cleanedCount > 0) await notifyCleanup(global.sock, result)
}, 3 * 60 * 60 * 1000) // 3 hours for more aggressive cleanup

// Initial cleanup after connect
setTimeout(async () => {
    if (!global.sock) return
    console.log(chalk.cyan('[STARTUP] Running initial cleanup...'))
    const result = cleanTempFolders()
    try { cleanOldBaileysFiles() } catch (e) {}
    if (result.cleanedCount > 0) console.log(chalk.green(`[CLEANUP] Freed ${(result.totalSizeBytes / 1024 / 1024).toFixed(2)}MB`))
}, 15000)

// ────────────────[ MAIN ]───────────────────
async function startXeonBotInc() {
    try {
        // ──── Pairing code logic (moved to top) ────
        const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code")
        
        const { version } = await fetchLatestBaileysVersion()
        const { state, saveCreds } = await useMultiFileAuthState(`./session`)
        // ✅ Optimized cache with low memory footprint
        const msgRetryCounterCache = new NodeCache({ 
            stdTTL: 600,  // Expire cache entries after 10 minutes
            checkperiod: 60,  // Check for expired entries every 60 seconds
            useClones: false  // Don't clone objects to save RAM
        })

        const XeonBotInc = makeWASocket({
            version,
            logger: silentLogger,  // Use custom silent logger instead of pino
            printQRInTerminal: !pairingCode,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, silentLogger),  // Also use silent logger here
            },
            markOnlineOnConnect: true,
            getMessage: async (key) => {
                let jid = jidNormalizedUser(key.remoteJid)
                let msg = await store.loadMessage(jid, key.id)
                return msg?.message || undefined
            },
            msgRetryCounterCache,
            // ✅ RAM & Storage optimizations
            syncFullHistory: false,
            retryRequestDelayMs: 100,
            maxMsgsInMemory: 50,  // Limit in-memory messages
            maxVersionCheckAttempts: 1,  // Reduce version check retries to avoid session flapping
            fetchMessagesOnWaWebMessage: false,  // Don't auto-fetch old messages
            shouldIgnoreJid: (jid) => jid.includes('@broadcast') || jid.includes('@newsletter'),  // Ignore broadcast/newsletters
            // ✅ Reduce prekey bundle frequency
            getExpired: () => false,  // Don't request new prekeys aggressively
            // ✅ Increase connection timeout to avoid quick reconnects
            connectTimeoutMs: 60000  // 60 seconds instead of default
        })

        // Make socket globally accessible for cleanup notifications
        global.sock = XeonBotInc

        // ✅ Apply metadata caching wrapper to prevent rate-limit errors
        const { getGroupMetadataWithCache } = require('./lib/groupMetadataCache')
        const originalGroupMetadata = XeonBotInc.groupMetadata.bind(XeonBotInc)
        XeonBotInc.groupMetadata = async (chatId) => {
            return getGroupMetadataWithCache(originalGroupMetadata, chatId)
        }
        console.log(chalk.cyan('[INIT] Group metadata caching enabled'))

        XeonBotInc.ev.on('creds.update', saveCreds)
        store.bind(XeonBotInc.ev)

        // ──── Messages ────
        XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
            try {
                const mek = chatUpdate.messages?.[0]
                if (!mek?.message) return

                if (mek.key?.remoteJid === 'status@broadcast') {
                    await handleStatus(XeonBotInc, chatUpdate)
                    return
                }

                // Retry logic for message handling during session transitions
                let retries = 0
                const maxRetries = 2
                
                while (retries < maxRetries) {
                    try {
                        await handleMessages(XeonBotInc, chatUpdate, true)
                        break
                    } catch (err) {
                        // Silently ignore decryption errors (Bad MAC, etc) - these are expected during session transitions
                        if (err.message?.includes('Bad MAC') || err.message?.includes('decrypt')) {
                            break
                        }
                        
                        // Rate limit errors - silence these too
                        if (err.message?.includes('rate-overlimit') || err.data === 429) {
                            break
                        }
                        
                        // Retry on other errors
                        if (retries < maxRetries - 1) {
                            retries++
                            await delay(100 * retries) // Exponential backoff
                            continue
                        }
                        
                        // Only log after all retries fail
                        console.log(chalk.bgRed.black('  ⚠️  MSG ERROR  ⚠️  '), chalk.red(err.message))
                        break
                    }
                }
            } catch (err) {
                // Outer try-catch for any unexpected errors
                if (!err.message?.includes('Bad MAC') && !err.message?.includes('rate-overlimit')) {
                    console.log(chalk.bgRed.black('  ⚠️  MSG ERROR  ⚠️  '), chalk.red(err.message))
                }
            }
        })

        // ──── Calls ────
        XeonBotInc.ev.on('call', async (call) => {
            try {
                await handleAnticall(XeonBotInc, { call })
            } catch (err) {
                console.log(chalk.bgRed.black('  ⚠️  CALL ERROR  ⚠️  '), chalk.red(err.message))
            }
        })

        // ──── Suppress noisy decryption errors ────
        XeonBotInc.ev.on('error', (err) => {
            // Silently ignore common non-critical session errors
            if (err.message?.includes('Bad MAC') || 
                err.message?.includes('decryption failed') ||
                err.message?.includes('rate-overlimit') ||
                err.message?.includes('Session error')) {
                return
            }
            console.log(chalk.bgRed.black('  ⚠️  SOCKET ERROR  ⚠️  '), chalk.red(err.message))
        })

        // ──── Connection ────
        XeonBotInc.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect } = s

            if (connection === 'open') {
                console.log(chalk.bgGreen.black('  ✨  CONNECTED  ✨  '), chalk.green('Bot Online & Ready!'))

                const botJid = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net'

                const proCaption = `✨ *MICKEY GLITCH BOT* ✨
🟢 *Online & Ready*
📡 ${channelRD.name} | 💾 ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB
🎯 All Systems Operational`.trim()

                await XeonBotInc.sendMessage(botJid, {
                    text: proCaption,
                    contextInfo: {
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: channelRD.id,
                            newsletterName: channelRD.name,
                            serverMessageId: fakeServerMsgId()
                        },
                        externalAdReply: {
                            title: `ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ᴠ3.1.0`,
                            body: `Hosted by Mickey Glitch`,
                            thumbnailUrl: 'https://files.catbox.moe/jwdiuc.jpg',
                            sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                })

                try {
                    await XeonBotInc.newsletterFollow(channelRD.id)
                    console.log(chalk.bgBlue.black('  📢  CHANNEL  📢  '), chalk.blue(`Auto-following: ${channelRD.name}`))
                } catch (err) {
                    console.log(chalk.bgYellow.black('  ⚠️  FOLLOW ERROR  ⚠️  '), chalk.yellow(err.message))
                }

                console.log(chalk.bgGreen.black('  ✅  STARTUP  ✅  '), chalk.green('Bot fully operational'))
                console.log('')
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
                if (shouldReconnect) {
                    console.log(chalk.bgYellow.black('  🔄  RECONNECT  🔄  '), chalk.yellow('Attempting to reconnect...'))
                    startXeonBotInc()
                }
            }
        })

        // ✅ Optimized fake forwarded messages (reduced memory overhead)
        const originalSendMessage = XeonBotInc.sendMessage.bind(XeonBotInc)
        let lastDelayTime = 0

        XeonBotInc.sendMessage = async (jid, content, options = {}) => {
            const originalContext = options.contextInfo || {}

            const skipFakeForward = 
                jid?.includes('@newsletter') ||
                jid === 'status@broadcast' ||
                content?.poll ||
                content?.buttonsMessage ||
                content?.templateMessage ||
                content?.listMessage ||
                options?.forward ||
                originalContext?.forwardedNewsletterMessageInfo

            if (skipFakeForward) {
                return originalSendMessage(jid, content, options)
            }

            // ✅ Occasional smart delay to avoid detection while saving CPU
            const now = Date.now()
            if (Math.random() > 0.8 && now - lastDelayTime > 5000) {
                await delay(100)
                lastDelayTime = now
            }

            // ✅ Minimal context to reduce payload size
            const fakeForwardContext = {
                isForwarded: true,
                forwardingScore: 999,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: channelRD.id,
                    newsletterName: channelRD.name,
                    serverMessageId: fakeServerMsgId()
                }
            }

            // Only preserve essential quoted message
            if (originalContext?.quotedMessage) {
                fakeForwardContext.quotedMessage = originalContext.quotedMessage
            }
            if (originalContext?.mentionedJid) {
                fakeForwardContext.mentionedJid = originalContext.mentionedJid
            }

            options.contextInfo = fakeForwardContext
            
            return originalSendMessage(jid, content, options)
        }

        // ──── Setup CLI interface ────
        const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null

        const question = (text) => {
            if (rl) return new Promise(resolve => rl.question(text, resolve))
            return Promise.resolve(settings.ownerNumber || phoneNumber)
        }

        if (pairingCode && !XeonBotInc.authState.creds.registered) {
            console.log(chalk.bgMagenta.white('  ⏳  PAIRING REQUIRED  ⏳  '))
            console.log(chalk.magenta('Tumia code maalum ili ku-pair bot'))

            let number = (global.phoneNumber || await question(chalk.bgBlack(chalk.greenBright(`Weka namba ya simu (bila + au 0 mwanzo): `))))
                .replace(/[^0-9]/g, '')

            if (!number.startsWith('255')) {
                number = '255' + number
            }

            setTimeout(async () => {
                try {
                    const customPairCode = "MICKDADY"

                    console.log(chalk.yellow('→ Inajaribu ku-pair na code: ') + chalk.cyan.bold(customPairCode))

                    const code = await XeonBotInc.requestPairingCode(number, customPairCode)

                    console.log('')
                    console.log(chalk.bgCyan.black('  🔐PAIRING CODE MICKDADY 🔐  '))
                    console.log(chalk.cyan.bold('  ' + customPairCode))
                    console.log(chalk.yellow('→ Fungua WhatsApp kwenye simu yako'))
                    console.log(chalk.yellow('→ Nenda: Menu → Linked Devices → Link a device'))
                    console.log(chalk.yellow('→ Chagua "Link with phone number"'))
                    console.log(chalk.yellow('→ Weka namba yako halafu weka code hii: ') + chalk.green.bold(customPairCode))
                    console.log(chalk.gray('→ Thibitisha na subiri bot i-connect'))
                    console.log('')
                } catch (err) {
                    console.log(chalk.bgRed.black('  ❌  ERROR  ❌  '))
                    console.log(chalk.red(err.message || 'Tatizo la ku-pair'))
                    console.log(chalk.yellow('Vidokezo:'))
                    console.log(chalk.gray('1. Hakikisha namba ni sahihi (mfano: 255615858685)'))
                    console.log(chalk.gray('2. Code "MICKDADY" lazima iwe 8 characters tu'))
                    console.log(chalk.gray('3. Jaribu tena baada ya sekunde chache au badilisha code'))
                    console.log('')
                }
            }, 3000)
        }

        return XeonBotInc

    } catch (error) {
        console.log(chalk.bgRed.white('  ❌  STARTUP ERROR  ❌  '), chalk.red(error.message))
        console.log(chalk.yellow('Inajaribu tena baada ya sekunde 8...'))
        await delay(8000)
        startXeonBotInc()
    }
}

startXeonBotInc()
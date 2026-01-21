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
    name: '🅼🅸🅲🅺🅴🆈'
}

// Try to make serverMessageId look more realistic (random in reasonable range)
const fakeServerMsgId = () => Math.floor(Math.random() * 10000) + 100

// ────────────────[ STORE & SETTINGS ]───────────────────
const store = require('./lib/lightweight_store')
store.readFromFile()
const settings = require('./settings')

setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

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

                // Welcome message (with fake forward look)
                const proCaption = `
╔══════════════════════╗
║   *CONNECTION SUCCESS* ╚══════════════════════╝

✨ *SYSTEM STATUS:* Online
🤖 *BOT NAME:* ${global.botname}
📡 *CHANNEL:* ${channelRD.name}
🕒 *TIME:* ${new Date().toLocaleString('en-GB')}
⚙️ *RAM:* ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB

> *Verified boot sequence completed.*`.trim()

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
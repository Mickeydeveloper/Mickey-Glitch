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
        console.log(chalk.bgRed.white('  ⚠️  MEMORY ALERT  ⚠️  '), chalk.red('RAM > 450MB → Restarting...'))
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
                console.log(chalk.bgRed.black('  ⚠️  MSG ERROR  ⚠️  '), chalk.red(err.message))
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

        // ──── Connection ────
        XeonBotInc.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect } = s
            if (connection === 'open') {
                console.log(chalk.bgGreen.black('  ✨  CONNECTED  ✨  '), chalk.green('Bot Online!'))
                const botJid = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net'

                // Startup Notification
                await XeonBotInc.sendMessage(botJid, {
                    text: `✨ *MICKEY GLITCH ONLINE*\n📡 Channel: ${channelRD.name}\n💾 RAM: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`
                })

                try {
                    await XeonBotInc.newsletterFollow(channelRD.id)
                } catch (err) {
                    console.log(chalk.yellow('Newsletter follow error: ' + err.message))
                }
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
                if (shouldReconnect) startXeonBotInc()
            }
        })

        // ──── IMPROVED FORWARDING WRAPPER ────
        // This ensures EVERY message (text, media, etc) gets the forward tag
        const originalSendMessage = XeonBotInc.sendMessage.bind(XeonBotInc)
        XeonBotInc.sendMessage = async (jid, content, options = {}) => {
            // Filter out system JIDs
            if (jid?.includes('@newsletter') || jid === 'status@broadcast') {
                return originalSendMessage(jid, content, options)
            }

            // Standardize content to object format
            let finalContent = typeof content === 'string' ? { text: content } : content

            // Build injection metadata
            const forwardData = {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: channelRD.id,
                    newsletterName: channelRD.name,
                    serverMessageId: fakeServerMsgId()
                }
            }

            // Merge with existing context (keeps replies/mentions intact)
            options.contextInfo = {
                ...(options.contextInfo || {}),
                ...forwardData
            }

            return originalSendMessage(jid, finalContent, options)
        }

        // ──── Pairing ────
        if (pairingCode && !XeonBotInc.authState.creds.registered) {
            let number = (global.phoneNumber || await question(chalk.greenBright(`Input Number: `))).replace(/[^0-9]/g, '')
            setTimeout(async () => {
                try {
                    let code = await XeonBotInc.requestPairingCode(number)
                    console.log(chalk.bgCyan.black(' 🔐 CODE: '), chalk.cyan.bold(code?.match(/.{1,4}/g)?.join("-")))
                } catch (err) {
                    console.log(chalk.red('Pairing Error: ' + err.message))
                }
            }, 5000)
        }

        return XeonBotInc
    } catch (error) {
        await delay(5000)
        startXeonBotInc()
    }
}

startXeonBotInc()

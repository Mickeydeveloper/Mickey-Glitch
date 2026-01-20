require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
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

// ================= [ CONFIGURATION & GLOBALS ] =================
global.botname = "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™"
global.themeemoji = "•"
let phoneNumber = "255615858685"
const channelRD = { 
    id: '120363398106360290@newsletter', 
    name: '🅼🅸🅲🅺🅴🆈' 
};

// Import lightweight store
const store = require('./lib/lightweight_store')
store.readFromFile()
const settings = require('./settings')
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

// Memory optimization
setInterval(() => { if (global.gc) global.gc() }, 60_000)
setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 450) process.exit(1)
}, 30_000)

const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code")
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null

const question = (text) => {
    if (rl) return new Promise((resolve) => rl.question(text, resolve))
    return Promise.resolve(settings.ownerNumber || phoneNumber)
}

// ================= [ START BOT ENGINE ] =================
async function startXeonBotInc() {
    try {
        let { version } = await fetchLatestBaileysVersion()
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
                return msg?.message || ""
            },
            msgRetryCounterCache
        })

        XeonBotInc.ev.on('creds.update', saveCreds)
        store.bind(XeonBotInc.ev)

        // ================= [ MESSAGE HANDLING ] =================
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
                console.error("Error in messages.upsert:", err)
            }
        })

        // ================= [ CONNECTION UPDATE ] =================
        XeonBotInc.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect } = s
            if (connection === 'open') {
                console.log(chalk.green(`${global.themeemoji} Bot Connected Successfully! ✅`))

                const botJid = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net'

                // Auto-follow channel
                try {
                    await XeonBotInc.subscribeNewsletter(channelRD.id)
                    console.log(chalk.green(`${global.themeemoji} Channel ${channelRD.name} followed successfully! ✅`))
                } catch (err) {
                    console.log(chalk.yellow(`${global.themeemoji} Could not auto-follow channel: ${err.message}`))
                }

                // Professional Connection Caption
                const proCaption = `
╔══════════════════════╗
║   *CONNECTION SUCCESS* ╚══════════════════════╝

✨ *SYSTEM STATUS:* Online
🤖 *BOT NAME:* ${global.botname}
📡 *CHANNEL:* ${channelRD.name}
🕒 *TIME:* ${new Date().toLocaleString()}
⚙️ *RAM:* ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB

> *Verified System Boot Sequence Completed.*`.trim()

                // Send Normal Video with Newsletter Forwarding context
                await XeonBotInc.sendMessage(botJid, { 
                    video: { url: 'https://files.catbox.moe/usg5b4.mp4' }, 
                    caption: proCaption,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: channelRD.id,
                            newsletterName: channelRD.name,
                            serverMessageId: 143
                        }
                    }
                })
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
                if (shouldReconnect) startXeonBotInc()
            }
        })

        // ================= [ UTILS & PAIRING ] =================
        XeonBotInc.decodeJid = (jid) => {
            if (!jid) return jid
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {}
                return decode.user && decode.server && decode.user + '@' + decode.server || jid
            } else return jid
        }

        // ================= [ MESSAGE WRAPPER WITH CHANNEL CONTEXT ] =================
        // Wrap sendMessage to add newsletter context to all bot messages
        const originalSendMessage = XeonBotInc.sendMessage.bind(XeonBotInc)
        XeonBotInc.sendMessage = async function(jid, content, options = {}) {
            // Skip context for status broadcasts and newsletters
            if (!jid?.includes('@newsletter')) {
                // Add forwarding context if not already present
                if (!options.contextInfo) {
                    options.contextInfo = {}
                }
                if (!options.contextInfo.forwardedNewsletterMessageInfo) {
                    options.contextInfo.forwardingScore = 999
                    options.contextInfo.isForwarded = true
                    options.contextInfo.forwardedNewsletterMessageInfo = {
                        newsletterJid: channelRD.id,
                        newsletterName: channelRD.name,
                        serverMessageId: 143
                    }
                }
            }
            return originalSendMessage(jid, content, options)
        }

        if (pairingCode && !XeonBotInc.authState.creds.registered) {
            let phoneNumberInput = (global.phoneNumber || await question(chalk.bgBlack(chalk.greenBright(`Input Number: `)))).replace(/[^0-9]/g, '')
            setTimeout(async () => {
                let code = await XeonBotInc.requestPairingCode(phoneNumberInput)
                console.log(chalk.black(chalk.bgGreen(`Pairing Code:`)), chalk.white(code?.match(/.{1,4}/g)?.join("-")))
            }, 3000)
        }

        return XeonBotInc

    } catch (error) {
        console.error('Startup Error:', error)
        await delay(5000)
        startXeonBotInc()
    }
}

startXeonBotInc()

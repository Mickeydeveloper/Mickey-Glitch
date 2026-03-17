require('dotenv').config()
require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const { handleMessages, handleStatus } = require('./main')
const { handleAnticall } = require('./commands/anticall')

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")

const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")

// ====================== GLOBAL CONFIG ======================
global.botname = "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™"
const customPairCode = "MICKDADY"
const channelRD = {
    id: '120363398106360290@newsletter',
    name: '🅼🅸🅲🅺🅴🆈'
}

// ====================== FICHA BAD MAC NOISE (SUPPRESS) ======================
// Override console.error ili Bad MAC zisichapishwe
const originalConsoleError = console.error
console.error = function (...args) {
    const msg = args.join(' ')
    if (msg.includes('Bad MAC') || msg.includes('verifyMAC') || msg.includes('Failed to decrypt message with any known session')) {
        // Ficha kabisa - au unaweza ku-log silent: originalConsoleError(chalk.gray('[Bad MAC suppressed]'))
        return
    }
    originalConsoleError.apply(console, args)
}

// ====================== STORE ======================
const store = require('./lib/lightweight_store')
store.readFromFile()

setInterval(() => store.writeToFile(), 10000)
setInterval(() => { if (global.gc) global.gc() }, 30000)

// ====================== TEMP & MEMORY & SESSION CLEANERS ======================
const cleanTempFolder = (dir) => {
    if (!fs.existsSync(dir)) return
    fs.readdirSync(dir).forEach(f => {
        try { fs.unlinkSync(path.join(dir, f)) } catch {}
    })
}

setInterval(() => {
    cleanTempFolder('./tmp')
    cleanTempFolder('./temp')
    console.log(chalk.blueBright('🧹 Temp na old files zimesafishwa'))
}, 60 * 60 * 1000)  // Kila saa 1

setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 450) {
        console.log(chalk.bgRed.white(' ⚠️ MEMORY > 450MB → RESTARTING...'))
        process.exit(1)
    }
}, 20000)

// ====================== CONSOLE INPUT ======================
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise(resolve => rl.question(text, resolve))

// ====================== FANCY BOX (IMEBoreshwa) ======================
const printBox = (title, content, bgColor = chalk.bgCyan, textColor = chalk.white) => {
    const maxLen = Math.max(title.length, content.length) + 8
    const topBottom = '═'.repeat(maxLen)
    const paddedTitle = ' '.repeat(Math.floor((maxLen - title.length) / 2)) + title
    const paddedContent = ' '.repeat(Math.floor((maxLen - content.length) / 2)) + content

    console.log(bgColor(`╔${topBottom}╗`))
    console.log(bgColor(`║${paddedTitle}║`))
    console.log(bgColor(`╠${topBottom}╣`))
    console.log(textColor(`║${paddedContent}║`))
    console.log(bgColor(`╚${topBottom}╝\n`))
}

// ====================== BOT START ======================
async function startXeonBotInc(){
    try{
        const { version } = await fetchLatestBaileysVersion()
        const { state, saveCreds } = await useMultiFileAuthState('./session')
        const msgRetryCounterCache = new NodeCache()

        printBox("INITIALIZING BOT", "Mickey Glitch ™ Starting...", chalk.bgMagenta, chalk.whiteBright)

        const XeonBotInc = makeWASocket({
            version,
            logger: pino({ level: 'fatal' }),  // Fatal ili noise iwe chini sana (Bad MAC bado inafichwa na override)
            printQRInTerminal: false,
            mobile: false,
            browser: ["Ubuntu","Chrome","20.0.04"],
            auth:{
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({level:"fatal"})) 
            },
            markOnlineOnConnect:true,
            msgRetryCounterCache,
            getMessage: async(key)=>{
                const jid = jidNormalizedUser(key.remoteJid)
                const msg = await store.loadMessage(jid,key.id)
                return msg?.message || undefined
            }
        })

        XeonBotInc.ev.on('creds.update', saveCreds)
        store.bind(XeonBotInc.ev)

        // ====================== CUSTOM PAIRING ======================
        if(!XeonBotInc.authState.creds.registered){
            printBox("PAIRING INAHITAJIKA", "Tayari ku-link bot na namba yako", chalk.bgYellow, chalk.black)

            console.log(chalk.greenBright.bold("\nWeka namba ya simu (mfano: 255615858685):"))
            let phoneNumber = await question(chalk.cyan("→ "))
            let number = phoneNumber.replace(/[^0-9]/g,'')
            if(!number.startsWith('255')) number='255'+number

            console.log(chalk.cyan(`\n→ Custom Pair Code: ${customPairCode}`))
            console.log(chalk.yellow(`→ Sending pairing request kwa ${number}...\n`))

            try{
                await delay(3000)
                let code = await XeonBotInc.requestPairingCode(number,customPairCode)
                printBox("PAIRING CODE YAKO", code || customPairCode, chalk.bgGreen, chalk.black.bold)
                console.log(chalk.yellowBright('→ Open WhatsApp > Linked Devices > Link with phone number'))
                console.log(chalk.yellowBright('→ Weka code hapo haraka!\n'))
            }catch(err){
                console.log(chalk.red('\n❌ Pairing Error: '+err.message))
            }
        }

        // ====================== EVENTS ======================
        XeonBotInc.ev.on('messages.upsert', async chatUpdate=>{
            try{
                const mek = chatUpdate.messages?.[0]
                if(!mek?.message) return

                const forwardContext = {
                    isForwarded:true,
                    forwardingScore:999,
                    forwardedNewsletterMessageInfo:{
                        newsletterJid: channelRD.id,
                        newsletterName: channelRD.name,
                        serverMessageId: Math.floor(Math.random()*10000)+100
                    },
                    externalAdReply:{
                        title:`ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ᴠ3.1.0`,
                        body:`Hosted by Mickey Glitch`,
                        thumbnailUrl:'https://files.catbox.moe/jwdiuc.jpg',
                        sourceUrl:'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
                        mediaType:1,
                        renderLargerThumbnail:true
                    }
                }

                await handleMessages(XeonBotInc, chatUpdate, true, forwardContext)
            }catch{}
        })

        XeonBotInc.ev.on('connection.update', async s=>{
            const { connection, lastDisconnect } = s
            if(connection==='open'){
                printBox("BOT CONNECTED", "✨ Online & Ready ✨", chalk.bgGreen, chalk.black)
                
                const botJid = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net'
                const proCaption = `✨ *MICKEY GLITCH BOT* ✨\n🟢 *Online & Ready*\n📡 ${channelRD.name}\n🎯 All Systems Operational`

                await XeonBotInc.sendMessage(botJid,{
                    text: proCaption,
                    contextInfo:{
                        isForwarded:true,
                        forwardedNewsletterMessageInfo:{
                            newsletterJid: channelRD.id,
                            newsletterName: channelRD.name,
                            serverMessageId: Math.floor(Math.random()*10000)+100
                        },
                        externalAdReply:{
                            title:`ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ᴠ3.1.0`,
                            body:`Hosted by Mickey Glitch`,
                            thumbnailUrl:'https://files.catbox.moe/jwdiuc.jpg',
                            sourceUrl:'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
                            mediaType:1,
                            renderLargerThumbnail:true
                        }
                    }
                })
            }
            if(connection==='close'){
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
                if(reason!==DisconnectReason.loggedOut){
                    printBox("RECONNECTING", "🔄 Inajaribu ku-connect tena... 🔄", chalk.bgYellow, chalk.black)
                    setTimeout(()=>startXeonBotInc(),5000)
                }else{
                    printBox("LOGGED OUT", "❌ Session ime-log out — pair upya", chalk.bgRed, chalk.white)
                }
            }
        })

        return XeonBotInc

    }catch(error){
        // Hapa pia ficha kama ni Bad MAC
        if (!error.message?.includes('Bad MAC') && !error.message?.includes('verifyMAC')) {
            console.log(chalk.red('Error: '+error.message))
        }
        await delay(8000)
        startXeonBotInc()
    }
}

// ====================== PROCESS HANDLERS ======================
process.on('uncaughtException',(error)=>{
    if (!error.message?.includes('Bad MAC') && !error.message?.includes('verifyMAC')) {
        originalConsoleError(chalk.bgRed.white(' ⚠️ EXCEPTION ⚠️ '), error.message)
    }
})
process.on('unhandledRejection',(reason)=>{
    const msg = reason?.message || reason?.toString() || ''
    if (!msg.includes('Bad MAC') && !msg.includes('verifyMAC')) {
        originalConsoleError(chalk.bgYellow.white(' ⚠️ REJECTION ⚠️ '), reason)
    }
})

// ====================== START BOT ======================
printBox("BOT STARTING", "🤖 Mickey Glitch Initializing... 🤖", chalk.bgCyan, chalk.black)
startXeonBotInc()
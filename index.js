require('dotenv').config()
require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const { exec } = require('child_process') // Inahitajika kwa Auto-Update
const { handleMessages, handleStatus } = require('./main')
const { handleAnticall } = require('./commands/anticall')
const { sendButtons } = require('gifted-btns')

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
global.botname = "𝙼𝚒𝚌𝚔𝚎𝚈 𝙶𝚕𝚒𝚝𝚌𝚑™"
const customPairCode = "MICKDADY"
const channelRD = {
    id: '120363398106360290@newsletter',
    name: '🅼🅸🅲🅺🅴🆈'
}

// ====================== AUTO-UPDATE SYSTEM ======================
const autoUpdate = () => {
    console.log(chalk.yellowBright('🔄 Inakagua kama kuna updates mpya GitHub...'))
    exec('git pull', (err, stdout, stderr) => {
        if (err) {
            console.log(chalk.red(`❌ Update imefeli: ${err.message}`))
            return
        }
        if (stdout.includes('Already up to date.')) {
            console.log(chalk.greenBright('✅ Bot ipo up-to-date.'))
        } else {
            console.log(chalk.bgGreen.black('🚀 Updates mpya zimepatikana na kuwekwa!'))
            console.log(chalk.yellow('🔄 Inajirestart ili kuanza na toleo jipya...'))
            process.exit(0) // Restart bot kupitia PM2 au hosting
        }
    })
}

// ====================== SESSION & TEMP CLEANER (IMPROVED) ======================
const cleanOldSessions = () => {
    const sessionDir = './session'
    if (!fs.existsSync(sessionDir)) return
    
    fs.readdirSync(sessionDir).forEach(file => {
        // USIFUTE creds.json kwa sababu ndio login yako
        if (file === 'creds.json') return 
        
        const filePath = path.join(sessionDir, file)
        const stats = fs.statSync(filePath)
        
        // Futa faili za session ambazo hazijaguswa kwa masaa 24
        const hours24 = 24 * 60 * 60 * 1000
        if (Date.now() - stats.mtimeMs > hours24) {
            try {
                fs.unlinkSync(filePath)
                // console.log(chalk.gray(`🗑️ Old session file deleted: ${file}`))
            } catch {}
        }
    })
}

const cleanTempFolder = (dir) => {
    if (!fs.existsSync(dir)) return
    fs.readdirSync(dir).forEach(f => {
        try { fs.unlinkSync(path.join(dir, f)) } catch {}
    })
}

// Run Cleaners
setInterval(() => {
    cleanTempFolder('./tmp')
    cleanTempFolder('./temp')
    cleanOldSessions() // Futa session za zamani
    console.log(chalk.blueBright('🧹 Mifumo ya takataka na Session za zamani imesafishwa'))
}, 60 * 60 * 1000) // Kila saa 1

// ====================== SUPPRESS BAD MAC NOISE ======================
const originalConsoleError = console.error
console.error = function (...args) {
    const msg = args.join(' ')
    if (msg.includes('Bad MAC') || msg.includes('verifyMAC') || msg.includes('Failed to decrypt message') || msg.includes('session closed') || msg.includes('closed session')) {
        return
    }
    originalConsoleError.apply(console, args)
}

// ====================== STORE ======================
const store = require('./lib/lightweight_store')
store.readFromFile()
setInterval(() => store.writeToFile(), 30000)
setInterval(() => { if (global.gc) global.gc() }, 60000)

// ====================== MEMORY MONITOR ======================
setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 600) {
        console.log(chalk.bgRed.white(' ⚠️ MEMORY > 600MB → RESTARTING...'))
        process.exit(1)
    }
}, 60000)

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise(resolve => rl.question(text, resolve))

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
        // Piga Auto-Update Startup pekee
        autoUpdate()

        const { version } = await fetchLatestBaileysVersion()
        const { state, saveCreds } = await useMultiFileAuthState('./session')
        const msgRetryCounterCache = new NodeCache()

        printBox("INITIALIZING BOT", "Mickey Glitch ™ Starting...", chalk.bgMagenta, chalk.whiteBright)

        const XeonBotInc = makeWASocket({
            version,
            logger: pino({ level: 'fatal' }),
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

        // Pairing Code Logic
        if(!XeonBotInc.authState.creds.registered){
            printBox("PAIRING INAHITAJIKA", "Tayari ku-link bot", chalk.bgYellow, chalk.black)
            console.log(chalk.greenBright.bold("\nWeka namba ya simu (mfano: 255615858685):"))
            let phoneNumber = await question(chalk.cyan("→ "))
            let number = phoneNumber.replace(/[^0-9]/g,'')
            if(!number.startsWith('255')) number='255'+number
            console.log(chalk.cyan(`\n→ Pair Code: ${customPairCode}`))
            try{
                await delay(3000)
                let code = await XeonBotInc.requestPairingCode(number,customPairCode)
                printBox("PAIRING CODE YAKO", code || customPairCode, chalk.bgGreen, chalk.black.bold)
            }catch(err){ console.log(chalk.red('\n❌ Error: '+err.message)) }
        }

        // Handle Messages
        XeonBotInc.ev.on('messages.upsert', async chatUpdate=>{
            try{
                const mek = chatUpdate.messages?.[0]
                if(!mek) return
                if (mek.key?.remoteJid === 'status@broadcast') {
                    await handleStatus(XeonBotInc, chatUpdate);
                    return
                }
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

        // Connection Update
        XeonBotInc.ev.on('connection.update', async s=>{
            const { connection, lastDisconnect } = s
            if(connection==='open'){
                printBox("BOT CONNECTED", "✨ Online & Ready ✨", chalk.bgGreen, chalk.black)
                const botJid = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net'
                
                // Compact connection message
                const connectText = `🎉 *MICKEY GLITCH ONLINE* 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 *Status:* Ready
🤖 *Bot:* ${global.botname}
📅 *Date:* ${new Date().toLocaleDateString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
*Use .help to explore commands*`;

                try {
                    // 📸 Send image only (clean ad)
                    await XeonBotInc.sendMessage(botJid, {
                        image: { url: 'https://water-billing-292n.onrender.com/1761205727440.jpg' },
                        caption: connectText
                    });

                    // 🔘 Send buttons using gifted-btns
                    const buttonList = [
                        { displayText: '📋 HELP MENU', id: '.help' },
                        { displayText: '⚡ PING TEST', id: '.ping' },
                        { displayText: '❤️ ALIVE CHECK', id: '.alive' }
                    ];

                    await sendButtons(XeonBotInc, botJid, buttonList, {
                        title: '🎯 QUICK COMMANDS',
                        footer: 'Mickey Glitch Tech'
                    });

                } catch (e) {
                    // Fallback to simple text if image fails
                    console.log('Image send failed, using text fallback:', e.message);
                    await XeonBotInc.sendMessage(botJid, { text: connectText });
                }
            }
            if(connection==='close'){
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
                if(reason!==DisconnectReason.loggedOut){
                    setTimeout(()=>startXeonBotInc(),5000)
                }
            }
        })

        return XeonBotInc

    }catch(error){
        if (!error.message?.includes('Bad MAC')) console.log(chalk.red('Error: '+error.message))
        await delay(8000)
        startXeonBotInc()
    }
}

// Global Exception Handlers
process.on('uncaughtException',(error)=>{
    if (!error.message?.includes('Bad MAC')) originalConsoleError(chalk.bgRed.white(' ⚠️ EXCEPTION ⚠️ '), error.message)
})
process.on('unhandledRejection',(reason)=>{
    const msg = reason?.message || ''
    if (!msg.includes('Bad MAC')) originalConsoleError(chalk.bgYellow.white(' ⚠️ REJECTION ⚠️ '), reason)
})

startXeonBotInc()

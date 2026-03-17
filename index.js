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

// ====================== STORE ======================
const store = require('./lib/lightweight_store')
store.readFromFile()

setInterval(() => store.writeToFile(), 10000)
setInterval(() => { if (global.gc) global.gc() }, 30000)

// ====================== TEMP & MEMORY CLEANERS ======================
setInterval(() => {
    try {
        const tmpDir = './tmp'
        if(!fs.existsSync(tmpDir)) return
        fs.readdirSync(tmpDir).forEach(f => fs.unlinkSync(path.join(tmpDir,f)))
        console.log(chalk.blueBright('🧹 Temp media cleaned'))
    } catch {}
},1800000)

setInterval(()=>{
    const used = process.memoryUsage().rss / 1024 / 1024
    if(used>450){
        console.log(chalk.bgRed.white(' ⚠️ MEMORY ALERT ⚠️ RAM > 450MB → Restarting...'))
        process.exit(1)
    }
},20000)

// ====================== CONSOLE INPUT FIX ======================
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise(resolve => rl.question(text, resolve))

// ====================== BOT START ======================
async function startXeonBotInc(){
    try{
        const { version } = await fetchLatestBaileysVersion()
        const { state, saveCreds } = await useMultiFileAuthState('./session')
        const msgRetryCounterCache = new NodeCache()

        const XeonBotInc = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false, // FIXED: Removed deprecated warning
            mobile: false,
            browser: ["Ubuntu","Chrome","20.0.04"],
            auth:{
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({level:"fatal"}).child({level:"fatal"}))
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
            console.log(chalk.bgMagenta.white(' ⏳ PAIRING REQUIRED ⏳ '))

            // FIXED: Ensuring readline is open and ready
            let phoneNumber = await question(chalk.bgBlack(chalk.greenBright("Weka namba ya simu (mfano: 255615858685): ")))
            let number = phoneNumber.replace(/[^0-9]/g,'')
            if(!number.startsWith('255')) number='255'+number

            console.log(chalk.cyan(`\n→ Unatumia Custom Code: ${customPairCode}`))
            console.log(chalk.yellow(`→ Inatuma ombi la ku-pair kwa: ${number}...\n`))

            try{
                // Pairing delay to prevent connection issues
                await delay(3000)
                let code = await XeonBotInc.requestPairingCode(number, customPairCode)
                console.log(chalk.bgCyan.black(' 🔐 CUSTOM PAIRING CODE 🔐 '))
                console.log(chalk.white.bgMagenta.bold(' ' + (code || customPairCode) + ' '))
                console.log(chalk.yellow('→ Fungua WhatsApp > Linked Devices > Link with phone number'))
                console.log(chalk.yellow('→ Weka code hapo juu sasa.\n'))
            }catch(err){
                console.log(chalk.red('\n❌ Pair Error: '+err.message))
                console.log(chalk.yellow('Jaribu kufuta folder la session kisha anza upya.'))
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
            const { connection,lastDisconnect } = s
            if(connection==='open'){
                console.log(chalk.bgGreen.black(' ✨ CONNECTED ✨ '))

                const botJid = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net'
                const proCaption = `✨ *MICKEY GLITCH BOT* ✨\n🟢 *Online & Ready*\n📡 ${channelRD.name} | 💾 ${(process.memoryUsage().rss/1024/1024).toFixed(2)} MB\n🎯 All Systems Operational`

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
                    console.log(chalk.bgYellow.black(' 🔄 RECONNECT 🔄 '))
                    setTimeout(()=>startXeonBotInc(),5000)
                }else{
                    console.log(chalk.bgRed.black(' ❌ LOGGED OUT ❌ '))
                }
            }
        })

        return XeonBotInc

    }catch(error){
        console.log(chalk.red('Error: '+error.message))
        await delay(8000)
        startXeonBotInc()
    }
}

// ====================== PROCESS HANDLERS ======================
process.on('uncaughtException',(error)=>{
    console.error(chalk.bgRed.white(' ⚠️ UNCAUGHT EXCEPTION ⚠️ '))
    console.error(chalk.red(error.message))
})
process.on('unhandledRejection',(reason)=>{
    console.error(chalk.bgYellow.white(' ⚠️ UNHANDLED REJECTION ⚠️ '))
    console.error(reason)
})

// ====================== START BOT ======================
console.log(chalk.bgCyan.black(' 🤖 INITIALIZATION 🤖 '))
startXeonBotInc()

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

global.botname = "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™"
global.themeemoji = "•"
const phoneNumber = "255615858685"

const channelRD = {
  id: '120363398106360290@newsletter',
  name: '🅼🅸🅲🅺🅴🆈'
}

const fakeServerMsgId = () => Math.floor(Math.random() * 10000) + 100

// ====================== STORE ======================
const store = require('./lib/lightweight_store')
store.readFromFile()

setInterval(() => store.writeToFile(), 60000)

// reset store every 6 hours
setInterval(() => {
  try {
    fs.writeFileSync('./lib/store.json','{}')
    console.log('🧹 Store cleared')
  }catch{}
},21600000)

// ====================== SESSION CLEANER ======================
setInterval(() => {
  try {
    const sessionDir = './session'
    if(!fs.existsSync(sessionDir)) return

    const files = fs.readdirSync(sessionDir)

    files.forEach(file => {
      const filePath = path.join(sessionDir,file)
      const stat = fs.statSync(filePath)
      if(Date.now() - stat.mtimeMs > 3 * 24 * 60 * 60 * 1000){
        fs.unlinkSync(filePath)
        console.log('🧹 Deleted old session:',file)
      }
    })

  }catch{}
},3600000)

// ====================== TEMP CLEANER ======================
setInterval(() => {
  try {
    const tmpDir = './tmp'
    if(!fs.existsSync(tmpDir)) return
    const files = fs.readdirSync(tmpDir)
    files.forEach(file=>{
      fs.unlinkSync(path.join(tmpDir,file))
    })
    console.log('🧹 Temp media cleaned')
  }catch{}
},1800000)

// ====================== MEMORY CLEANER ======================
setInterval(()=>{
  if(global.gc){
    global.gc()
    console.log('♻️ Garbage collector executed')
  }
},60000)

// RAM protection
setInterval(()=>{
  const used = process.memoryUsage().rss / 1024 / 1024
  if(used > 450){
    console.log(chalk.bgRed.white(' ⚠️ MEMORY ALERT ⚠️ '), chalk.red('RAM > 450MB → Restarting...'))
    process.exit(1)
  }
},20000)

const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code")

const rl = process.stdin.isTTY ? readline.createInterface({
  input: process.stdin,
  output: process.stdout
}) : null

const question = (text) => {
  if (rl) return new Promise(resolve => rl.question(text, resolve))
  return Promise.resolve(phoneNumber)
}

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

  connectTimeoutMs:60000,
  keepAliveIntervalMs:10000,
  syncFullHistory:false,
  emitOwnEvents:false,
  shouldSyncHistoryMessage:()=>false,

  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
  },

  markOnlineOnConnect: true,

  msgRetryCounterCache,
  retryRequestDelayMs: 250,
  maxMsgRetryCount: 5,

  getMessage: async (key) => {
    let jid = jidNormalizedUser(key.remoteJid)
    let msg = await store.loadMessage(jid, key.id)
    return msg?.message || undefined
  }

})

XeonBotInc.ev.on('creds.update', saveCreds)
store.bind(XeonBotInc.ev)

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
  console.log(chalk.bgRed.black(' ⚠️ MSG ERROR ⚠️ '), chalk.red(err.message))
}
})

XeonBotInc.ev.on('call', async (call) => {
try {
  await handleAnticall(XeonBotInc, { call })
} catch (err) {
  console.log(chalk.bgRed.black(' ⚠️ CALL ERROR ⚠️ '), chalk.red(err.message))
}
})

// ====================== CUSTOM PAIRING SYSTEM ======================
if(pairingCode && !XeonBotInc.authState.creds.registered){

console.log(chalk.bgMagenta.white(' ⏳ PAIRING REQUIRED ⏳ '))
console.log(chalk.magenta('Tumia custom pairing code ku link bot'))

const customPairCode = "MICKDADY"

console.log('')
console.log(chalk.bgCyan.black(' 🔐 CUSTOM PAIRING CODE 🔐 '))
console.log(chalk.cyan.bold(' ' + customPairCode))
console.log(chalk.yellow('→ Fungua WhatsApp kwenye simu yako'))
console.log(chalk.yellow('→ Linked Devices → Link with phone number'))
console.log(chalk.yellow('→ Weka code: ') + chalk.green.bold(customPairCode))
console.log('')

let number = (global.phoneNumber || phoneNumber)
.replace(/[^0-9]/g,'')

if(!number.startsWith('255')){
  number = '255' + number
}

setTimeout(async()=>{
  try{
    console.log(chalk.yellow('→ Inajaribu ku-pair na code: ') + chalk.cyan.bold(customPairCode))
    await XeonBotInc.requestPairingCode(number, customPairCode)
  }catch(err){
    console.log(chalk.bgRed.black(' ❌ PAIR ERROR ❌ '))
    console.log(chalk.red(err.message))
  }
},3000)

}

// ====================== CONNECTION UPDATE ======================
XeonBotInc.ev.on('connection.update', async (s) => {

const { connection, lastDisconnect } = s

if (connection === 'open') {

console.log(chalk.bgGreen.black(' ✨ CONNECTED ✨ '), chalk.green('Bot Online & Ready!'))

const botJid = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net'

const proCaption = `✨ *MICKEY GLITCH BOT* ✨
🟢 *Online & Ready*
📡 ${channelRD.name} | 💾 ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB
🎯 All Systems Operational`.trim()

await XeonBotInc.sendMessage(botJid,{
  text: proCaption
})

try{
  await XeonBotInc.newsletterFollow(channelRD.id)
  console.log(chalk.bgBlue.black(' 📢 CHANNEL 📢 '), chalk.blue(`Auto-following: ${channelRD.name}`))
}catch(err){
  console.log(chalk.bgYellow.black(' ⚠️ FOLLOW ERROR ⚠️ '), chalk.yellow(err.message))
}

}

if(connection === 'close'){

const reason = new Boom(lastDisconnect?.error)?.output?.statusCode

if(reason !== DisconnectReason.loggedOut){
  console.log(chalk.bgYellow.black(' 🔄 RECONNECT 🔄 '), chalk.yellow('Attempting reconnect in 5 seconds...'))
  setTimeout(()=>startXeonBotInc(),5000)
}else{
  console.log(chalk.bgRed.black(' ❌ LOGGED OUT ❌ '), chalk.red('Bot logged out'))
}

}

})

return XeonBotInc

}catch(error){
console.log(chalk.bgRed.white(' ❌ STARTUP ERROR ❌ '),chalk.red(error.message))
console.log(chalk.yellow('Retrying in 8 seconds...'))
await delay(8000)
startXeonBotInc()
}

}

// ====================== PROCESS ERROR HANDLERS ======================
process.on('uncaughtException', (error) => {
  console.error(chalk.bgRed.white('  ⚠️  UNCAUGHT EXCEPTION  ⚠️  '))
  console.error(chalk.red(error.message))
})

process.on('unhandledRejection', (reason) => {
  console.error(chalk.bgYellow.white('  ⚠️  UNHANDLED REJECTION  ⚠️  '))
  console.error(reason)
})

// ====================== START BOT ======================
console.log(chalk.bgCyan.black('  🤖  INITIALIZATION  🤖  '), chalk.cyan('Starting bot...'))
startXeonBotInc()
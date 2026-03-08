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

const store = require('./lib/lightweight_store')
store.readFromFile()
const settings = require('./settings')

setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

setInterval(() => { if (global.gc) global.gc() }, 30000)

setInterval(() => {
const used = process.memoryUsage().rss / 1024 / 1024
if (used > 600) {
console.log(chalk.bgRed.white('  ⚠️ MEMORY ALERT ⚠️ '), chalk.red('RAM > 600MB → Restarting...'))
process.exit(1)
}
}, 15000)

const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code")

const rl = process.stdin.isTTY ? readline.createInterface({
input: process.stdin,
output: process.stdout
}) : null

const question = (text) => {
if (rl) return new Promise(resolve => rl.question(text, resolve))
return Promise.resolve(settings.ownerNumber || phoneNumber)
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
text: proCaption,
contextInfo:{
isForwarded:true,
forwardedNewsletterMessageInfo:{
newsletterJid:channelRD.id,
newsletterName:channelRD.name,
serverMessageId:fakeServerMsgId()
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

try{
await XeonBotInc.newsletterFollow(channelRD.id)
console.log(chalk.bgBlue.black(' 📢 CHANNEL 📢 '), chalk.blue(`Auto-following: ${channelRD.name}`))
}catch(err){
console.log(chalk.bgYellow.black(' ⚠️ FOLLOW ERROR ⚠️ '), chalk.yellow(err.message))
}

console.log(chalk.bgGreen.black(' ✅ STARTUP ✅ '), chalk.green('Bot fully operational'))
console.log('')
}

if(connection === 'close'){

const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut

if(shouldReconnect){
console.log(chalk.bgYellow.black(' 🔄 RECONNECT 🔄 '), chalk.yellow('Attempting to reconnect in 5 seconds...'))
setTimeout(() => startXeonBotInc(), 5000)
} else {
console.log(chalk.bgRed.black(' ❌ LOGGED OUT ❌ '), chalk.red('Bot logged out properly'))
}

}

})

if(!XeonBotInc.originalSendMessage){
XeonBotInc.originalSendMessage = XeonBotInc.sendMessage.bind(XeonBotInc)
}

XeonBotInc.sendMessage = async (jid,content,options={})=>{

try{

const originalContext = options?.contextInfo || {}

const skipFakeForward =
jid?.includes('@newsletter') ||
jid === 'status@broadcast' ||
content?.poll ||
content?.buttonsMessage ||
content?.templateMessage ||
content?.listMessage ||
options?.forward ||
originalContext?.forwardedNewsletterMessageInfo

if(skipFakeForward){
return XeonBotInc.originalSendMessage(jid,content,options)
}

const randomDelay = 400 + Math.floor(Math.random()*1100)
await delay(randomDelay)

const fakeForwardContext = {
...originalContext,
isForwarded:true,
forwardingScore:999,
forwardedNewsletterMessageInfo:{
newsletterJid:channelRD.id,
newsletterName:channelRD.name,
serverMessageId:fakeServerMsgId()
}
}

if(originalContext.quotedMessage){
fakeForwardContext.quotedMessage = originalContext.quotedMessage
}

if(originalContext.mentionedJid){
fakeForwardContext.mentionedJid = originalContext.mentionedJid
}

options.contextInfo = fakeForwardContext

return XeonBotInc.originalSendMessage(jid,content,options)

}catch(err){

console.log(chalk.bgRed.black(' ⚠️ SEND ERROR ⚠️ '),chalk.red(err.message))

}

}

if(pairingCode && !XeonBotInc.authState.creds.registered){

console.log(chalk.bgMagenta.white(' ⏳ PAIRING REQUIRED ⏳ '))
console.log(chalk.magenta('Tumia code maalum ili ku-pair bot'))

let number = (global.phoneNumber || await question(chalk.bgBlack(chalk.greenBright(`Weka namba ya simu (bila + au 0 mwanzo): `))))
.replace(/[^0-9]/g,'')

if(!number.startsWith('255')){
number = '255' + number
}

setTimeout(async()=>{

try{

const customPairCode = "MICKDADY"

console.log(chalk.yellow('→ Inajaribu ku-pair na code: ')+chalk.cyan.bold(customPairCode))

const code = await XeonBotInc.requestPairingCode(number,customPairCode)

console.log('')
console.log(chalk.bgCyan.black(' 🔐 CUSTOM PAIRING CODE 🔐 '))
console.log(chalk.cyan.bold(' '+customPairCode))
console.log(chalk.yellow('→ Fungua WhatsApp kwenye simu yako'))
console.log(chalk.yellow('→ Linked Devices → Link with phone number'))
console.log(chalk.yellow('→ Weka code: ')+chalk.green.bold(customPairCode))
console.log('')

}catch(err){

console.log(chalk.bgRed.black(' ❌ ERROR ❌ '))
console.log(chalk.red(err.message || 'Tatizo la ku-pair'))

}

},3000)

}

return XeonBotInc

}catch(error){

console.log(chalk.bgRed.white(' ❌ STARTUP ERROR ❌ '),chalk.red(error.message))
console.log(chalk.yellow('Inajaribu tena baada ya sekunde 8...'))
await delay(8000)
startXeonBotInc()

}

}

// ═══════════════════════════════════════════════════════════════
// PROCESS-LEVEL ERROR HANDLERS
// ═══════════════════════════════════════════════════════════════

process.on('uncaughtException', (error) => {
    console.error(chalk.bgRed.white('  ⚠️  UNCAUGHT EXCEPTION  ⚠️  '))
    console.error(chalk.red(error.message))
    console.error(error.stack)
})

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.bgYellow.white('  ⚠️  UNHANDLED REJECTION  ⚠️  '))
    console.error(chalk.yellow('Reason:', reason))
})

// ═══════════════════════════════════════════════════════════════
// START BOT
// ═══════════════════════════════════════════════════════════════

console.log(chalk.bgCyan.black('  🤖  INITIALIZATION  🤖  '), chalk.cyan('Starting bot...'))
startXeonBotInc()
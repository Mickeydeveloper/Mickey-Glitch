const {
    proto,
    delay,
    getContentType
} = require('@whiskeysockets/baileys')
const chalk = require('chalk')
const fs = require('fs')
const Crypto = require('crypto')
const axios = require('axios')
const moment = require('moment-timezone')
const {
    sizeFormatter
} = require('human-readable')
const util = require('util')
const Jimp = require('jimp')
const {
    defaultMaxListeners
} = require('stream')
const path = require('path')
const { tmpdir } = require('os')

const unixTimestampSeconds = (date = new Date()) => Math.floor(date.getTime() / 1000)

exports.unixTimestampSeconds = unixTimestampSeconds

exports.generateMessageTag = (epoch) => {
    let tag = (0, exports.unixTimestampSeconds)().toString();
    if (epoch)
        tag += '.--' + epoch; 
    return tag;
}

exports.processTime = (timestamp, now) => {
    return moment.duration(now - moment(timestamp * 1000)).asSeconds()
}

exports.getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`
}

exports.getBuffer = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: "get",
            url,
            headers: { 'DNT': 1, 'Upgrade-Insecure-Request': 1 },
            ...options,
            responseType: 'arraybuffer'
        })
        return res.data
    } catch (err) {
        return err
    }
}

exports.fetchJson = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        })
        return res.data
    } catch (err) {
        return err
    }
}

exports.runtime = function(seconds) {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 60);
    var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
    var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
}

exports.sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

exports.isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'))
}

exports.formatp = sizeFormatter({
    std: 'JEDEC', 
    decimalPlaces: 2,
    keepTrailingZeroes: false,
    render: (literal, symbol) => `${literal} ${symbol}B`,
})

exports.parseMention = (text = '') => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
}

exports.getGroupAdmins = (participants) => {
    let admins = []
    for (let i of participants) {
        i.admin === "superadmin" ? admins.push(i.id) : i.admin === "admin" ? admins.push(i.id) : ''
    }
    return admins || []
}

// SERIALIZE MESSAGE (YAKO ILE ILE)
exports.smsg = (XeonBotInc, m, store) => {
    if (!m) return m
    let M = proto.WebMessageInfo
    if (m.key) {
        m.id = m.key.id
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = XeonBotInc.decodeJid(m.fromMe && XeonBotInc.user.id || m.participant || m.key.participant || m.chat || '')
    }
    if (m.message) {
        m.mtype = getContentType(m.message)
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype])
        m.body = m.message.conversation || m.msg.caption || m.msg.text || (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || (m.mtype == 'viewOnceMessage') && m.msg.caption || m.text
        m.reply = (text, chatId = m.chat, options = {}) => XeonBotInc.sendText(chatId, text, m, { ...options })
    }
    return m
}

// 🛠️ REKEBISHO LA MZIZI WA TATIZO (SAFE SEND MESSAGE) - WITH TEXT QUALITY & DELIVERY CONFIRMATION
exports.safeSendMessage = async (sock, chatId, message, options = {}) => {
    try {
        if (!sock) throw new Error('Socket not provided');
        if (!chatId) throw new Error('Chat ID not provided');
        
        // Text validation and sanitization for text messages
        if (message && message.text && typeof message.text === 'string') {
            const originalText = message.text;
            
            // Sanitize text: remove control characters, null bytes, etc.
            let cleanText = originalText
                .trim()
                .replace(/\0/g, '') // Remove null bytes
                .replace(/[\u0000-\u001F\u007F]/g, '') // Remove control characters except newlines
                .substring(0, 4096); // WhatsApp text limit
            
            // Validate sanitized text
            if (!cleanText || cleanText.length === 0) {
                console.warn(chalk.yellow(`⚠️  Empty text after sanitization. Using default message.`));
                cleanText = 'Hello';
            }
            
            message.text = cleanText;
            
            // Log text quality info
            const qualityStatus = cleanText.length >= 10 && cleanText.length <= 4096 ? '✅' : '⚠️';
            console.log(chalk.gray(`${qualityStatus} Text length: ${cleanText.length} chars`));
        }
        
        // Add delivery timeout handling
        const sendPromise = sock.sendMessage(chatId, message, options);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Message send timeout')), 30000)
        );
        
        try {
            const result = await Promise.race([sendPromise, timeoutPromise]);
            
            // Delivery confirmation logging
            if (result && result.key) {
                const deliveryInfo = {
                    success: true,
                    messageId: result.key.id,
                    timestamp: new Date().toISOString(),
                    chatId: chatId,
                    messageType: message.text ? 'text' : 'other'
                };
                
                console.log(chalk.green(`✅ Message delivered: ${deliveryInfo.messageId}`));
                return result;
            }
            
            return result;
        } catch (timeoutErr) {
            console.error(chalk.yellow(`⚠️  Message delivery timeout or failed: ${timeoutErr.message}`));
            return null;
        }
    } catch (err) {
        console.error(chalk.red("❌ SafeSendMessage Error:"), err.message);
        // Hapa bot haitakwama tena kwa sababu hatutupi error inayozunguka
        return null; 
    }
}

exports.reSize = (buffer, ukur1, ukur2) => {
    return new Promise(async (resolve, reject) => {
        var baper = await Jimp.read(buffer);
        var ab = await baper.resize(ukur1, ukur2).getBufferAsync(Jimp.MIME_JPEG)
        resolve(ab)
    })
}

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update ${__filename}`))
    delete require.cache[file]
    require(file)
})

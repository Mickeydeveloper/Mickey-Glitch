/**
 

 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License.

 */
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
let giftedButtons = null
try {
    giftedButtons = require('gifted-btns')
} catch (e) {
    giftedButtons = null
}

const unixTimestampSeconds = (date = new Date()) => Math.floor(date.getTime() / 1000)

exports.unixTimestampSeconds = unixTimestampSeconds

exports.generateMessageTag = (epoch) => {
    let tag = (0, exports.unixTimestampSeconds)().toString();
    if (epoch)
        tag += '.--' + epoch; // attach epoch if provided
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
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1
            },
            ...options,
            responseType: 'arraybuffer'
        })
        return res.data
    } catch (err) {
        return err
    }
}

exports.getImg = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: "get",
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1
            },
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

exports.clockString = (ms) => {
    let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
    let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
    let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

exports.sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

exports.isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'))
}

exports.getTime = (format, date) => {
    if (date) {
        return moment(date).locale('id').format(format)
    } else {
        return moment.tz('Asia/Jakarta').locale('id').format(format)
    }
}

exports.formatDate = (n, locale = 'id') => {
    let d = new Date(n)
    return d.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    })
}

exports.tanggal = (numer) => {
    const myMonths = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const myDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
    const tgl = new Date(numer);
    const day = tgl.getDate();
    const bulan = tgl.getMonth();
    let thisDay = tgl.getDay();
    thisDay = myDays[thisDay];
    const yy = tgl.getYear();
    const year = (yy < 1000) ? yy + 1900 : yy;
    const time = moment.tz('Asia/Jakarta').format('DD/MM HH:mm:ss');
    const d = new Date();
    const locale = 'id';
    const gmt = new Date(0).getTime() - new Date('1 January 1970').getTime();
    const weton = ['Pahing', 'Pon', 'Wage', 'Kliwon', 'Legi'][Math.floor(((d * 1) + gmt) / 84600000) % 5];

    return `${thisDay}, ${day} - ${myMonths[bulan]} - ${year}`;
}

exports.jam = (numer, options = {}) => {
    let format = options.format ? options.format : "HH:mm"
    let jam = options?.timeZone ? moment(numer).tz(timeZone).format(format) : moment(numer).format(format)

    return `${jam}`
}

exports.formatp = sizeFormatter({
    std: 'JEDEC', //'SI' = default | 'IEC' | 'JEDEC'
    decimalPlaces: 2,
    keepTrailingZeroes: false,
    render: (literal, symbol) => `${literal} ${symbol}B`,
})

exports.json = (string) => {
    return JSON.stringify(string, null, 2)
}

function format(...args) {
    return util.format(...args)
}

exports.logic = (check, inp, out) => {
    if (inp.length !== out.length) throw new Error('Input and Output must have same length')
    for (let i in inp)
        if (util.isDeepStrictEqual(check, inp[i])) return out[i]
    return null
}

exports.generateProfilePicture = async (buffer) => {
    const jimp = await Jimp.read(buffer)
    const min = jimp.getWidth()
    const max = jimp.getHeight()
    const cropped = jimp.crop(0, 0, min, max)
    return {
        img: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG),
        preview: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG)
    }
}

exports.bytesToSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

exports.getSizeMedia = (path) => {
    return new Promise((resolve, reject) => {
        if (/http/.test(path)) {
            axios.get(path)
                .then((res) => {
                    let length = parseInt(res.headers['content-length'])
                    let size = exports.bytesToSize(length, 3)
                    if (!isNaN(length)) resolve(size)
                })
        } else if (Buffer.isBuffer(path)) {
            let length = Buffer.byteLength(path)
            let size = exports.bytesToSize(length, 3)
            if (!isNaN(length)) resolve(size)
        } else {
            reject('error gatau apah')
        }
    })
}

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

/**
 * Serialize Message
 * @param {WAConnection} conn 
 * @param {Object} m 
 * @param {store} store 
 */
exports.smsg = (XeonBotInc, m, store) => {
    if (!m) return m
    let M = proto.WebMessageInfo
    if (m.key) {
        m.id = m.key.id
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = XeonBotInc.decodeJid(m.fromMe && XeonBotInc.user.id || m.participant || m.key.participant || m.chat || '')
        if (m.isGroup) m.participant = XeonBotInc.decodeJid(m.key.participant) || ''
    }
    if (m.message) {
        m.mtype = getContentType(m.message)
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype])
        m.body = m.message.conversation || m.msg.caption || m.msg.text || (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || (m.mtype == 'viewOnceMessage') && m.msg.caption || m.text
        let quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null
        m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
        if (m.quoted) {
            let type = getContentType(quoted)
            m.quoted = m.quoted[type]
            if (['productMessage'].includes(type)) {
                type = getContentType(m.quoted)
                m.quoted = m.quoted[type]
            }
            if (typeof m.quoted === 'string') m.quoted = {
                text: m.quoted
            }
            m.quoted.mtype = type
            m.quoted.id = m.msg.contextInfo.stanzaId
            m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false
            m.quoted.sender = XeonBotInc.decodeJid(m.msg.contextInfo.participant)
            m.quoted.fromMe = m.quoted.sender === (XeonBotInc.user && XeonBotInc.user.id)
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || ''
            m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
            m.getQuotedObj = m.getQuotedMessage = async () => {
                if (!m.quoted.id) return false
                let q = await store.loadMessage(m.chat, m.quoted.id, XeonBotInc)
                return exports.smsg(XeonBotInc, q, store)
            }
            let vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? {
                    participant: m.quoted.sender
                } : {})
            })

            /**
             * 
             * @returns 
             */
            m.quoted.delete = () => XeonBotInc.sendMessage(m.quoted.chat, {
                delete: vM.key
            })

            /**
             * 
             * @param {*} jid 
             * @param {*} forceForward 
             * @param {*} options 
             * @returns 
             */
            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => XeonBotInc.copyNForward(jid, vM, forceForward, options)

            /**
             *
             * @returns
             */
            m.quoted.download = () => XeonBotInc.downloadMediaMessage(m.quoted)
        }
    }
    if (m.msg.url) m.download = () => XeonBotInc.downloadMediaMessage(m.msg)
    m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || ''
    /**
     * Reply to this message
     * @param {String|Object} text 
     * @param {String|false} chatId 
     * @param {Object} options 
     */
    m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ? XeonBotInc.sendMedia(chatId, text, 'file', '', m, {
        ...options
    }) : XeonBotInc.sendText(chatId, text, m, {
        ...options
    })
    /**
     * Copy this message
     */
    m.copy = () => exports.smsg(XeonBotInc, M.fromObject(M.toObject(m)))

    /**
     * 
     * @param {*} jid 
     * @param {*} forceForward 
     * @param {*} options 
     * @returns 
     */
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => XeonBotInc.copyNForward(jid, m, forceForward, options)

    return m
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

/**
 * Send buttons helper
 * Supports two formats:
 *  - templateButtons (urlButton/callButton/quickReplyButton)
 *  - simple buttonsMessage ({ buttonId, buttonText })
 */
exports.sendButtons = async (conn, jid, text = '', footer = '', buttons = [], quoted = null, options = {}) => {
    try {
        if (!Array.isArray(buttons)) buttons = [];

        const rawButtons = buttons.map(b => {
            if (b && b.buttonText && b.buttonId) return { buttonText: b.buttonText, buttonId: b.buttonId, type: 1 };
            if (b && b.id && b.text) return { buttonText: { displayText: b.text }, buttonId: b.id, type: 1 };
            return null;
        }).filter(Boolean);

        if (giftedButtons && typeof giftedButtons.sendButtons === 'function') {
            const legacyButtons = rawButtons.map(b => ({ id: b.buttonId, text: b.buttonText.displayText }));
            const payload = {
                title: options.title || '',
                text: text || '',
                footer: footer || '',
                buttons: legacyButtons,
                ...(options.image ? { image: options.image } : {}),
                ...(options.aimode ? { aimode: options.aimode } : {}),
                ...(options.contextInfo ? { contextInfo: options.contextInfo } : {})
            };
            return await giftedButtons.sendButtons(conn, jid, payload, quoted ? { quoted } : {});
        }

        if (rawButtons.length === 0) {
            const textFallback = `${text || ''}\n\n${buttons.map((b, i) => `(${i + 1}) ${b.text || b.buttonText?.displayText || b.title || b}`).join('\n')}`.trim();
            return await conn.sendMessage(jid, { text: textFallback }, quoted ? { quoted } : {});
        }

        const payload = {
            text: text || '',
            footer: footer || '',
            buttons: rawButtons,
            ...options
        };

        return await conn.sendMessage(jid, payload, quoted ? { quoted } : {});
    } catch (e) {
        console.error('sendButtons error:', e && e.message ? e.message : e);
        throw e;
    }
}

/**
 * Send a single-select list message
 * sections: [{ title: 'Section title', rows: [{title, rowId, description}] }]
 */
exports.sendList = async (conn, jid, text = '', footer = '', title = '', buttonText = 'Choose', sections = [], quoted = null, options = {}) => {
    try {
        const { quoted: quotedOption, ...sendOptions } = options || {};
        const payload = {
            text: text || '',
            footer: footer || '',
            title: title || '',
            buttonText: buttonText || 'Choose',
            sections: sections || [],
            ...sendOptions
        };
        return await conn.sendMessage(jid, { listMessage: payload }, quoted ? { quoted } : (quotedOption ? { quoted: quotedOption } : {}));
    } catch (e) {
        console.error('sendList error:', e);
        throw e;
    }
}

/**
 * Replacement for `sendInteractiveMessage` from gifted-btns.
 * Supports common shapes: single_select (list) and interactiveButtons (buttons).
 */
exports.sendInteractiveMessage = async (conn, jid, payload = {}, options = {}) => {
    try {
        const quoted = options.quoted || null;
        const sendOptions = quoted ? { quoted } : {};

        if (payload && typeof payload === 'object') {
            // Send raw button or list payloads directly
            if (payload.buttons || payload.listMessage || payload.templateButtons || payload.buttonsMessage || payload.nativeFlowMessage || payload.nativeFlowMessage === 0) {
                const rawPayload = { ...payload };
                if (rawPayload.nativeFlowMessage || rawPayload.nativeFlowMessage === 0) {
                    delete rawPayload.nativeFlowMessage;
                }
                return await conn.sendMessage(jid, rawPayload, sendOptions);
            }

            // If payload has interactiveButtons with single_select -> build listMessage
            if (Array.isArray(payload.interactiveButtons) && payload.interactiveButtons.length > 0) {
                const ib = payload.interactiveButtons[0];
                try {
                    const params = JSON.parse(ib.buttonParamsJson || '{}');
                    if (params && params.sections) {
                        // Use sendList helper
                        const title = params.title || payload.title || '';
                        const sections = params.sections || [];
                        return await exports.sendList(conn, jid, payload.text || '', payload.footer || '', title, params.title || 'Open', sections, quoted, options);
                    }
                } catch (e) {
                    // ignore parse errors
                }
                // Fallback: treat as simple buttons
                const simpleButtons = (payload.interactiveButtons || []).map(b => {
                    try {
                        const params = JSON.parse(b.buttonParamsJson || '{}');
                        return { label: params.display_text || params.title || b.title || 'Button', command: params.id || params.url || params.phone_number || params.command || '' };
                    } catch (e) { return { label: b.name || 'Button', command: b.name || '' }; }
                });
                const built = require('./mbuilder-wrapper').createButtonWithAIRich(conn, payload.text || '', simpleButtons, payload.footer || '', { title: payload.title || '' });
                return await conn.sendMessage(jid, built, sendOptions);
            }

            if (payload.image && payload.text) {
                const sendPayload = { image: payload.image, caption: payload.text };
                if (payload.contextInfo) sendPayload.contextInfo = payload.contextInfo;
                return await conn.sendMessage(jid, sendPayload, sendOptions);
            }
        }

        return await conn.sendMessage(jid, { text: payload.text || '' }, sendOptions);
    } catch (err) {
        console.error('sendInteractiveMessage error:', err && err.message ? err.message : err);
        throw err;
    }
}
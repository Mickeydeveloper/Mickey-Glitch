'use strict';
const VERSION = '4.6';
const { generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const crypto = require('crypto');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough, Readable } = require('stream');

// Minimal Toolkit used by the builder
class Toolkit {
    static async resize(buffer, x, y, fit = 'cover') {
        return await sharp(buffer).resize(x, y, { fit, position: 'center' }).png().toBuffer();
    }
    static async fetchBuffer(url, options = {}, { silent = true } = {}) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return Buffer.from(await res.arrayBuffer());
        } catch (e) {
            if (silent) return Buffer.alloc(0);
            throw e;
        }
    }
    static async resolveMedia(_client, path, mediaType = 'image') {
        if (!path) return '';
        const media = await prepareWAMessageMedia({ [mediaType]: Buffer.isBuffer(path) ? path : { url: path } }, { upload: _client.waUploadToServer, jid: '@newsletter' });
        return Object.values(media)[0]?.url || '';
    }
}

// Simple Button builders using existing logic
class ButtonRowBuilder { constructor(){ this.buttons = []; } button(label, command){ this.buttons.push({ label, command }); return this; } }

class Button {
    constructor(sock){ if(!sock) throw new Error('Socket is required'); this.sock = sock; this._text = ''; this._footer = ''; this._buttons = []; }
    text(t){ this._text = t; return this; }
    footer(f){ this._footer = f; return this; }
    button(label, command){ this._buttons.push({ label, command }); return this; }
    row(fn){ const rb = new ButtonRowBuilder(); fn(rb); this._buttons.push(...rb.buttons); return this; }
    build(){ return { interactiveMessage: { body: { text: this._text }, footer: { text: this._footer }, nativeFlowMessage: { buttons: this._buttons.map((b,i)=>({ buttonId: `cmd_${i}_${b.command||''}`, buttonText:{ displayText: b.label }, type:1 })) } } }; }
    async send(jid, options = {}){ const msg = this.build(); return this.sock.relayMessage(jid, msg, options); }
}

class ButtonV2 extends Button {
    constructor(sock){ super(sock); this._thumbnail = null; }
    addButton(displayText = '', buttonId = crypto.randomUUID()){ this._buttons.push({ buttonId, buttonText: { displayText }, type: 1 }); return this; }
    addRawButton(obj){ this._buttons.push(obj); return this; }
    setThumbnail(path){ this._thumbnail = path; return this; }
    build(){ return { buttonsMessage: { contentText: this._text, footerText: this._footer, contextInfo: {}, buttons: this._buttons } }; }
}

class Carousel {
    constructor(sock){ if(!sock) throw new Error('Socket is required'); this.sock = sock; this._cards = []; }
    addCard(card){ this._cards.push(card); return this; }
    build(jid, options = {}){ return { interactiveMessage: { body: { text: '' }, footer: { text: '' }, carouselMessage: { cards: this._cards } } }; }
    async send(jid, options = {}){ const msg = this.build(jid, options); return this.sock.relayMessage(jid, msg, options); }
}

class AIRich {
    constructor(sock){ if(!sock) throw new Error('Socket is required'); this.sock = sock; this._title = ''; this._footer = ''; this._submessages = []; this._sections = []; this._contextInfo = {}; this._extraPayload = {}; }
    setTitle(t){ this._title = t; return this; }
    setFooter(f){ this._footer = f; return this; }
    addText(text){ this._submessages.push({ messageType: 2, messageText: text }); this._sections.push({ type: 'Text', text }); return this; }
    addSuggest(s){ const items = Array.isArray(s) ? s.map(x=>({ prompt_text:x, prompt_type: 'SUGGESTED_PROMPT'})) : [{ prompt_text: s, prompt_type: 'SUGGESTED_PROMPT' }]; this._sections.push({ type: 'Suggest', items }); return this; }
    addTip(t){ this._submessages.push({ messageType: 2, messageText: t }); this._sections.push({ type: 'Tip', text: t }); return this; }
    addImage(u){ this._submessages.push({ messageType:1, gridImageMetadata: { imageUrls: [{ imagePreviewUrl: u, imageHighResUrl: u, sourceUrl: u }] } }); this._sections.push({ type: 'Image', url: u }); return this; }
    addVideo(u){ this._submessages.push({ messageType:2, messageText: '[VIDEO]' }); this._sections.push({ type: 'Video', url: u }); return this; }
    setContextInfo(obj){ this._contextInfo = obj; return this; }
    addPayload(obj){ Object.assign(this._extraPayload, obj); return this; }
    async build({ forwarded = true, notification = false, includesUnifiedResponse = true, includesSubmessages = true, quoted } = {}){
        const forward = forwarded ? { forwardingScore:1, isForwarded:true, forwardedAiBotMessageInfo:{botJid:'0@bot'}, forwardOrigin:4 } : {};
        const notif = notification ? { sessionTransparencyMetadata: { disclaimerText: '~', hcaId: `hca_${Date.now()}`, sessionTransparencyType:1 } } : {};
        const sections = [...this._sections];
        const unified = includesUnifiedResponse ? Buffer.from(JSON.stringify({ response_id: crypto.randomUUID(), sections })).toString('base64') : '';
        return {
            messageContextInfo: { deviceListMetadata:{}, deviceListMetadataVersion:2, botMetadata:{ messageDisclaimerText: this._title, richResponseSourcesMetadata:{ sources: [] }, ...notif } },
            ...this._extraPayload,
            botForwardedMessage: { message: { richResponseMessage: { messageType:1, submessages: includesSubmessages ? this._submessages : [], unifiedResponse: { data: unified }, contextInfo: { ...forward, ...this._contextInfo } } } }
        };
    }
    async send(jid, options = {}){ const msg = await this.build(options); return await this.sock.relayMessage(jid, msg, options); }
}

module.exports = { VERSION, Button, ButtonV2, Carousel, AIRich, Toolkit };
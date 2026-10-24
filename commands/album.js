'use strict';

const isOwnerOrSudo = require('../lib/isOwner');

class Album {
    constructor(client) {
        if (!client || (typeof client.sendAlbumMessage !== 'function' && typeof client.sendMessage !== 'function')) {
            throw new Error('Socket is required');
        }
        this.client = client;
        this.items = [];
        this.caption = '';
        this.delayMs = undefined;
        this.continueOnError = false;
    }

    static get MAX_ITEMS() { return 10; }

    push(kind, source, caption, extra = {}) {
        if (!source) throw new TypeError(`add${kind === 'image' ? 'Image' : 'Video'}(source) requires a URL or Buffer`);
        if (this.items.length >= Album.MAX_ITEMS) throw new RangeError(`An album holds at most ${Album.MAX_ITEMS} media`);
        this.items.push({
            [kind]: source,
            ...(caption ? { caption: String(caption) } : {}),
            ...extra
        });
        return this;
    }

    addImage(source, caption, extra = {}) {
        return this.push('image', source, caption, extra);
    }

    addVideo(source, caption, extra = {}) {
        return this.push('video', source, caption, extra);
    }

    addMany(items) {
        if (!Array.isArray(items) || !items.length) throw new TypeError('addMany(items) requires media items');
        for (const item of items) {
            if (item?.image) this.push('image', item.image, item.caption, item.extra);
            else if (item?.video) this.push('video', item.video, item.caption, item.extra);
            else throw new TypeError('addMany(): every item needs image or video');
        }
        return this;
    }

    setCaption(caption) {
        if (typeof caption !== 'string') throw new TypeError('Caption must be a string');
        this.caption = caption;
        return this;
    }

    setDelay(ms) {
        if (!Number.isFinite(ms) || ms < 0) throw new TypeError('setDelay(ms) requires a non-negative number');
        this.delayMs = ms;
        return this;
    }

    setContinueOnError(enabled = true) {
        this.continueOnError = !!enabled;
        return this;
    }

    build() {
        if (this.items.length < 2) throw new Error('An album needs at least 2 media items');
        return { album: [...this.items], ...(this.caption ? { caption: this.caption } : {}) };
    }

    async send(jid, options = {}) {
        const payload = this.build();
        const opts = { ...(this.delayMs !== undefined ? { delayMs: this.delayMs } : {}), ...options };

        if (typeof this.client.sendAlbumMessage === 'function') {
            return this.client.sendAlbumMessage(jid, payload.album, {
                ...(payload.caption ? { caption: payload.caption } : {}),
                ...(this.continueOnError ? { continueOnError: true } : {}),
                ...opts
            });
        }

        const albumResult = [];
        for (const item of payload.album) {
            try {
                const content = { ...item };
                const result = await this.client.sendMessage(jid, content, opts);
                albumResult.push(result);
            } catch (error) {
                if (!this.continueOnError) throw error;
            }
        }
        return { albumItems: albumResult };
    }
}

function getArgs(args) {
    if (Array.isArray(args)) return args.map(String).filter(Boolean);
    if (typeof args === 'string') return args.trim().split(/\s+/).filter(Boolean);
    return [];
}

function mediaKind(url) {
    const path = new URL(url).pathname.toLowerCase();
    if (/\.(mp4|mkv|mov|webm)$/i.test(path)) return 'video';
    if (/\.(jpe?g|png|gif|webp)$/i.test(path)) return 'image';
    return null;
}

async function albumCommand(sock, chatId, message, args = []) {
    const senderId = message?.key?.participant || message?.key?.remoteJid;
    const allowed = message?.key?.fromMe || await isOwnerOrSudo(senderId, sock, chatId);
    if (!allowed) {
        await sock.sendMessage(chatId, {
            text: '❌ Album command inapatikana kwa owner/sudo pekee.'
        }, { quoted: message });
        return;
    }

    const parts = getArgs(args);
    if (parts.length < 2) {
        await sock.sendMessage(chatId, {
            text: '📚 *Album Command*\n\nUsage:\n.album <image/video-url> <image/video-url> [more urls]\n\nMaximum 10 items.\nExample:\n.album https://site/a.jpg https://site/b.mp4'
        }, { quoted: message });
        return;
    }

    const album = new Album(sock).setContinueOnError(true);
    const invalid = [];

    for (const source of parts.slice(0, Album.MAX_ITEMS)) {
        try {
            const kind = mediaKind(source);
            if (!kind) {
                invalid.push(source);
                continue;
            }
            album[kind === 'image' ? 'addImage' : 'addVideo']({ url: source });
        } catch (_) {
            invalid.push(source);
        }
    }

    if (invalid.length) {
        await sock.sendMessage(chatId, {
            text: `❌ URL media si sahihi: ${invalid.slice(0, 3).join(', ')}\nTumia link ya .jpg/.png/.gif/.webp/.mp4/.mov/.mkv/.webm.`
        }, { quoted: message });
        return;
    }

    try {
        await album.send(chatId, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (error) {
        console.error('[ALBUM] Send failed:', error?.stack || error);
        await sock.sendMessage(chatId, {
            text: `❌ Imeshindikana kutuma album: ${error?.message || 'unknown error'}`
        }, { quoted: message });
    }
}

albumCommand.name = 'album';
albumCommand.aliases = ['albumsend', 'sendalbum'];
albumCommand.category = 'OWNER';
albumCommand.description = 'Sends 2-10 images or videos as one WhatsApp album';
albumCommand.usage = '.album <image-url> <video-or-image-url> ...';
albumCommand.Album = Album;

module.exports = albumCommand;

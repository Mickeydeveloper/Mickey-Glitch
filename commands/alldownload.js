const fs = require('fs');
const path = require('path');
const axios = require('axios');
const isOwnerOrSudo = require('../lib/isOwner');
const isAdmin = require('../lib/isAdmin');
const settings = require('../settings');

const STATE_FILE = path.join(__dirname, '..', 'data', 'alldownload.json');
const API_URL = 'https://prexzyapis.com/download/aio?url=';
const MAX_MEDIA_BYTES = 64 * 1024 * 1024;
const activeChats = new Set();

function readEnabledChats() {
    try {
        const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        if (Array.isArray(parsed)) return new Set(parsed.filter(id => typeof id === 'string'));
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.enabledChats)) {
            return new Set(parsed.enabledChats.filter(id => typeof id === 'string'));
        }
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('[alldownload] State read failed:', error.message);
    }
    return new Set();
}

function writeEnabledChats(chats) {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    const tempFile = `${STATE_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify({ enabledChats: [...chats] }, null, 2));
    fs.renameSync(tempFile, STATE_FILE);
}

const enabledChats = readEnabledChats();

function getMessageText(message) {
    const content = message?.message || {};
    return content.conversation ||
        content.extendedTextMessage?.text ||
        content.imageMessage?.caption ||
        content.videoMessage?.caption ||
        content.documentMessage?.caption ||
        '';
}

function findUrls(text) {
    return [...String(text || '').matchAll(/https?:\/\/[^\s<>"']+/gi)]
        .map(match => match[0].replace(/[),.!?]+$/, ''))
        .filter(url => {
            try {
                const parsed = new URL(url);
                return parsed.protocol === 'https:' || parsed.protocol === 'http:';
            } catch {
                return false;
            }
        });
}

function pickMedia(data) {
    const media = Array.isArray(data?.medias) ? data.medias : [];
    const best = data?.best;
    if (best?.url && best.type === 'video') return best;

    const videos = media.filter(item => item?.url && item.type === 'video');
    if (videos.length) {
        const order = ['1080p', '720p', '480p', '360p', '240p', '144p'];
        const rank = (quality) => {
            const index = order.indexOf(quality);
            return index < 0 ? order.length : index;
        };
        return videos.sort((a, b) => rank(a.quality) - rank(b.quality))[0];
    }

    if (best?.url) return best;
    return media.find(item => item?.url) || null;
}

async function readLimitedBody(response, limit) {
    if (!response.body) throw new Error('Download response has no body');
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
            await reader.cancel();
            throw new Error(`Media exceeds the ${Math.round(limit / 1024 / 1024)} MB limit`);
        }
        chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, size);
}

function findFinalUrl(value, currentUrl, depth = 0) {
    if (!value || depth > 4) return '';
    if (typeof value === 'string') {
        try {
            const parsed = new URL(value);
            return parsed.protocol === 'https:' && value !== currentUrl ? value : '';
        } catch {
            return '';
        }
    }
    if (Array.isArray(value)) {
        for (const entry of value) {
            const found = findFinalUrl(entry, currentUrl, depth + 1);
            if (found) return found;
        }
        return '';
    }
    if (typeof value === 'object') {
        for (const key of ['download_url', 'downloadUrl', 'file_url', 'fileUrl', 'download', 'url', 'link']) {
            if (typeof value[key] === 'string') {
                const found = findFinalUrl(value[key], currentUrl, depth + 1);
                if (found) return found;
            }
        }
        for (const child of Object.values(value)) {
            const found = findFinalUrl(child, currentUrl, depth + 1);
            if (found) return found;
        }
    }
    return '';
}

async function downloadMedia(url, depth = 0) {
    if (depth > 2) throw new Error('Download service returned too many redirect steps');
    const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw new Error(`Media download failed (HTTP ${response.status})`);

    const contentType = response.headers.get('content-type') || '';
    const isBinaryMedia = /^(video|audio|image)\//i.test(contentType) || /application\/octet-stream/i.test(contentType);
    if (/text\/event-stream|application\/json/i.test(contentType) || (/sse-progress/i.test(url) && !isBinaryMedia)) {
        const body = await readLimitedBody(response, 2 * 1024 * 1024);
        const text = body.toString('utf8');
        const values = text.split(/\r?\n/)
            .filter(line => line.startsWith('data:'))
            .map(line => line.slice(5).trim())
            .filter(Boolean);

        for (const value of values.reverse()) {
            const plainUrl = findFinalUrl(value, url);
            if (plainUrl) return downloadMedia(plainUrl, depth + 1);

            try {
                const parsed = JSON.parse(value);
                const finalUrl = findFinalUrl(parsed, url);
                if (finalUrl) return downloadMedia(finalUrl, depth + 1);
                const encoded = parsed?.data?.base64 || parsed?.base64 || parsed?.data;
                if (typeof encoded === 'string' && /^[A-Za-z0-9+/]+=*$/.test(encoded)) {
                    const buffer = Buffer.from(encoded, 'base64');
                    if (buffer.length && buffer.length <= MAX_MEDIA_BYTES) return buffer;
                }
            } catch {}
        }

        try {
            const parsed = JSON.parse(text);
            const finalUrl = findFinalUrl(parsed, url);
            if (finalUrl) return downloadMedia(finalUrl, depth + 1);
        } catch {}
        throw new Error('Download service did not provide a media file URL');
    }

    const length = Number(response.headers.get('content-length'));
    if (Number.isFinite(length) && length > MAX_MEDIA_BYTES) {
        await response.body?.cancel();
        throw new Error('Media exceeds the 64 MB WhatsApp limit');
    }
    return readLimitedBody(response, MAX_MEDIA_BYTES);
}

async function handleAlldownloadCommand(ctx) {
    const chatId = String(ctx.chatId || '');
    const senderId = String(ctx.senderId || ctx.msg?.key?.participant || ctx.msg?.key?.remoteJid || '');
    const telegramOwner = ctx.telegram && String(settings.telegram?.ownerId || '') === senderId;
    const authorized = telegramOwner || ctx.msg?.key?.fromMe || await isOwnerOrSudo(senderId, ctx.sock, chatId) ||
        (chatId.endsWith('@g.us') && (await isAdmin(ctx.sock, chatId, senderId)).isSenderAdmin);

    if (!authorized) return ctx.reply('❌ Owner au admin wa group pekee anaweza kuwasha/kuzima alldownload.');

    const action = String(ctx.args?.[0] || '').toLowerCase();
    if (action === 'on') {
        enabledChats.add(chatId);
        writeEnabledChats(enabledChats);
        return ctx.reply('✅ Auto-download imewashwa kwenye chat hii. Tuma link ya video/audio kuanza.');
    }
    if (action === 'off') {
        enabledChats.delete(chatId);
        writeEnabledChats(enabledChats);
        return ctx.reply('⏹️ Auto-download imezimwa kwenye chat hii.');
    }
    if (action === 'status') {
        return ctx.reply(enabledChats.has(chatId)
            ? '✅ Auto-download imewashwa kwenye chat hii.'
            : '⏹️ Auto-download imezimwa kwenye chat hii.');
    }

    return ctx.reply('Matumizi: .alldownload on | off | status');
}

async function handleIncomingMessage(sock, message) {
    const chatId = String(message?.key?.remoteJid || '');
    if (!chatId || message?.key?.remoteJid === 'status@broadcast') return false;

    const text = getMessageText(message);
    if (!text || /^\s*\.alldownload(?:\s|$)/i.test(text)) return false;

    const url = findUrls(text)[0];
    if (!url || !enabledChats.has(chatId)) return false;

    if (activeChats.has(chatId)) {
        await sock.sendMessage(chatId, { text: '⏳ Download nyingine bado inaendelea kwenye chat hii.' }, { quoted: message });
        return true;
    }

    activeChats.add(chatId);
    try {
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });
        const apiResponse = await axios.get(`${API_URL}${encodeURIComponent(url)}`, {
            timeout: 30000,
            headers: { Accept: 'application/json', 'User-Agent': 'Mickey-Glitch WhatsApp Bot' },
        });
        const payload = apiResponse.data;
        if (payload?.status !== true || payload?.data?.status === false) {
            throw new Error(payload?.message || payload?.data?.message || 'Link haikuweza kuchambuliwa na API.');
        }

        const info = payload.data || {};
        const selected = pickMedia(info);
        if (!selected?.url) throw new Error('API haikurudisha media inayoweza kupakuliwa.');

        const buffer = await downloadMedia(selected.url);
        const title = String(info.title || 'Downloaded media').slice(0, 900);
        const details = [
            `✅ ${title}`,
            info.author ? `👤 ${info.author}` : '',
            info.duration ? `⏱️ ${info.duration}` : '',
            info.view_count ? `👁️ ${Number(info.view_count).toLocaleString()}` : '',
            selected.label || selected.quality || selected.extension || '',
        ].filter(Boolean);
        const caption = details.join('\n').slice(0, 1024);
        const safeTitle = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 100);
        const type = String(selected.type || '').toLowerCase();
        const extension = String(selected.extension || '').toLowerCase();

        if (type === 'audio' || ['mp3', 'm4a', 'ogg', 'opus'].includes(extension)) {
            const mimetype = extension === 'm4a' ? 'audio/mp4' : extension === 'ogg' || extension === 'opus'
                ? 'audio/ogg; codecs=opus'
                : 'audio/mpeg';
            await sock.sendMessage(chatId, { audio: buffer, mimetype, ptt: false, fileName: `${safeTitle}.${extension || 'mp3'}` }, { quoted: message });
        } else if (type === 'image' || ['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
            await sock.sendMessage(chatId, { image: buffer, caption }, { quoted: message });
        } else if (type === 'video' || ['mp4', 'mov', 'mkv', 'webm'].includes(extension)) {
            await sock.sendMessage(chatId, { video: buffer, mimetype: extension === 'webm' ? 'video/webm' : 'video/mp4', caption, fileName: `${safeTitle}.${extension || 'mp4'}` }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { document: buffer, mimetype: 'application/octet-stream', fileName: `${safeTitle}.${extension || 'bin'}`, caption }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (error) {
        console.error('[alldownload] Download failed:', error?.stack || error);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
        await sock.sendMessage(chatId, {
            text: `❌ Imeshindikana kupakua link hii: ${error?.message || error}`,
        }, { quoted: message }).catch(() => {});
    } finally {
        activeChats.delete(chatId);
    }
    return true;
}

module.exports = {
    name: 'alldownload',
    aliases: ['autodownload', 'alldl'],
    description: 'Toggle automatic social-link downloads per chat',
    category: 'TOOLS',
    code: handleAlldownloadCommand,
    handleIncomingMessage,
};
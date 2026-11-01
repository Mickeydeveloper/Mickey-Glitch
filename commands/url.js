const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

// ==========================================
// 1. SEHEMU YA CATBOX UPLOADER (Imeingizwa hapa)
// ==========================================
const UPLOAD_URL = "https://catbox.moe/user/api.php";
const USERHASH = "";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0";

function formatSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getMimeType(filePathOrName) {
    const ext = path.extname(filePathOrName || "").toLowerCase();
    const map = {
        ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
        ".webp": "image/webp", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".webm": "video/webm",
        ".mov": "video/quicktime", ".avi": "video/x-msvideo", ".mkv": "video/x-matroska",
        ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".m4a": "audio/mp4",
        ".flac": "audio/flac", ".pdf": "application/pdf", ".zip": "application/zip",
        ".rar": "application/x-rar-compressed", ".7z": "application/x-7z-compressed",
        ".tar": "application/x-tar", ".gz": "application/gzip", ".txt": "text/plain",
        ".js": "application/javascript", ".json": "application/json", ".html": "text/html",
        ".css": "text/css", ".xml": "application/xml", ".apk": "application/vnd.android.package-archive",
        ".exe": "application/vnd.microsoft.portable-executable",
    };
    return map[ext] || "application/octet-stream";
}

function getFileName(input, filename, mimeType) {
    if (filename) return path.basename(filename);
    if (typeof input === "string") return path.basename(input);
    const extMap = {
        "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp",
        "video/mp4": ".mp4", "video/webm": ".webm", "audio/mpeg": ".mp3", "audio/wav": ".wav",
        "audio/ogg": ".ogg", "application/pdf": ".pdf", "application/zip": ".zip",
    };
    const ext = extMap[mimeType] || ".bin";
    return `${Date.now()}-${Math.floor(Math.random() * 1000000)}${ext}`;
}

function getFileFormat(filename) {
    return path.extname(filename).replace(".", "").toLowerCase();
}

async function prepareUpload(input, filename) {
    const fileName = getFileName(input, filename);
    const fileType = getMimeType(fileName);
    if (typeof input === "string") {
        if (!fs.existsSync(input)) throw new Error(`file not found: ${input}`);
        const stat = fs.statSync(input);
        return { value: fs.createReadStream(input), fileName, fileSize: stat.size, fileType };
    }
    if (Buffer.isBuffer(input)) {
        return { value: input, fileName, fileSize: input.length, fileType };
    }
    if (input instanceof Uint8Array) {
        const buffer = Buffer.from(input);
        return { value: buffer, fileName, fileSize: buffer.length, fileType };
    }
    if (input instanceof Readable || (input && typeof input.pipe === "function")) {
        return { value: input, fileName, fileSize: null, fileType };
    }
    throw new TypeError("Unsupported input format.");
}

async function getFileInfo(fileName, fileSize, uploadedUrl) {
    const fileType = getMimeType(fileName);
    const fileFormat = getFileFormat(fileName);
    const uploadTime = new Date().toISOString();
    let remoteSize = null;
    let remoteType = null;
    if (uploadedUrl) {
        try {
            const head = await axios.head(uploadedUrl, { headers: { "User-Agent": UA }, timeout: 15000, maxRedirects: 5 });
            remoteSize = head.headers["content-length"] ? parseInt(head.headers["content-length"], 10) : null;
            remoteType = head.headers["content-type"] || null;
        } catch {}
    }
    return {
        fileName, fileSize, fileSizeFormatted: fileSize !== null ? formatSize(fileSize) : null,
        fileType, fileFormat, uploadTime, remoteSize,
        remoteSizeFormatted: remoteSize !== null ? formatSize(remoteSize) : null, remoteType
    };
}

async function uploadFile(input, filename) {
    try {
        const upload = await prepareUpload(input, filename);
        const form = new FormData();
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", upload.value, {
            filename: upload.fileName,
            contentType: upload.fileType,
            ...(upload.fileSize !== null ? { knownLength: upload.fileSize } : {}),
        });
        if (USERHASH) form.append("userhash", USERHASH);

        const startTime = Date.now();
        const { data } = await axios.post(UPLOAD_URL, form, {
            headers: { ...form.getHeaders(), "User-Agent": UA, Referer: "https://catbox.moe/" },
            timeout: 60000, maxBodyLength: Infinity, maxContentLength: Infinity,
        });

        const elapsed = Date.now() - startTime;
        const url = (typeof data === "string" ? data.trim() : "").split("\n")[0];

        if (!url || !url.startsWith("http")) {
            return { success: false, mess: "unexpected response", raw: data };
        }
        const fileInfo = await getFileInfo(upload.fileName, upload.fileSize, url);
        return { success: true, url, elapsedMs: elapsed, elapsedFormatted: `${elapsed}ms`, file: fileInfo, raw: data };
    } catch (err) {
        return { success: false, mess: err.message, status: err.response?.status || null, raw: err.response?.data || null };
    }
}

// ==========================================
// 2. SEHEMU YA KUSOMA MEDIA KUTOKA WHATSAPP
// ==========================================
async function getMediaBufferAndExt(message) {
    const m = message.message || {};
    if (m.imageMessage) {
        const stream = await downloadContentFromMessage(m.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.jpg' };
    }
    if (m.videoMessage) {
        const stream = await downloadContentFromMessage(m.videoMessage, 'video');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.mp4' };
    }
    if (m.audioMessage) {
        const stream = await downloadContentFromMessage(m.audioMessage, 'audio');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.mp3' };
    }
    if (m.documentMessage) {
        const stream = await downloadContentFromMessage(m.documentMessage, 'document');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const fileName = m.documentMessage.fileName || 'file.bin';
        const ext = path.extname(fileName) || '.bin';
        return { buffer: Buffer.concat(chunks), ext };
    }
    if (m.stickerMessage) {
        const stream = await downloadContentFromMessage(m.stickerMessage, 'sticker');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.webp' };
    }
    return null;
}

async function getQuotedMediaBufferAndExt(message) {
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
    if (!quoted) return null;
    return getMediaBufferAndExt({ message: quoted });
}

// ==========================================
// 3. COMMAND KUU YA URL
// ==========================================
async function urlCommand(sock, chatId, message) {
    try {
        let media = await getMediaBufferAndExt(message);
        if (!media) media = await getQuotedMediaBufferAndExt(message);

        if (!media) {
            await sock.sendMessage(chatId, {
                text: '📎 Tafadhali tuma au reply kwenye media (picha, video, audio, sticker, document) kupata URL.'
            }, { quoted: message });
            return;
        }

        const fileName = `${Date.now()}${media.ext}`;
        
        // Upload kwenye Catbox
        const res = await uploadFile(media.buffer, fileName);

        if (!res || !res.success || !res.url) {
            const reason = res?.mess ? ` (${res.mess})` : '';
            await sock.sendMessage(chatId, {
                text: `❌ Imeshindwa ku-upload media${reason}.`
            }, { quoted: message });
            return;
        }

        const url = res.url;
        const sizeInfo = res.file?.fileSizeFormatted ? `\n📦 Size: ${res.file.fileSizeFormatted}` : '';
        const timeInfo = res.elapsedFormatted ? `\n⚡ Upload: ${res.elapsedFormatted}` : '';

        // CTA Button - Copy Link (Native Flow)
        const caption =
            `✅ *Upload Successful*\n\n` +
            `🔗 ${url}${sizeInfo}${timeInfo}\n\n` +
            `_Bonyeza button hapa chini kunakili link_`;

        await sock.sendMessage(chatId, {
            text: caption,
            footer: 'Catbox Uploader',
            nativeFlow: [
                {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📋 Copy Link',
                        copy_code: url, 
                    }),
                },
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🌐 Open Link',
                        url: url,
                        merchant_url: url,
                    }),
                },
            ],
        }, { quoted: message });

    } catch (error) {
        console.error('[URL] error:', error?.message || error);
        await sock.sendMessage(chatId, { text: '❌ Imeshindwa kubadilisha media kuwa URL.' }, { quoted: message });
    }
}

module.exports = urlCommand;
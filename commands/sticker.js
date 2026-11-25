const { downloadMediaMessage, downloadContentFromMessage, generateWAMessageFromContent, prepareWAMessageMedia, proto } = require('@whiskeysockets/baileys');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const settings = require('../settings');
const webp = require('node-webpmux');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────
// PREMIUM STICKER FUNCTIONS (EXIF/Metadata Injection)
// ─────────────────────────────────────────────────────────────

/**
 * Build EXIF data for sticker metadata
 */
function buildStickerExif(metadata) {
    const json = Buffer.from(JSON.stringify(metadata), 'utf-8');
    
    const exif = Buffer.concat([
        Buffer.from([
            0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
            0x07, 0x00
        ]),
        Buffer.alloc(4),
        Buffer.from([0x16, 0x00, 0x00, 0x00]),
        json
    ]);
    
    exif.writeUInt32LE(json.length, 14);
    return exif;
}

/**
 * Create WebP chunk with proper formatting
 */
function makeChunk(type, data) {
    const typeBuffer = Buffer.from(type);
    const sizeBuffer = Buffer.alloc(4);
    sizeBuffer.writeUInt32LE(data.length, 0);
    
    const padding = data.length % 2 === 1 ? Buffer.from([0x00]) : Buffer.alloc(0);
    
    return Buffer.concat([typeBuffer, sizeBuffer, data, padding]);
}

/**
 * Inject EXIF metadata into WebP sticker
 */
function setWebpExif(webpBuffer, metadata) {
    // Validate WebP header
    if (webpBuffer.slice(0, 4).toString() !== 'RIFF' || webpBuffer.slice(8, 12).toString() !== 'WEBP') {
        throw new Error('Invalid WEBP file.');
    }
    
    const chunks = [];
    let offset = 12;
    
    // Parse existing chunks
    while (offset + 8 <= webpBuffer.length) {
        const type = webpBuffer.slice(offset, offset + 4).toString();
        const size = webpBuffer.readUInt32LE(offset + 4);
        const chunkStart = offset;
        const chunkEnd = offset + 8 + size + (size % 2);
        
        if (chunkEnd > webpBuffer.length) break;
        
        // Skip existing EXIF chunk
        if (type !== 'EXIF') {
            chunks.push(webpBuffer.slice(chunkStart, chunkEnd));
        }
        
        offset = chunkEnd;
    }
    
    // Add new EXIF chunk
    const exifPayload = buildStickerExif(metadata);
    const exifChunk = makeChunk('EXIF', exifPayload);
    
    const body = Buffer.concat([...chunks, exifChunk]);
    
    // Build new RIFF header
    const header = Buffer.alloc(12);
    header.write('RIFF', 0);
    header.writeUInt32LE(body.length + 4, 4);
    header.write('WEBP', 8);
    
    return Buffer.concat([header, body]);
}

/**
 * Download sticker buffer from message
 */
async function downloadStickerBuffer(stickerMessage) {
    try {
        const stream = await downloadContentFromMessage(stickerMessage, 'sticker');
        
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        
        return Buffer.concat(chunks);
    } catch (error) {
        console.error('[downloadStickerBuffer]', error?.message || error);
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────
// PREMIUM STICKER COMMAND (Inject EXIF/Metadata)
// ─────────────────────────────────────────────────────────────

async function stickerPremiumCommand(sock, chatId, message) {
    try {
        const senderId = message?.key?.participant || message?.key?.remoteJid || '';
        
        // Get the quoted message
        const contextInfo = message.message?.extendedTextMessage?.contextInfo || message.quoted?.contextInfo || {};
        const quotedMessage = contextInfo.quotedMessage || message.quoted?.message || message.quoted;
        const stickerMessage = quotedMessage?.stickerMessage || quotedMessage?.message?.stickerMessage;
        
        if (!stickerMessage) {
            await sock.sendMessage(chatId, { 
                text: '✋ Reply to a regular WEBP sticker first.'
            }, { quoted: message });
            return;
        }
        
        if (stickerMessage.mimetype !== 'image/webp') {
            await sock.sendMessage(chatId, {
                text: '❌ Not a regular WEBP sticker. Animated/Lottie stickers need different handling.'
            }, { quoted: message });
            return;
        }
        
        // Download sticker buffer
        const stickerBuffer = await downloadStickerBuffer(stickerMessage);
        
        // Define premium metadata
        const metadata = {
            'sticker-pack-id': crypto.randomUUID(),
            'sticker-pack-name': settings.packname || '⚡ Mickey Glitch',
            'sticker-pack-publisher': settings.author || 'Copilot',
            'accessibility-text': 'Premium Sticker',
            'android-app-store-link': 'https://whatsapp.com',
            'ios-app-store-link': 'https://whatsapp.com/ios',
            'emojis': ['🦸', '😴', '😌'],
            'is-from-sticker-maker': 0,
            'is-avatar-sticker': 1,
            'avatar-sticker-template-id': 'whatsapp',
            'is-ai-sticker': 1,
            'is-avatar-country-sticker': 1,
            'is-avatar-instant-sticker': 1,
            'sticker-maker-source-type': 4,
            'is-avatar-social-sticker': 1,
            'avatar-sticker-style': 'whatsapp',
            'avatar-sticker-revision-id': '2026',
            'is-from-user-created-pack': 1,
            'origin-pack-id': 'whatsapp',
            'is-text-sticker': 1,
            'premium': 1
        };
        
        // Inject EXIF metadata
        const finalStickerBuffer = setWebpExif(stickerBuffer, metadata);
        
        // Prepare media for upload
        const media = await prepareWAMessageMedia(
            { sticker: finalStickerBuffer },
            { upload: sock.waUploadToServer }
        );
        
        // Build message content
        const msgContent = {
            messageContextInfo: {
                limitSharingV2: {
                    sharingLimited: true,
                    trigger: 'CHAT_SETTING',
                    limitSharingSettingTimestamp: Date.now().toString(),
                    initiatedByMe: true
                }
            },
            stickerMessage: {
                ...media.stickerMessage,
                isAnimated: stickerMessage.isAnimated || false,
                isAvatar: true,
                isAiSticker: true,
                isLottie: false
            }
        };
        
        // Generate and relay message
        const msg = await generateWAMessageFromContent(chatId, msgContent, {
            quoted: message,
            userJid: sock.user.id
        });
        
        await sock.relayMessage(chatId, msg.message, {
            messageId: msg.key.id
        });
        
        console.log('[sticker-premium] ✅ Sticker metadata injected and sent');
        return true;
        
    } catch (error) {
        console.error('[sticker-premium]', error?.message || error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to inject sticker metadata. Check console.'
        }, { quoted: message }).catch(() => {});
        return false;
    }
}

const audioStickerVarint = (value) => {
    const bytes = [];
    while (value > 127) {
        bytes.push((value % 128) | 128);
        value = Math.floor(value / 128);
    }
    bytes.push(value);
    return Buffer.from(bytes);
};

const audioStickerLengthDelimited = (field, body) => Buffer.concat([
    audioStickerVarint(field * 8 + 2),
    audioStickerVarint(body.length),
    body,
]);

function parseAudioStickerWebp(buffer) {
    if (
        buffer.length < 30 ||
        buffer.toString('ascii', 0, 4) !== 'RIFF' ||
        buffer.toString('ascii', 8, 12) !== 'WEBP'
    ) throw new Error('Audio sticker image is not a valid WebP');

    const chunk = buffer.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') {
        return {
            width: buffer.readUInt16LE(26) & 0x3fff,
            height: buffer.readUInt16LE(28) & 0x3fff,
            isAnimated: false,
        };
    }
    if (chunk === 'VP8L') {
        return {
            width: 1 + (buffer[21] | ((buffer[22] & 0x3f) << 8)),
            height: 1 + ((buffer[22] >> 6) | (buffer[23] << 2) | ((buffer[24] & 0x0f) << 10)),
            isAnimated: false,
        };
    }
    if (chunk === 'VP8X') {
        return {
            width: 1 + buffer.readUIntLE(24, 3),
            height: 1 + buffer.readUIntLE(27, 3),
            isAnimated: (buffer[20] & 2) !== 0,
        };
    }
    throw new Error(`Unsupported WebP chunk: ${chunk}`);
}

function runFFmpegBuffer(args, input) {
    return new Promise((resolve, reject) => {
        const process = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });
        const output = [];
        let outputSize = 0;
        let errorOutput = '';

        process.stdout.on('data', (chunk) => {
            outputSize += chunk.length;
            if (outputSize > 32 * 1024 * 1024) {
                process.kill('SIGKILL');
                reject(new Error('FFmpeg output exceeded 32 MB'));
                return;
            }
            output.push(chunk);
        });
        process.stderr.on('data', (chunk) => {
            errorOutput = `${errorOutput}${chunk.toString()}`.slice(-4000);
        });
        process.once('error', reject);
        process.once('close', (code) => {
            if (code !== 0) return reject(new Error(errorOutput.slice(-1000) || `FFmpeg exited with code ${code}`));
            resolve(Buffer.concat(output));
        });
        process.stdin.on('error', () => {});
        process.stdin.end(input);
    });
}

async function createAudioStickerImage(audioBuffer) {
    const configuredImage = settings.audioStickerImage || path.join(process.cwd(), 'media', 'menu.jpg');
    let imageBuffer;
    if (typeof configuredImage === 'string' && fs.existsSync(configuredImage)) {
        imageBuffer = await fs.promises.readFile(configuredImage);
    } else {
        imageBuffer = await runFFmpegBuffer([
            '-v', 'error',
            '-i', 'pipe:0',
            '-filter_complex', 'showwavespic=s=512x512:colors=0x40d6b0:scale=sqrt',
            '-frames:v', '1',
            '-vcodec', 'png',
            '-f', 'image2pipe',
            'pipe:1',
        ], audioBuffer);
    }

    return runFFmpegBuffer([
        '-v', 'error',
        '-i', 'pipe:0',
        '-frames:v', '1',
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#101820',
        '-c:v', 'libwebp',
        '-quality', '82',
        '-f', 'webp',
        'pipe:1',
    ], imageBuffer);
}

async function uploadAudioStickerMedia(sock, plain, kind) {
    const keyInfo = {
        audio: 'WhatsApp Audio Keys',
        sticker: 'WhatsApp Image Keys',
    }[kind];
    if (!keyInfo) throw new Error(`Unsupported audio-sticker media kind: ${kind}`);

    const mediaKey = crypto.randomBytes(32);
    const derivedKey = Buffer.from(crypto.hkdfSync('sha256', mediaKey, Buffer.alloc(32), keyInfo, 112));
    const iv = derivedKey.subarray(0, 16);
    const cipher = crypto.createCipheriv('aes-256-cbc', derivedKey.subarray(16, 48), iv);
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    const mac = crypto.createHmac('sha256', derivedKey.subarray(48, 80))
        .update(iv)
        .update(encrypted)
        .digest()
        .subarray(0, 10);
    const encryptedFile = Buffer.concat([encrypted, mac]);
    const fileEncSha256 = crypto.createHash('sha256').update(encryptedFile).digest();
    const tempPath = path.join(os.tmpdir(), `audio-sticker-${kind}-${crypto.randomBytes(8).toString('hex')}.enc`);

    await fs.promises.writeFile(tempPath, encryptedFile);
    try {
        if (typeof sock.waUploadToServer !== 'function') {
            throw new Error('This Baileys socket does not expose waUploadToServer');
        }
        const uploaded = await sock.waUploadToServer(tempPath, {
            fileEncSha256B64: fileEncSha256.toString('base64'),
            mediaType: kind,
        });
        if (!uploaded?.directPath) throw new Error(`${kind} upload returned no directPath`);

        return {
            url: uploaded.mediaUrl || `https://mmg.whatsapp.net${uploaded.directPath}`,
            directPath: uploaded.directPath,
            mediaKey,
            fileEncSha256,
            fileSha256: crypto.createHash('sha256').update(plain).digest(),
            fileLength: plain.length,
            mediaKeyTimestamp: Math.floor(Date.now() / 1000),
        };
    } finally {
        await fs.promises.unlink(tempPath).catch(() => {});
    }
}

async function sendAudioSticker(sock, chatId, stickerBuffer, audioBuffer) {
    if (!proto?.Message?.encode || !proto?.Message?.AudioMessage || !proto?.Message?.StickerMessage) {
        throw new Error('The installed Baileys build does not expose the required message protobuf types');
    }

    const webp = parseAudioStickerWebp(stickerBuffer);
    const [audioUpload, stickerUpload] = await Promise.all([
        uploadAudioStickerMedia(sock, audioBuffer, 'audio'),
        uploadAudioStickerMedia(sock, stickerBuffer, 'sticker'),
    ]);
    const mediaDomainInfo = (mediaKey) => audioStickerLengthDelimited(74, Buffer.concat([
        Buffer.from([0x08, 0x01]),
        audioStickerLengthDelimited(2, mediaKey),
    ]));

    const audioMessage = Buffer.concat([
        Buffer.from(proto.Message.AudioMessage.encode(proto.Message.AudioMessage.create({
            url: audioUpload.url,
            mimetype: 'audio/ogg; codecs=opus',
            fileSha256: audioUpload.fileSha256,
            fileEncSha256: audioUpload.fileEncSha256,
            fileLength: audioUpload.fileLength,
            mediaKey: audioUpload.mediaKey,
            directPath: audioUpload.directPath,
            mediaKeyTimestamp: audioUpload.mediaKeyTimestamp,
        })).finish()),
        audioStickerLengthDelimited(17, mediaDomainInfo(audioUpload.mediaKey)),
    ]);
    const stickerMessage = Buffer.concat([
        Buffer.from(proto.Message.StickerMessage.encode(proto.Message.StickerMessage.create({
            url: stickerUpload.url,
            fileSha256: stickerUpload.fileSha256,
            fileEncSha256: stickerUpload.fileEncSha256,
            mediaKey: stickerUpload.mediaKey,
            mimetype: 'image/webp',
            height: webp.height,
            width: webp.width,
            directPath: stickerUpload.directPath,
            fileLength: stickerUpload.fileLength,
            mediaKeyTimestamp: stickerUpload.mediaKeyTimestamp,
            isAnimated: webp.isAnimated,
            stickerSentTs: Date.now(),
        })).finish()),
        audioStickerLengthDelimited(17, Buffer.concat([
            mediaDomainInfo(stickerUpload.mediaKey),
            audioStickerLengthDelimited(82, audioStickerVarint(13001)),
        ])),
    ]);
    const rawFieldBody = audioStickerLengthDelimited(1, audioStickerLengthDelimited(26, Buffer.concat([
        stickerMessage,
        audioStickerLengthDelimited(26, audioMessage),
    ])));
    const rawFields = Symbol('audioStickerRawFields');
    const payload = proto.Message.create({
        messageContextInfo: { messageSecret: crypto.randomBytes(32) },
    });
    payload[rawFields] = [[134, rawFieldBody]];

    const originalEncode = proto.Message.encode;
    proto.Message.encode = function encodeWithAudioStickerFields(message, writer) {
        const encoded = originalEncode.call(this, message, writer);
        if (message?.[rawFields]) {
            for (const [field, body] of message[rawFields]) {
                encoded.uint32(field * 8 + 2).bytes(body);
            }
        }
        return encoded;
    };

    try {
        return await sock.relayMessage(chatId, payload, {});
    } finally {
        proto.Message.encode = originalEncode;
    }
}


async function stickerCommand(sock, chatId, message) {
    // The message that will be quoted in the reply.
    const messageToQuote = message;
    
    // The message object that contains the media to be downloaded.
    let targetMessage = message;

    // If the message is a reply, the target media is in the quoted message.
    if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        // We need to build a new message object for downloadMediaMessage to work correctly.
        const quotedInfo = message.message.extendedTextMessage.contextInfo;
        targetMessage = {
            key: {
                remoteJid: chatId,
                id: quotedInfo.stanzaId,
                participant: quotedInfo.participant
            },
            message: quotedInfo.quotedMessage
        };
    }

    const mediaMessage = targetMessage.message?.imageMessage || targetMessage.message?.videoMessage || targetMessage.message?.documentMessage || targetMessage.message?.audioMessage;
    const isAudioInput = !!targetMessage.message?.audioMessage;

    if (!mediaMessage) {
        await sock.sendMessage(chatId, { 
            text: 'Reply to an image/video with .sticker, or reply to audio to create an audio sticker.'
        },{ quoted: messageToQuote });
        return;
    }

    let tempInput;
    let tempOutput;
    let tempAudioOutput;
    let extractedAudio = null;

    try {
        const mediaBuffer = await downloadMediaMessage(targetMessage, 'buffer', {}, { 
            logger: undefined, 
            reuploadRequest: sock.updateMediaMessage 
        });

        if (!mediaBuffer) {
            await sock.sendMessage(chatId, { 
                text: 'Failed to download media. Please try again.'
            });
            return;
        }

        // Create temp directory if it doesn't exist
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        // Generate temp file paths
        const tempId = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        tempInput = path.join(tmpDir, `temp_${tempId}`);
        tempOutput = path.join(tmpDir, `sticker_${tempId}.webp`);
        tempAudioOutput = path.join(tmpDir, `sticker_audio_${tempId}.ogg`);

        // Write media to temp file
        fs.writeFileSync(tempInput, mediaBuffer);

        // Check if media is animated (GIF or video)
        const isAnimated = !isAudioInput && (mediaMessage.mimetype?.includes('gif') || 
                          mediaMessage.mimetype?.includes('video') || 
                          mediaMessage.seconds > 0);

        let webpBuffer;
        if (isAudioInput) {
            extractedAudio = await runFFmpegBuffer([
                '-v', 'error',
                '-i', 'pipe:0',
                '-vn',
                '-map_metadata', '-1',
                '-c:a', 'libopus',
                '-b:a', '64k',
                '-ar', '48000',
                '-ac', '1',
                '-f', 'ogg',
                'pipe:1',
            ], mediaBuffer);
            webpBuffer = await createAudioStickerImage(extractedAudio);
            fs.writeFileSync(tempOutput, webpBuffer);
        } else {
            const ffmpegCommand = isAnimated
                ? `ffmpeg -i "${tempInput}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`
                : `ffmpeg -i "${tempInput}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`;

            await new Promise((resolve, reject) => {
                exec(ffmpegCommand, { timeout: 120000, maxBuffer: 1024 * 1024 }, (error) => {
                    if (error) {
                        console.error('FFmpeg error:', error);
                        reject(error);
                    } else resolve();
                });
            });
            webpBuffer = fs.readFileSync(tempOutput);
        }

        // If animated and output is too large, re-encode with harsher settings similar to stickercrop
        if (isAnimated && webpBuffer.length > 1000 * 1024) {
            try {
                const tempOutput2 = path.join(tmpDir, `sticker_fallback_${Date.now()}.webp`);
                // Detect large source to decide compression level
                const fileSizeKB = mediaBuffer.length / 1024;
                const isLargeFile = fileSizeKB > 5000; // 5MB
                const fallbackCmd = isLargeFile
                    ? `ffmpeg -y -i "${tempInput}" -t 2 -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=8,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput2}"`
                    : `ffmpeg -y -i "${tempInput}" -t 3 -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=12,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 45 -compression_level 6 -b:v 150k -max_muxing_queue_size 1024 "${tempOutput2}"`;
                await new Promise((resolve, reject) => {
                    exec(fallbackCmd, (error) => error ? reject(error) : resolve());
                });
                if (fs.existsSync(tempOutput2)) {
                    webpBuffer = fs.readFileSync(tempOutput2);
                    try { fs.unlinkSync(tempOutput2); } catch {}
                }
            } catch {}
        }

        if (mediaMessage.mimetype?.includes('video')) {
            try {
                const extractAudioCommand = `ffmpeg -y -i "${tempInput}" -map 0:a:0 -vn -map_metadata -1 -c:a libopus -b:a 64k -ar 48000 -ac 1 -f ogg "${tempAudioOutput}"`;
                await new Promise((resolve, reject) => {
                    exec(extractAudioCommand, { timeout: 120000, maxBuffer: 1024 * 1024 }, (error) => {
                        if (error) reject(error);
                        else resolve();
                    });
                });

                const audioStats = fs.statSync(tempAudioOutput);
                if (audioStats.size > 0) extractedAudio = fs.readFileSync(tempAudioOutput);
            } catch (audioError) {
                console.info('[sticker] Video has no extractable audio track:', audioError?.message || audioError);
            }
        }
        // Read the WebP file
        webpBuffer = fs.readFileSync(tempOutput);

        // If animated and output is too large, re-encode with harsher settings similar to stickercrop
        if (isAnimated && webpBuffer.length > 1000 * 1024) {
            try {
                const tempOutput2 = path.join(tmpDir, `sticker_fallback_${Date.now()}.webp`);
                // Detect large source to decide compression level
                const fileSizeKB = mediaBuffer.length / 1024;
                const isLargeFile = fileSizeKB > 5000; // 5MB
                const fallbackCmd = isLargeFile
                    ? `ffmpeg -y -i "${tempInput}" -t 2 -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=8,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput2}"`
                    : `ffmpeg -y -i "${tempInput}" -t 3 -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=12,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 45 -compression_level 6 -b:v 150k -max_muxing_queue_size 1024 "${tempOutput2}"`;
                await new Promise((resolve, reject) => {
                    exec(fallbackCmd, (error) => error ? reject(error) : resolve());
                });
                if (fs.existsSync(tempOutput2)) {
                    webpBuffer = fs.readFileSync(tempOutput2);
                    try { fs.unlinkSync(tempOutput2); } catch {}
                }
            } catch {}
        }

        // Add metadata using webpmux
        const img = new webp.Image();
        await img.load(webpBuffer);

        // Create metadata
        const json = {
            'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
            'sticker-pack-name': settings.packname || 'ʟᴏꜰᴛ☠',
            'emojis': ['☀️']
        };

        // Create exif buffer
        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
        const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
        const exif = Buffer.concat([exifAttr, jsonBuffer]);
        exif.writeUIntLE(jsonBuffer.length, 14, 4);

        // Set the exif data
        img.exif = exif;

        // Get the final buffer with metadata
        let finalBuffer = await img.save(null);

        // Final safety: if still too large, make a tiny 320/256px pass
        if (isAnimated && finalBuffer.length > 900 * 1024) {
            try {
                const tempOutput3 = path.join(tmpDir, `sticker_small_${Date.now()}.webp`);
                const smallCmd = `ffmpeg -y -i "${tempInput}" -t 2 -vf "scale=320:320:force_original_aspect_ratio=decrease,fps=8,pad=320:320:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 80k -max_muxing_queue_size 1024 "${tempOutput3}"`;
                await new Promise((resolve, reject) => {
                    exec(smallCmd, (error) => error ? reject(error) : resolve());
                });
                if (fs.existsSync(tempOutput3)) {
                    const smallWebp = fs.readFileSync(tempOutput3);
                    const img2 = new webp.Image();
                    await img2.load(smallWebp);
                    const json2 = {
                        'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
                        'sticker-pack-name': settings.packname || 'ʟᴏꜰᴛ☠',
                        'emojis': ['🌟']
                    };
                    const exifAttr2 = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
                    const jsonBuffer2 = Buffer.from(JSON.stringify(json2), 'utf8');
                    const exif2 = Buffer.concat([exifAttr2, jsonBuffer2]);
                    exif2.writeUIntLE(jsonBuffer2.length, 14, 4);
                    img2.exif = exif2;
                    finalBuffer = await img2.save(null);
                    try { fs.unlinkSync(tempOutput3); } catch {}
                }
            } catch {}
        }

        if (extractedAudio) {
            const result = await sendAudioSticker(sock, chatId, finalBuffer, extractedAudio);
            console.log('[sticker] Audio sticker relayed as one message:', result?.key?.id || result?.messageId || 'sent');
        } else {
            await sock.sendMessage(chatId, {
                sticker: finalBuffer
            }, { quoted: messageToQuote });
        }

        // Cleanup temp files
        try {
            for (const tempFile of [tempInput, tempOutput, tempAudioOutput]) {
                if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            }
        } catch (err) {
            console.error('Error cleaning up temp files:', err);
        }

    } catch (error) {
        console.error('Error in sticker command:', error);
        for (const tempFile of [tempInput, tempOutput, tempAudioOutput]) {
            try {
                if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            } catch (cleanupError) {
                console.error('Error cleaning up temp file:', cleanupError?.message || cleanupError);
            }
        }
        await sock.sendMessage(chatId, { 
            text: 'Failed to create sticker! Try again later.'
        });
    }
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

module.exports = stickerCommand;
module.exports.name = 'sticker';
module.exports.aliases = ['s', 'stick'];
module.exports.category = 'converter';
module.exports.desc = 'Convert image/video to sticker and embed video or quoted audio';
module.exports.description = module.exports.desc;
module.exports.execute = stickerCommand;

// Premium sticker command (inject metadata)
module.exports.stickerPremium = stickerPremiumCommand;
module.exports.stickerPremiumCommand = stickerPremiumCommand;

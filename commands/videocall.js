const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { spawnSync } = require('child_process');
const { pipeline } = require('stream/promises');
const isOwnerOrSudo = require('../lib/isOwner');

const activeSockets = new WeakSet();
const voipManagers = new WeakMap();
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.mov', '.webm', '.avi']);

// Tumia raw URL moja kwa moja ili kuepuka redirects
const DEFAULT_VIDEO_URL = 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/videocall.mp4';
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB max
const configuredMaxDuration = Number(process.env.CALL_MAX_DURATION_SECONDS || 300);
const MAX_CALL_DURATION_SECONDS = Number.isInteger(configuredMaxDuration) && configuredMaxDuration >= 10 ? configuredMaxDuration : 300;

async function getDefaultVideoPath() {
    // Check kama video ipo kwenye cache kwanza
    const mediaDirectory = path.resolve(process.cwd(), 'media');
    fs.mkdirSync(mediaDirectory, { recursive: true });
    const videoPath = path.join(mediaDirectory, 'videocall.mp4');
    
    if (fs.existsSync(videoPath) && fs.statSync(videoPath).size > 0) {
        return videoPath; // Tumia iliyopo kwenye cache
    }

    const response = await fetch(DEFAULT_VIDEO_URL, {
        signal: AbortSignal.timeout(60000), // 60 sekunde kwa video
    });
    if (!response.ok) throw new Error(`Video download imeshindwa: HTTP ${response.status}`);

    const video = Buffer.from(await response.arrayBuffer());
    if (!video.length || video.length > MAX_VIDEO_SIZE) {
        throw new Error('Ukubwa wa video si halali (max 50 MB).');
    }

    fs.writeFileSync(videoPath, video);
    return videoPath;
}

async function videoCallCommand(sock, chatId, message, args = []) {
    const senderId = message.key.participant || message.key.remoteJid;
    const canCall = message.key.fromMe || await isOwnerOrSudo(senderId, sock, chatId);

    if (!canCall) {
        await sock.sendMessage(chatId, {
            text: 'Command hii inapatikana kwa owner/sudo pekee.',
        }, { quoted: message });
        return;
    }

    // Chukua hoja: .vcall <namba> [sekunde] [video]
    const phoneNumber = String(args[0] || '').replace(/\D/g, '');
    const durationSeconds = Number(args[1] || 30);
    const videoArgument = args.slice(2).join(' ').trim();

    if (!/^\d{8,15}$/.test(phoneNumber) || !Number.isInteger(durationSeconds) || durationSeconds < 10 || durationSeconds > MAX_CALL_DURATION_SECONDS) {
        await sock.sendMessage(chatId, {
            text: `Matumizi: .vcall <namba> [sekunde 10-${MAX_CALL_DURATION_SECONDS}] [faili.mp4|faili.mkv]\nBila faili, video ya raw GitHub itatumika.\nMfano: .vcall 255712345678 30`,
        }, { quoted: message });
        return;
    }

    let videoSource;
    if (videoArgument) {
        videoSource = path.resolve(process.cwd(), videoArgument);
        if (!VIDEO_EXTENSIONS.has(path.extname(videoSource).toLowerCase()) || !fs.existsSync(videoSource)) {
            await sock.sendMessage(chatId, {
                text: 'Faili la video halijapatikana. Tumia faili lililopo la MP4, MKV, au MOV.',
            }, { quoted: message });
            return;
        }
    } else {
        try {
            videoSource = await getDefaultVideoPath();
        } catch (error) {
            await sock.sendMessage(chatId, {
                text: `Imeshindikana kupakua video: ${error?.message || error}`,
            }, { quoted: message });
            return;
        }
    }

    if (activeSockets.has(sock)) {
        await sock.sendMessage(chatId, {
            text: 'Tayari kuna call inayoendelea. Maliza kwanza.',
        }, { quoted: message });
        return;
    }

    activeSockets.add(sock);

    try {
        const ffmpegPath = process.env.FFMPEG_PATH || require('ffmpeg-static') || 'ffmpeg';
        const ffmpegCheck = spawnSync(ffmpegPath, ['-version'], {
            stdio: 'ignore',
            timeout: 5000,
        });
        if (ffmpegCheck.error || ffmpegCheck.status !== 0) {
            throw new Error(`ffmpeg haipatikani: ${ffmpegCheck.error?.message || ffmpegPath}`);
        }
        const ffmpegDirectory = path.dirname(ffmpegPath);
        const pathEntries = (process.env.PATH || '').split(path.delimiter);
        if (!pathEntries.includes(ffmpegDirectory)) {
            process.env.PATH = [ffmpegDirectory, ...pathEntries].filter(Boolean).join(path.delimiter);
        }

        await sock.sendMessage(chatId, {
            text: `Inaanzisha video call kwenda +${phoneNumber}...`,
        }, { quoted: message });

        const authenticatedJid = sock.user?.id || sock.authState?.creds?.me?.id || sock.authState?.creds?.me?.jid;
        if (!sock.ws || !authenticatedJid) {
            throw new Error('Socket ya Baileys haijaunganishwa bado.');
        }

        let voip = voipManagers.get(sock);
        if (!voip) {
            const VoipManager = (await import('@whiskeysockets/baileys/lib/VoipJS/index.js')).default;
            if (typeof VoipManager !== 'function') {
                throw new Error('VoipJS haipatikani kwenye Baileys hii.');
            }
            voip = new VoipManager(sock, {
                maxConcurrentCalls: 1,
                maxCallsPerHour: 6,
                maxCallsPerDay: 12,
                minIntervalMs: 10000,
                voipLogLevel: 'debug',
            });
            voipManagers.set(sock, voip);
        }

        await voip.listen();
        
        // HAPA NDIO TUNAFANYA VIDEO CALL: Tunatumia option { video: true }
        // Baileys VoipJS inakubali video kupitia option ya tatu (source) au kwa kupitisha option
        const call = await voip.call(phoneNumber, videoSource, '720p', {
            video: true, // Hii inaiambia VoipManager itume kama video call
            autoEndCall: false,
        });

        call.on('ringing', () => {
            void sock.sendMessage(chatId, { text: `Video call inaita +${phoneNumber}...` }).catch(() => {});
        });
        call.on('connected', () => {
            void sock.sendMessage(chatId, { text: '✅ Video call imeunganishwa.' }).catch(() => {});
        });
        call.on('item', (item) => {
            console.log('[VIDEOCALL/VOIP] Media item started:', item);
        });
        call.on('playlist_ended', () => {
            console.log('[VIDEOCALL/VOIP] Video playlist ended.');
        });

        let callError = null;
        const hangupCall = () => {
            void call.hangup().catch((hangupError) => {
                console.error('[VIDEOCALL/VOIP] Hangup failed:', hangupError?.message || hangupError);
            });
        };
        
        call.on('error', (error) => {
            callError = error;
            hangupCall();
        });

        const durationTimer = setTimeout(() => {
            hangupCall();
        }, durationSeconds * 1000);
        
        const reason = await new Promise((resolve) => {
            call.once('ended', resolve);
        }).finally(() => clearTimeout(durationTimer));
        
        if (callError) throw callError;

        await sock.sendMessage(chatId, {
            text: `Video call imeisha (${reason}).`,
        }, { quoted: message });
    } catch (error) {
        console.error('[VIDEOCALL] Video call failed:', error?.message || error);
        await sock.sendMessage(chatId, {
            text: `Imeshindikana kupiga video call: ${error?.message || 'hitilafu isiyojulikana'}.`,
        }, { quoted: message });
    } finally {
        activeSockets.delete(sock);
    }
}

videoCallCommand.description = 'Piga video call ya WhatsApp (owner/sudo pekee)';
videoCallCommand.category = 'OWNER';
videoCallCommand.aliases = ['vcall'];

module.exports = videoCallCommand;
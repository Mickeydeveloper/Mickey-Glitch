const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const isOwnerOrSudo = require('../lib/isOwner');

const voipClients = new WeakMap();
const activeCalls = new WeakMap();
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.mov', '.webm', '.avi']);

function resolveVideoPath(file) {
    const videoPath = path.resolve(process.cwd(), file);
    const relativePath = path.relative(process.cwd(), videoPath);
    if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        throw new Error('Video lazima iwe ndani ya folder la project.');
    }
    if (!VIDEO_EXTENSIONS.has(path.extname(videoPath).toLowerCase())) {
        throw new Error('Tumia video ya MP4, MKV, MOV, WEBM au AVI.');
    }
    if (!fs.existsSync(videoPath) || !fs.statSync(videoPath).isFile()) {
        throw new Error(`Video haijapatikana: ${file}`);
    }
    return videoPath;
}

function getFfmpegPath() {
    return process.env.FFMPEG_PATH || require('ffmpeg-static') || 'ffmpeg';
}

async function getVoipClient(sock) {
    let client = voipClients.get(sock);
    if (client) return client;

    const ffmpegPath = getFfmpegPath();
    const ffmpegCheck = spawnSync(ffmpegPath, ['-version'], {
        stdio: 'ignore',
        timeout: 5000,
    });
    if (ffmpegCheck.error || ffmpegCheck.status !== 0) {
        throw new Error(`FFmpeg haipatikani: ${ffmpegCheck.error?.message || ffmpegPath}`);
    }

    const ffmpegDirectory = path.dirname(ffmpegPath);
    const pathEntries = (process.env.PATH || '').split(path.delimiter);
    if (!pathEntries.includes(ffmpegDirectory)) {
        process.env.PATH = [ffmpegDirectory, ...pathEntries].filter(Boolean).join(path.delimiter);
    }

    const baileys = await import('@whiskeysockets/baileys');
    const makeVoipClient = baileys.makeVoipClient || baileys.default?.makeVoipClient;
    if (typeof makeVoipClient !== 'function') {
        throw new Error('makeVoipClient haipatikani kwenye Baileys hii.');
    }

    client = await makeVoipClient(sock, { ffmpegPath });
    voipClients.set(sock, client);
    return client;
}

async function videoCallCommand(sock, chatId, message, args = []) {
    const senderId = message?.key?.participant || message?.key?.remoteJid || '';
    const allowed = Boolean(message?.key?.fromMe) || await isOwnerOrSudo(senderId, sock, chatId);
    if (!allowed) {
        await sock.sendMessage(chatId, {
            text: 'Command hii inapatikana kwa owner/sudo pekee.',
        }, { quoted: message });
        return;
    }

    const input = Array.isArray(args) ? args.map(String) : String(args || '').trim().split(/\s+/).filter(Boolean);
    const action = String(input[0] || '').toLowerCase();
    const active = activeCalls.get(sock);
    let startedCall = null;

    try {
        if (['play', 'queue', 'skip', 'share', 'end', 'status'].includes(action)) {
            if (!active) {
                await sock.sendMessage(chatId, { text: 'Hakuna video call inayoendelea.' }, { quoted: message });
                return;
            }

            if (action === 'play' || action === 'queue') {
                const files = input.slice(1);
                if (!files.length) throw new Error(`Taja video: .vcall ${action} <video.mp4>`);
                const paths = files.map(resolveVideoPath);
                if (action === 'play') {
                    active.call.playVideo(paths[0]);
                    await sock.sendMessage(chatId, { text: `Inacheza video: ${path.basename(paths[0])}` }, { quoted: message });
                } else {
                    active.call.enqueueVideo(paths);
                    await sock.sendMessage(chatId, {
                        text: `Video ${paths.length} zimeongezwa kwenye foleni. Zilizopo: ${active.call.queuedVideo()}`,
                    }, { quoted: message });
                }
                return;
            }

            if (action === 'skip') {
                active.call.skipVideo();
                await sock.sendMessage(chatId, { text: 'Video ya sasa imerukwa.' }, { quoted: message });
                return;
            }

            if (action === 'share') {
                const setting = String(input[1] || '').toLowerCase();
                if (!['on', 'off'].includes(setting)) throw new Error('Matumizi: .vcall share on|off');
                if (setting === 'on') await active.call.startScreenShare();
                else await active.call.stopScreenShare();
                await sock.sendMessage(chatId, { text: `Screen sharing: ${setting}.` }, { quoted: message });
                return;
            }

            if (action === 'status') {
                await sock.sendMessage(chatId, {
                    text: `Video call kwenda +${active.number}\nInayocheza: ${active.call.nowPlayingVideo() || 'hakuna'}\nFoleni: ${active.call.queuedVideo()}`,
                }, { quoted: message });
                return;
            }

            active.call.end();
            await sock.sendMessage(chatId, { text: 'Inamaliza video call...' }, { quoted: message });
            return;
        }

        const startArgs = action === 'start' ? input.slice(1) : input;
        const number = String(startArgs[0] || '').replace(/\D/g, '');
        const videoFile = startArgs[1];
        if (!/^\d{8,15}$/.test(number) || !videoFile) {
            await sock.sendMessage(chatId, {
                text: 'Matumizi: .vcall <namba> <video.mp4>\nAu: .vcall start <namba> <video.mp4>',
            }, { quoted: message });
            return;
        }

        if (active) {
            await sock.sendMessage(chatId, { text: '❌ Tayari kuna video call inayoendelea. Tumia .vcall end kwanza.' }, { quoted: message });
            return;
        }

        const videoPath = resolveVideoPath(videoFile);
        let call;
        try {
            const voip = await getVoipClient(sock);
            call = await voip.call(number, { video: true, durationMs: 0 });
            startedCall = call;
            activeCalls.set(sock, { call, number });
            call.playVideo(videoPath);

            await sock.sendMessage(chatId, {
                text: `📞 Inaanzisha video call kwenda +${number}...\nInacheza: ${path.basename(videoPath)}\nTumia .vcall end kumaliza.`,
            }, { quoted: message });

            call.on('ringing', () => {
                void sock.sendMessage(chatId, { text: `🔔 Video call inaita +${number}...` }, { quoted: message }).catch(() => {});
            });
            call.on('connected', () => {
                void sock.sendMessage(chatId, { text: '✅ Video call imeunganishwa.' }, { quoted: message }).catch(() => {});
            });
            call.on('item', (item) => {
                console.log('[VIDEOCALL] Media item started:', item);
            });
            call.on('playlist_ended', () => {
                console.log('[VIDEOCALL] Video playlist ended.');
            });
            call.on('error', async (error) => {
                if (activeCalls.get(sock)?.call === call) activeCalls.delete(sock);
                console.error('[VIDEOCALL] Call error:', error?.message || error);
                await sock.sendMessage(chatId, { text: `❌ Video call imekumbana na hitilafu: ${error?.message || 'kosa lisilojulikana'}.` }, { quoted: message }).catch(() => {});
            });

            void call.waitForEnd().then(async (reason) => {
                if (activeCalls.get(sock)?.call === call) activeCalls.delete(sock);
                await sock.sendMessage(chatId, { text: `📴 Video call imeisha (${reason}).` }).catch(() => {});
            }).catch(async (error) => {
                if (activeCalls.get(sock)?.call === call) activeCalls.delete(sock);
                console.error('[VIDEOCALL] Call ended with error:', error?.message || error);
                await sock.sendMessage(chatId, { text: `❌ Video call imeisha kwa hitilafu: ${error?.message || 'kosa lisilojulikana'}.` }).catch(() => {});
            });
        } catch (err) {
            if (activeCalls.get(sock)?.call === call) activeCalls.delete(sock);
            throw err;
        }
    } catch (error) {
        console.error('[VIDEOCALL] Command failed:', error?.message || error);
        if (startedCall) {
            if (activeCalls.get(sock)?.call === startedCall) activeCalls.delete(sock);
            try { startedCall.end(); } catch {}
        }
        await sock.sendMessage(chatId, {
            text: `Imeshindikana kutekeleza videocall: ${error?.message || 'hitilafu isiyojulikana'}.`,
        }, { quoted: message });
    }
}

videoCallCommand.name = 'videocall';
videoCallCommand.description = 'Piga video call na kucheza video (owner/sudo pekee)';
videoCallCommand.category = 'OWNER';
videoCallCommand.aliases = ['vcall', 'ccalll'];

module.exports = videoCallCommand;
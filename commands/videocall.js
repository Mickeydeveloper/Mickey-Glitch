/**
 * Video Call Command — powered by @mickeyteam/baileys
 * Default video: https://github.com/Mickeymozy/Mickey-Vip/raw/main/videocall.mp4
 * Owner / sudo only.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { spawnSync } = require('child_process');
const { pipeline } = require('stream/promises');
const isOwnerOrSudo = require('../lib/isOwner');

const voipClients = new WeakMap();
const activeCalls = new WeakMap();
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.mov', '.webm', '.avi']);

// ────────────────────────────────────────────────
// DEFAULTS
// ────────────────────────────────────────────────
const DEFAULT_VIDEO_URL =
    'https://github.com/Mickeymozy/Mickey-Vip/raw/main/videocall.mp4';
const GITHUB_RAW_FALLBACK =
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/videocall.mp4';

const TMP_DIR = path.resolve(process.cwd(), 'tmp');
const VIDEO_CACHE_DIR = path.resolve(TMP_DIR, 'videocall-cache');
if (!fs.existsSync(VIDEO_CACHE_DIR)) {
    fs.mkdirSync(VIDEO_CACHE_DIR, { recursive: true });
}

// ────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────
function isHttpUrl(value) {
    return /^https?:\/\//i.test(String(value || '').trim());
}

function isGithubBlobUrl(value) {
    return /^https?:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[^/]+\/.+/i.test(String(value || ''));
}

function toGithubRawUrl(value) {
    return String(value).replace(
        /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i,
        'https://raw.githubusercontent.com/$1/$2/$3/$4'
    );
}

async function downloadFile(url, destPath) {
    const filePath = fs.existsSync(destPath) && fs.statSync(destPath).size > 0
        ? destPath
        : destPath;

    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, { timeout: 60000 }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // Follow redirect (GitHub does this)
                downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`Download failed (${res.statusCode}) for ${url}`));
                return;
            }
            const stream = fs.createWriteStream(filePath);
            pipeline(res, stream)
                .then(() => {
                    if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 1024) {
                        reject(new Error('Downloaded file too small — probably an error page.'));
                        return;
                    }
                    resolve(filePath);
                })
                .catch(reject);
        });
        req.on('timeout', () => { req.destroy(new Error('Download timeout (60s).')); });
        req.on('error', reject);
    });
}

async function resolveVideoSource(input) {
    const raw = String(input || '').trim();
    if (!raw) throw new Error('Taja video (path au URL).');

    // ── HTTP(S) URL → download to cache ──
    if (isHttpUrl(raw)) {
        const url = isGithubBlobUrl(raw) ? toGithubRawUrl(raw) : raw;
        const fileName = `videocall-${Date.now()}-${path.basename(new URL(url).pathname) || 'video.mp4'}`;
        const dest = path.join(VIDEO_CACHE_DIR, fileName);
        const candidates = [url];
        if (/github\.com\/.*\/raw\//i.test(url)) candidates.push(GITHUB_RAW_FALLBACK);

        let lastErr;
        for (const candidate of candidates) {
            try {
                const finalPath = await downloadFile(candidate, dest);
                if (!VIDEO_EXTENSIONS.has(path.extname(finalPath).toLowerCase())) {
                    fs.unlinkSync(finalPath);
                    throw new Error('URL haina video ya MP4/MKV/MOV/WEBM/AVI.');
                }
                return finalPath;
            } catch (err) {
                lastErr = err;
                console.warn(`[VIDEOCALL] Download attempt failed (${candidate}): ${err.message}`);
            }
        }
        throw new Error(`Imeshindikana kupakua video: ${lastErr?.message || 'kosa lisilojulikana'}`);
    }

    // ── Local path → validate ──
    const videoPath = path.resolve(process.cwd(), raw);
    const relativePath = path.relative(process.cwd(), videoPath);
    if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        throw new Error('Video lazima iwe ndani ya folder la project.');
    }
    if (!VIDEO_EXTENSIONS.has(path.extname(videoPath).toLowerCase())) {
        throw new Error('Tumia video ya MP4, MKV, MOV, WEBM au AVI.');
    }
    if (!fs.existsSync(videoPath) || !fs.statSync(videoPath).isFile()) {
        throw new Error(`Video haijapatikana: ${raw}`);
    }
    return videoPath;
}

function cleanupOldVideos(maxAgeMs = 3600000) {
    try {
        if (!fs.existsSync(VIDEO_CACHE_DIR)) return;
        const now = Date.now();
        for (const f of fs.readdirSync(VIDEO_CACHE_DIR)) {
            const p = path.join(VIDEO_CACHE_DIR, f);
            try {
                if (now - fs.statSync(p).mtimeMs > maxAgeMs) fs.unlinkSync(p);
            } catch {}
        }
    } catch {}
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

    // ── @mickeyteam/baileys (GitHub build) ──
    const baileys = await import('@mickeyteam/baileys');
    const makeVoipClient = baileys.makeVoipClient || baileys.default?.makeVoipClient;
    if (typeof makeVoipClient !== 'function') {
        throw new Error('makeVoipClient haipatikani kwenye @mickeyteam/baileys hii.');
    }

    client = await makeVoipClient(sock, { ffmpegPath });
    voipClients.set(sock, client);
    return client;
}

// ────────────────────────────────────────────────
// COMMAND
// ────────────────────────────────────────────────
async function videoCallCommand(sock, chatId, message, args = []) {
    const senderId = message?.key?.participant || message?.key?.remoteJid || '';
    const allowed = Boolean(message?.key?.fromMe) || await isOwnerOrSudo(senderId, sock, chatId);
    if (!allowed) {
        await sock.sendMessage(chatId, {
            text: 'Command hii inapatikana kwa owner/sudo pekee.',
        }, { quoted: message });
        return;
    }

    const input = Array.isArray(args)
        ? args.map(String)
        : String(args || '').trim().split(/\s+/).filter(Boolean);
    const action = String(input[0] || '').toLowerCase();
    const active = activeCalls.get(sock);
    let startedCall = null;

    try {
        // ── Sub-commands on active call ──
        if (['play', 'queue', 'skip', 'share', 'end', 'status'].includes(action)) {
            if (!active) {
                await sock.sendMessage(chatId, { text: 'Hakuna video call inayoendelea.' }, { quoted: message });
                return;
            }

            if (action === 'play' || action === 'queue') {
                const sources = input.slice(1);
                if (!sources.length) throw new Error(`Taja video: .vcall ${action} <video.mp4|URL>`);
                const paths = [];
                for (const src of sources) paths.push(await resolveVideoSource(src));

                if (action === 'play') {
                    active.call.playVideo(paths[0]);
                    await sock.sendMessage(chatId, {
                        text: `Inacheza video: ${path.basename(paths[0])}`,
                    }, { quoted: message });
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

            // end
            try { active.call.end(); } catch {}
            await sock.sendMessage(chatId, { text: 'Inamaliza video call...' }, { quoted: message });
            return;
        }

        // ── Start new call ──
        const startArgs = action === 'start' ? input.slice(1) : input;
        const number = String(startArgs[0] || '').replace(/\D/g, '');
        const videoInput = startArgs[1] || DEFAULT_VIDEO_URL; // default = GitHub raw video

        if (!/^\d{8,15}$/.test(number)) {
            await sock.sendMessage(chatId, {
                text: 'Matumizi: .vcall <namba> [video.mp4|URL]\nBila video, default video ya Mickey-Vip itatumika.',
            }, { quoted: message });
            return;
        }

        if (active) {
            await sock.sendMessage(chatId, { text: '❌ Tayari kuna video call inayoendelea. Tumia .vcall end kwanza.' }, { quoted: message });
            return;
        }

        // Resolve video (local or download)
        const videoPath = await resolveVideoSource(videoInput);

        let call;
        try {
            const voip = await getVoipClient(sock);
            call = await voip.call(number, { video: true, durationMs: 0 });
            startedCall = call;
            activeCalls.set(sock, { call, number, videoPath });

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
                await sock.sendMessage(chatId, {
                    text: `❌ Video call imekumbana na hitilafu: ${error?.message || 'kosa lisilojulikana'}.`,
                }, { quoted: message }).catch(() => {});
            });

            // Wait for end + cleanup
            void call.waitForEnd().then(async (reason) => {
                if (activeCalls.get(sock)?.call === call) activeCalls.delete(sock);
                cleanupOldVideos();
                await sock.sendMessage(chatId, { text: `📴 Video call imeisha (${reason}).` }).catch(() => {});
            }).catch(async (error) => {
                if (activeCalls.get(sock)?.call === call) activeCalls.delete(sock);
                cleanupOldVideos();
                console.error('[VIDEOCALL] Call ended with error:', error?.message || error);
                await sock.sendMessage(chatId, {
                    text: `❌ Video call imeisha kwa hitilafu: ${error?.message || 'kosa lisilojulikana'}.`,
                }).catch(() => {});
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
videoCallCommand.description = 'Piga video call na kucheza video (owner/sudo pekee) — default video kutoka Mickey-Vip';
videoCallCommand.category = 'OWNER';
videoCallCommand.aliases = ['vcall', 'ccalll'];

module.exports = videoCallCommand;
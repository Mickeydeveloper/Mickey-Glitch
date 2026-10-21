const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const isOwnerOrSudo = require('../lib/isOwner');

const activeSockets = new WeakSet();
const voipManagers = new WeakMap();
const DEFAULT_AUDIO_URL = 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/sina%20mda%20nae.mp3';
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

async function getDefaultAudioPath() {
    const response = await fetch(DEFAULT_AUDIO_URL, {
        signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Audio download imeshindwa: HTTP ${response.status}`);

    const audio = Buffer.from(await response.arrayBuffer());
    if (!audio.length || audio.length > MAX_AUDIO_SIZE) {
        throw new Error('Ukubwa wa audio si halali (max 25 MB).');
    }

    const mediaDirectory = path.resolve(process.cwd(), 'media');
    fs.mkdirSync(mediaDirectory, { recursive: true });
    const audioPath = path.join(mediaDirectory, 'call-audio.mp3');
    fs.writeFileSync(audioPath, audio);
    return audioPath;
}

async function callCommand(sock, chatId, message, args = []) {
    const senderId = message.key.participant || message.key.remoteJid;
    const canCall = message.key.fromMe || await isOwnerOrSudo(senderId, sock, chatId);

    if (!canCall) {
        await sock.sendMessage(chatId, {
            text: 'Command hii inapatikana kwa owner/sudo pekee.',
        }, { quoted: message });
        return;
    }

    const phoneNumber = String(args[0] || '').replace(/\D/g, '');
    const durationSeconds = Number(args[1] || 30);
    const audioArgument = args.slice(2).join(' ').trim();

    if (!/^\d{8,15}$/.test(phoneNumber) || !Number.isInteger(durationSeconds) || durationSeconds < 10 || durationSeconds > 60) {
        await sock.sendMessage(chatId, {
            text: 'Matumizi: .call <namba> [sekunde 10-60] [faili.mp3|faili.wav]\nBila faili, audio ya raw GitHub itatumika.\nMfano: .call 255712345678 30',
        }, { quoted: message });
        return;
    }

    let audioSource;
    if (audioArgument) {
        audioSource = path.resolve(process.cwd(), audioArgument);
        if (!/\.(mp3|wav)$/i.test(audioSource) || !fs.existsSync(audioSource)) {
            await sock.sendMessage(chatId, {
                text: 'Faili la audio halijapatikana. Tumia faili lililopo la MP3 au WAV.',
            }, { quoted: message });
            return;
        }
    } else {
        try {
            audioSource = await getDefaultAudioPath();
        } catch (error) {
            await sock.sendMessage(chatId, {
                text: `Imeshindikana kupakua audio ya raw GitHub: ${error?.message || error}`,
            }, { quoted: message });
            return;
        }
    }

    if (activeSockets.has(sock)) {
        await sock.sendMessage(chatId, {
            text: 'Tayari kuna voice call inayoendelea.',
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
            throw new Error(`ffmpeg haipatikani au haiwezi kuanzishwa: ${ffmpegCheck.error?.message || ffmpegPath}`);
        }
        const ffmpegDirectory = path.dirname(ffmpegPath);
        const pathEntries = (process.env.PATH || '').split(path.delimiter);
        if (!pathEntries.includes(ffmpegDirectory)) {
            process.env.PATH = [ffmpegDirectory, ...pathEntries].filter(Boolean).join(path.delimiter);
        }

        await sock.sendMessage(chatId, {
            text: `Inaanzisha voice call kwenda +${phoneNumber}...`,
        }, { quoted: message });

        const authenticatedJid = sock.user?.id ||
            sock.authState?.creds?.me?.id ||
            sock.authState?.creds?.me?.jid;
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
        const call = await voip.call(phoneNumber, audioSource, '360p', {
            autoEndCall: false,
        });

        call.on('ringing', () => {
            void sock.sendMessage(chatId, { text: `Simu inaita +${phoneNumber}...` }).catch(() => {});
        });
        call.on('connected', () => {
            void sock.sendMessage(chatId, { text: 'Voice call imeunganishwa.' }).catch(() => {});
        });
        call.on('item', (item) => {
            console.log('[CALL/VOIP] Media item started:', item);
        });
        call.on('playlist_ended', () => {
            console.log('[CALL/VOIP] Audio playlist ended.');
        });

        let callError = null;
        const hangupCall = () => {
            void call.hangup().catch((hangupError) => {
                console.error('[CALL/VOIP] Hangup failed:', hangupError?.message || hangupError);
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
            text: `Voice call imeisha (${reason}).`,
        }, { quoted: message });
    } catch (error) {
        console.error('[CALL] Voice call failed:', error?.message || error);
        await sock.sendMessage(chatId, {
            text: `Imeshindikana kupiga voice call: ${error?.message || 'hitilafu isiyojulikana'}.`,
        }, { quoted: message });
    } finally {
        activeSockets.delete(sock);
    }
}

callCommand.description = 'Piga voice call ya WhatsApp (owner/sudo pekee)';
callCommand.category = 'OWNER';

module.exports = callCommand;
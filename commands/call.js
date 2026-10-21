const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const activeSockets = new WeakSet();
const voipClients = new WeakMap();
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
        await sock.sendMessage(chatId, {
            text: `Inaanzisha voice call kwenda +${phoneNumber}...`,
        }, { quoted: message });

        if (!sock.user || !sock.ws || sock.ws.readyState !== 1) {
            throw new Error('Socket ya Baileys haijaunganishwa bado.');
        }

        let voip = voipClients.get(sock);
        if (!voip) {
            const { makeVoipClient } = await import('@whiskeysockets/baileys');
            if (typeof makeVoipClient !== 'function') {
                throw new Error('makeVoipClient haipatikani kwenye Baileys hii.');
            }
            voip = await makeVoipClient(sock, { debug: false });
            voipClients.set(sock, voip);
        }

        const call = await voip.call(phoneNumber, {
            audioSource,
            durationMs: durationSeconds * 1000,
        });

        call.on('ringing', () => {
            void sock.sendMessage(chatId, { text: `Simu inaita +${phoneNumber}...` }).catch(() => {});
        });
        call.on('connected', () => {
            void sock.sendMessage(chatId, { text: 'Voice call imeunganishwa.' }).catch(() => {});
        });

        let callError = null;
        call.on('error', (error) => {
            callError = error;
            call.end();
        });

        const reason = await call.waitForEnd();
        if (callError) throw callError;

        await sock.sendMessage(chatId, {
            text: `Voice call imeisha (${reason}).`,
        }, { quoted: message });
    } catch (error) {
        console.error('[CALL] Voice call failed:', error?.message || error);
        await sock.sendMessage(chatId, {
            text: `Imeshindikana kupiga voice call: ${error?.message || 'hitilafu isiyojulikana'}. Hakikisha ffmpeg ipo kwenye PATH na Baileys ina VoIP enabled.`,
        }, { quoted: message });
    } finally {
        activeSockets.delete(sock);
    }
}

callCommand.description = 'Piga voice call ya WhatsApp (owner/sudo pekee)';
callCommand.category = 'OWNER';

module.exports = callCommand;
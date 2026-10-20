const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const activeSockets = new WeakSet();
const CALL_EVENTS = ['CB:call', 'CB:receipt'];

async function callCommand(sock, chatId, message, args = []) {
    const senderId = message.key.participant || message.key.remoteJid;
    const canCall = await isOwnerOrSudo(senderId, sock, chatId);

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
            text: 'Matumizi: .call <namba> [sekunde 10-60] [faili.mp3|faili.wav]\nMfano: .call 255712345678 30 salamu.mp3',
        }, { quoted: message });
        return;
    }

    let audioSource = 'silence';
    if (audioArgument) {
        audioSource = path.resolve(process.cwd(), audioArgument);
        if (!/\.(mp3|wav)$/i.test(audioSource) || !fs.existsSync(audioSource)) {
            await sock.sendMessage(chatId, {
                text: 'Faili la audio halijapatikana. Tumia faili lililopo la MP3 au WAV.',
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
    let client;
    const previousListeners = new Map();

    try {
        await sock.sendMessage(chatId, {
            text: `Inaanzisha voice call kwenda +${phoneNumber}...`,
        }, { quoted: message });

        const [callerModule, baileys] = await Promise.all([
            import('baileys-caller'),
            import('@whiskeysockets/baileys'),
        ]);
        const VoipClient = callerModule.VoipClient || callerModule.default?.VoipClient;
        if (typeof VoipClient !== 'function') {
            throw new Error('VoipClient haikupatikana kwenye baileys-caller.');
        }

        for (const eventName of CALL_EVENTS) {
            previousListeners.set(eventName, new Set(sock.ws.listeners(eventName)));
        }

        client = new VoipClient({ sock, baileys });
        await client.connect();

        const call = await client.call(phoneNumber, {
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
            text: `Imeshindikana kupiga voice call: ${error?.message || 'hitilafu isiyojulikana'}. Hakikisha ffmpeg ipo kwenye PATH.`,
        }, { quoted: message });
    } finally {
        if (client) {
            for (const eventName of CALL_EVENTS) {
                const existingListeners = previousListeners.get(eventName) || new Set();
                for (const listener of sock.ws.listeners(eventName)) {
                    if (!existingListeners.has(listener)) {
                        sock.ws.removeListener(eventName, listener);
                    }
                }
            }

            const originalEnd = sock.end;
            let suppressSocketEnd = true;
            try {
                sock.end = function (...endArgs) {
                    if (suppressSocketEnd) return;
                    return originalEnd.apply(this, endArgs);
                };
                client.disconnect();
            } catch (error) {
                console.error('[CALL] Caller cleanup failed:', error?.message || error);
            } finally {
                suppressSocketEnd = false;
                sock.end = originalEnd;
            }
        }
        activeSockets.delete(sock);
    }
}

callCommand.description = 'Piga voice call ya WhatsApp (owner/sudo pekee)';
callCommand.category = 'OWNER';

module.exports = callCommand;
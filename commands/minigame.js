const gameStore = globalThis.__miniGameStore || (globalThis.__miniGameStore = {});

function getSessionKey(chatId, senderId) {
    return `${String(chatId)}:${String(senderId)}`;
}

function formatHelp() {
    return [
        '🎮 *Mini Game: Number Guess*',
        '',
        'Cara pakai:',
        '• .minigame start',
        '• .minigame guess 12',
        '• .minigame reset',
        '',
        'Aturan:',
        '• Bot akan pilih angka acak 1-20',
        '• Kamu punya 5 kesempatan',
        '• Hint: terlalu tinggi / terlalu rendah',
        '• Menang = tebak angka dengan benar'
    ].join('\n');
}

async function minigameCommand(sock, chatId, msg, args = []) {
    try {
        const senderId = msg?.key?.participant || msg?.key?.remoteJid || msg?.sender || 'unknown';
        const text = (msg?.message?.conversation || msg?.message?.extendedTextMessage?.text || '').trim();
        const rawArgs = Array.isArray(args) ? args : String(args || '').trim().split(/\s+/).filter(Boolean);
        const action = (rawArgs[0] || '').toLowerCase();
        const guessedValue = rawArgs[1];

        if (!action || action === 'help' || action === 'menu') {
            await sock.sendMessage(chatId, { text: formatHelp() }, { quoted: msg });
            return;
        }

        const sessionKey = getSessionKey(chatId, senderId);
        const session = gameStore[sessionKey] || null;

        if (action === 'reset' || action === 'stop') {
            delete gameStore[sessionKey];
            await sock.sendMessage(chatId, {
                text: '🔄 Session mini game direset. Ketik *.minigame start* untuk mulai lagi.'
            }, { quoted: msg });
            return;
        }

        if (action === 'start') {
            const target = Math.floor(Math.random() * 20) + 1;
            gameStore[sessionKey] = {
                target,
                attempts: 0,
                maxAttempts: 5,
                startedAt: Date.now()
            };

            await sock.sendMessage(chatId, {
                text: '🎮 Mini game dimulai!\n\nSaya sudah memilih angka dari 1 sampai 20.\nKamu punya 5 kesempatan.\n\nTulis: *.minigame guess <angka>*'
            }, { quoted: msg });
            return;
        }

        if (action === 'guess') {
            if (!session) {
                await sock.sendMessage(chatId, {
                    text: '❌ Belum ada game aktif. Ketik *.minigame start* dulu.'
                }, { quoted: msg });
                return;
            }

            if (!guessedValue || Number.isNaN(Number(guessedValue))) {
                await sock.sendMessage(chatId, {
                    text: '❌ Masukkan angka yang valid. Contoh: *.minigame guess 12*'
                }, { quoted: msg });
                return;
            }

            const guess = Number(guessedValue);
            if (guess < 1 || guess > 20) {
                await sock.sendMessage(chatId, {
                    text: '⚠️ Angka harus berada di rentang 1-20.'
                }, { quoted: msg });
                return;
            }

            session.attempts += 1;

            if (guess === session.target) {
                delete gameStore[sessionKey];
                await sock.sendMessage(chatId, {
                    text: `🎉 *Benar!* Angka yang benar adalah *${session.target}*\nKamu berhasil menebak dalam ${session.attempts} percobaan.`
                }, { quoted: msg });
                return;
            }

            if (session.attempts >= session.maxAttempts) {
                delete gameStore[sessionKey];
                await sock.sendMessage(chatId, {
                    text: `💥 *Kesempatan habis!* Angka yang benar adalah *${session.target}*\nCoba lagi dengan *.minigame start*.`
                }, { quoted: msg });
                return;
            }

            const hint = guess < session.target ? '📈 Terlalu rendah' : '📉 Terlalu tinggi';
            const remaining = session.maxAttempts - session.attempts;

            await sock.sendMessage(chatId, {
                text: `${hint}\nSisa kesempatan: *${remaining}*\nCoba angka lain.`
            }, { quoted: msg });
            return;
        }

        if (!session && !action.startsWith('guess')) {
            await sock.sendMessage(chatId, {
                text: formatHelp()
            }, { quoted: msg });
            return;
        }

        await sock.sendMessage(chatId, { text: formatHelp() }, { quoted: msg });
    } catch (error) {
        console.error('MiniGame command error:', error);
        try {
            await sock.sendMessage(chatId, {
                text: '❌ Terjadi kesalahan saat menjalankan mini game.'
            }, { quoted: msg });
        } catch (_) {}
    }
}

minigameCommand.commandName = '.minigame';
minigameCommand.aliases = ['.guessgame', '.mg'];
minigameCommand.category = 'GAMES';
minigameCommand.description = 'Simple number guessing mini game';

module.exports = minigameCommand;

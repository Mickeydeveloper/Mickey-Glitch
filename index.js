/**
 * MICKEY GLITCH - A WhatsApp Bot
 * CUSTOM PAIRING - Uses Custom 8-digit code (MICKDADY)
 * MODERNISED CONSOLE UI & GITHUB IMAGE CONNECTION
 */

require("dotenv").config();
require("./settings");
const { assertValidBotName } = require('./lib/botGuard');
assertValidBotName();

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const pino = require("pino");
const NodeCache = require("node-cache");
const readline = require("readline");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys");

const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require("./main");
const { handleAnticall } = require("./commands/anticall");
const { getButtonId, isButtonResponse, autoDetectButtonCommand, isCommandId } = require("./lib/buttonLoader");
const store = require("./lib/lightweight_store");
const settings = require("./settings");
const MickeyHelper = require("./lib/Mickey");

// Jaribu kupakia module ya Telegram (Telegram bot)
let startTelegramBot = null;
try {
    const telegramModule = require("./glitch/telegram-bot");
    startTelegramBot = telegramModule.startTelegramBot;
} catch (err) {
    // Puuza ikiwa haipo (silent fail)
}

// ────────────────────────────────────────────────
// LOGGER - SILENT FOR CLEAN CONSOLE
// ────────────────────────────────────────────────
const pinoLogger = pino({ level: process.env.BAILEYS_LOG_LEVEL || 'warn' });
const originalConsoleLog = console.log.bind(console);
const sensitiveSessionLogPattern = /closing (?:open )?session|sessionentry\s*\{/i;

const isSensitiveSessionDiagnostic = (args) => args.some(value =>
    (typeof value === 'string' && sensitiveSessionLogPattern.test(value)) ||
    (value && typeof value === 'object' &&
        value.registrationId !== undefined &&
        value.currentRatchet &&
        value._chains)
);

for (const method of ['info', 'warn', 'error', 'debug', 'dir']) {
    const original = console[method].bind(console);
    console[method] = (...args) => {
        if (isSensitiveSessionDiagnostic(args)) return;
        original(...args);
    };
}

const consoleTimestamp = () => chalk.hex('#6E7681')(
    new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).format(new Date())
);

console.log = (...args) => {
    if (isSensitiveSessionDiagnostic(args)) return;
    originalConsoleLog(chalk.hex('#00D4FF')('  ●'), consoleTimestamp(), ...args);
};

// --- Global Settings ---
const _botName = settings.botName || settings.botname || "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™";
global.botname = _botName;
global.botName = _botName;
global.themeemoji = '•';

// ────────────────────────────────────────────────
// PATHS & AUTO CLEANUP
// ────────────────────────────────────────────────
const SESSION_DIR = path.resolve(process.cwd(), 'session');
const TEMP_DIR = path.resolve(process.cwd(), 'tmp');
const CACHE_DIR = path.resolve(process.cwd(), 'cache');
const MEDIA_DIR = path.resolve(process.cwd(), 'media');
const CREDENTIAL_FILE_PATTERN = /^creds\.(?:json|js)(?:\.|$)/i;

function ensureDirectories() {
    [SESSION_DIR, TEMP_DIR, CACHE_DIR, MEDIA_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
}

// Inaitwa kwa mkono tu (manual) ikihitajika—haifutwi kila restart ili isivunje session keys
function cleanSessionFiles() {
    try {
        if (!fs.existsSync(SESSION_DIR)) return;

        let cleaned = 0;
        const cleanDirectory = (directory) => {
            for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
                const filePath = path.join(directory, entry.name);
                if (entry.isDirectory()) {
                    cleanDirectory(filePath);
                } else if (entry.isFile() && !CREDENTIAL_FILE_PATTERN.test(entry.name)) {
                    fs.unlinkSync(filePath);
                    cleaned++;
                }
            }
        };

        cleanDirectory(SESSION_DIR);
        if (cleaned > 0) {
            UI.warning(`Removed ${cleaned} session file(s); creds files were preserved and session keys may need to be regenerated.`);
        }
    } catch (error) {
        UI.warning(`Session cleanup skipped: ${error.message}`);
    }
}

function autoClean() {
    try {
        let cleaned = 0;
        [TEMP_DIR, CACHE_DIR, MEDIA_DIR].forEach(dir => {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                files.forEach(file => {
                    const filePath = path.join(dir, file);
                    try {
                        const stats = fs.statSync(filePath);
                        if (Date.now() - stats.mtimeMs > 3600000) {
                            if (stats.isDirectory()) {
                                fs.rmSync(filePath, { recursive: true, force: true });
                            } else {
                                fs.unlinkSync(filePath);
                            }
                            cleaned++;
                        }
                    } catch (_) {}
                });
            }
        });
        if (cleaned > 0) {
            console.log(chalk.cyan(`▓▒░ [CLEANER] auto-purged ${cleaned} temporary cache files.`));
        }
    } catch (_) {}
}

// ────────────────────────────────────────────────
// SESSION MANAGEMENT
// ────────────────────────────────────────────────
function clearSession() {
    try {
        if (fs.existsSync(SESSION_DIR)) {
            UI.warning('Clearing corrupted/expired session files...');
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
            UI.success('Session directory wiped successfully!');
        }
        ensureDirectories();
        return true;
    } catch (err) {
        UI.error(`Failed to clear session: ${err.message}`);
        return false;
    }
}

// ────────────────────────────────────────────────
// READLINE FOR CONSOLE INPUT
// ────────────────────────────────────────────────
let rl = null;
let isPairing = false;
let pairingAttempts = 0;

function createReadline() {
    if (rl) {
        try { rl.close(); } catch (_) {}
        rl = null;
    }
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return rl;
}

async function askPhoneNumber() {
    return new Promise((resolve) => {
        const readlineInterface = createReadline();

        console.log('\n' + chalk.cyan.bold('┌────────────────────────────────────────────────────────┐'));
        console.log(chalk.cyan.bold('│') + chalk.bgCyan.black.bold('              📱 WHATSAPP PAIRING INTERFACE             ') + chalk.cyan.bold('│'));
        console.log(chalk.cyan.bold('└────────────────────────────────────────────────────────┘'));
        console.log(chalk.dim('  Ingiza namba ya simu ya WhatsApp (Mfano: 255612130873)'));
        console.log('');

        readlineInterface.question(chalk.cyan.bold('  ⚡ Namba yako ➜ '), (answer) => {
            let num = answer.trim().replace(/[^0-9]/g, '');
            if (!num.startsWith("255")) {
                num = "255" + num;
            }
            UI.success(`Namba imethibitishwa: ${num}`);
            try { readlineInterface.close(); } catch (_) {}
            if (rl === readlineInterface) rl = null;
            resolve(num);
        });
    });
}

// Initialize store & periodic save
try {
    store.readFromFile();
} catch (_) {}

setInterval(() => {
    if (typeof store.writeToFile === 'function') {
        Promise.resolve(store.writeToFile()).catch(err => {
            console.error('[Store] Periodic persistence failed:', err?.stack || err);
        });
    }
}, settings.storeWriteInterval || 10000);

// Safisha temp/cache kila saa 1 ili RAM/disk isijae baada ya siku kadhaa
setInterval(() => {
    autoClean();
}, 60 * 60 * 1000);

// ────────────────────────────────────────────────
// ULTRA-MODERN UI COMPONENTS
// ────────────────────────────────────────────────
const UI = {
    success: (text) => console.log(chalk.bgGreenBright.black.bold(' SUCCESS ') + chalk.greenBright('  ✔ ') + chalk.white(text)),
    error: (text) => console.log(chalk.bgRedBright.black.bold(' ERROR ') + chalk.redBright('  ✖ ') + chalk.white(text)),
    warning: (text) => console.log(chalk.bgYellowBright.black.bold(' WARNING ') + chalk.yellowBright('  ▲ ') + chalk.white(text)),
    info: (text) => console.log(chalk.bgBlueBright.black.bold(' INFO ') + chalk.cyanBright('  ◆ ') + chalk.hex('#C9D1D9')(text)),
    divider: () => console.log(chalk.hex('#30363D')('  ─'.repeat(54))),
    banner: () => {
        console.clear();
        console.log(chalk.magentaBright.bold(`
  ███╗   ███╗██╗ ██████╗██╗  ██╗███████╗██╗   ██╗
  ████╗ ████║██║██╔════╝██║ ██╔╝██╔════╝╚██╗ ██╔╝
  ██╔████╔██║██║██║     █████╔╝ █████╗   ╚████╔╝ 
  ██║╚██╔╝██║██║██║     ██╔═██╗ ██╔══╝    ╚██╔╝  
  ██║ ╚═╝ ██║██║╚██████╗██║  ██╗███████╗   ██║   
  ╚═╝     ╚═╝╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝   `));
        console.log(chalk.hex('#FF4FD8')('  GLITCH ') + chalk.hex('#00D4FF').bold('BOT CORE') + chalk.hex('#6E7681')('  •  SYSTEM v3.1  •  LIVE') + '\n');
    }
};

// ────────────────────────────────────────────────
// MAIN BOT FUNCTION & SOCKET CLEANUP
// ────────────────────────────────────────────────
let whatsappBot = null;
let isWhatsAppRunning = false;
let reconnectAttempts = 0;
let isStartingBot = false;
let startupCleanupDone = false;
let inboundUpdateCount = 0;
let ignoredUpsertCount = 0;
let lastInboundAt = 0;
let lastInboundType = 'none';

async function cleanupPreviousSocket() {
    if (!whatsappBot) return;
    const prevBot = whatsappBot;
    whatsappBot = null;

    try {
        if (prevBot.ev && typeof prevBot.ev.removeAllListeners === 'function') {
            prevBot.ev.removeAllListeners();
        }
    } catch (_) {}

    try {
        if (prevBot.ws && typeof prevBot.ws.close === 'function') {
            prevBot.ws.close();
        } else if (typeof prevBot.end === 'function') {
            prevBot.end();
        }
    } catch (_) {}
}

async function startMickeyBot() {
    if (isStartingBot) return whatsappBot;
    isStartingBot = true;

    try {
        isWhatsAppRunning = false;
        await cleanupPreviousSocket();
        ensureDirectories();

        if (!startupCleanupDone) {
            autoClean();
            startupCleanupDone = true;
        }

        UI.banner();

        const { version } = await fetchLatestBaileysVersion();
        console.log(chalk.bgHex('#161B22').hex('#00D4FF').bold(' CORE ') + chalk.hex('#00D4FF')('  Engine'), chalk.greenBright(`Baileys v${version.join('.')}`));

        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

        const hasSession = state.creds?.registered === true;
        console.log(chalk.bgHex('#161B22').hex('#7D5FFF').bold(' AUTH ') + chalk.hex('#7D5FFF')('  Security'), hasSession ? chalk.greenBright('Session Loaded ✓') : chalk.yellowBright('Waiting for authentication'));

        const msgRetryCounterCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

        const Mickey = makeWASocket({
            version,
            logger: pinoLogger,
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "120.0.0.0"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }).child({ level: 'silent' }))
            },
            markOnlineOnConnect: true,
            syncFullHistory: false,
            generateHighQualityLinkPreview: true,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            patchMessageBeforeSending: (message) => {
                const requiresPatch = !!(message.buttonsMessage || message.templateMessage || message.listMessage);
                if (requiresPatch) {
                    message = {
                        viewOnceMessage: {
                            message: {
                                messageContextInfo: {
                                    deviceListMetadataVersion: 2,
                                    deviceListMetadata: {},
                                },
                                ...message,
                            },
                        },
                    };
                }
                return message;
            },
            getMessage: async (key) => {
                if (!key || !key.id) return undefined;
                try {
                    const jid = key.remoteJid || key.participant || key.sender || '';
                    if (typeof store.loadMessage === 'function') {
                        const msg = await store.loadMessage(jid, key.id);
                        return msg?.message || undefined;
                    }
                } catch (_) {}
                return undefined;
            },
            msgRetryCounterCache
        });

        whatsappBot = Mickey;

        Mickey.ev.on("creds.update", () => {
            Promise.resolve(saveCreds()).catch(err => {
                console.error('[Auth] Failed to persist updated credentials:', err?.stack || err);
            });
        });

        if (typeof store.bind === 'function') {
            try {
                store.bind(Mickey.ev);
            } catch (e) {
                UI.warning(`Store bind skipped: ${e.message}`);
            }
        }

        // --- Message Handler with Decrypt Error Recovery ---
        Mickey.ev.on("messages.upsert", chatUpdate => {
            const messages = Array.isArray(chatUpdate?.messages) ? chatUpdate.messages : [];
            inboundUpdateCount += messages.length;
            if (messages.length) {
                lastInboundAt = Date.now();
                lastInboundType = chatUpdate?.type || 'unknown';
            }
            if (chatUpdate?.type !== 'notify') ignoredUpsertCount += messages.length;

            for (const mek of messages) {
                const messageUpdate = { ...chatUpdate, messages: [mek] };
                void (async () => {
                    const startedAt = Date.now();
                    const chatId = mek?.key?.remoteJid || 'unknown';
                    const messageId = mek?.key?.id || 'unknown';
                    const timeoutWarning = setTimeout(() => {
                        console.warn(`[Message Handler] Still processing after 30s (chat=${chatId}, message=${messageId}, type=${chatUpdate?.type || 'unknown'})`);
                    }, 30000);
                    timeoutWarning.unref?.();

                    try {
                        if (!mek?.message) return;

                        if (isButtonResponse && isButtonResponse(mek)) {
                            const buttonId = getButtonId && getButtonId(mek);
                            if (buttonId && isCommandId && isCommandId(buttonId)) {
                                const command = autoDetectButtonCommand && autoDetectButtonCommand(mek);
                                if (command) {
                                    mek.message.conversation = command;
                                    mek.message.extendedTextMessage = null;
                                    await handleMessages(Mickey, messageUpdate, true);
                                    return;
                                }
                            }
                        }

                        if (mek.key?.remoteJid === "status@broadcast") {
                            if (handleStatus) await handleStatus(Mickey, messageUpdate);
                            return;
                        }

                        if (handleMessages) await handleMessages(Mickey, messageUpdate, true);
                    } catch (err) {
                        if (err?.message?.includes('storeMessage is not a function')) {
                            console.log(chalk.red(`  [Message Handler] KOSA: storeMessage haipo kwenye lib/lightweight_store.js.`));
                        } else if (err?.message?.includes('decrypt') || err?.message?.includes('session') || err?.message?.includes('No session')) {
                            console.warn(`[Session] Decrypt error (chat=${chatId}, message=${messageId}): ${err?.message || err}`);
                        } else {
                            console.error(`[Message Handler] Failed (chat=${chatId}, message=${messageId}, type=${chatUpdate?.type || 'unknown'}):`, err?.stack || err);
                        }
                    } finally {
                        clearTimeout(timeoutWarning);
                        if (Date.now() - startedAt > 30000) {
                            console.warn(`[Message Handler] Completed after ${Date.now() - startedAt}ms (chat=${chatId}, message=${messageId})`);
                        }
                    }
                })();
            }
        });

        // --- Call Handler with Error Recovery ---
        Mickey.ev.on("call", async (callData) => {
            try {
                if (handleAnticall) await handleAnticall(Mickey, { call: callData });
            } catch (err) {
                console.log(chalk.dim(`  [Call Handler] Error: ${err?.message?.substring(0, 40)}`));
            }
        });

        // --- Group Participant Handler with Error Recovery ---
        Mickey.ev.on("group-participants.update", async (update) => {
            try {
                if (handleGroupParticipantUpdate) await handleGroupParticipantUpdate(Mickey, update);
            } catch (err) {
                console.log(chalk.dim(`  [Group Update] Error: ${err?.message?.substring(0, 40)}`));
            }
        });

        // --- Error Event Handler ---
        Mickey.ev.on("error", (err) => {
            const msg = err?.message || String(err);
            if (msg.includes('decrypt') || msg.includes('no session') || msg.includes('No session')) {
                console.log(chalk.dim(`  [Session Error] ${msg.substring(0, 60)}... (non-critical)`));
            } else {
                console.log(chalk.yellow(`  [Error] ${msg}`));
            }
        });

        // --- Connection Handler ---
        Mickey.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === "open") {
                isWhatsAppRunning = true;
                reconnectAttempts = 0;
                isPairing = false;
                pairingAttempts = 0;

                console.log('\n' + chalk.bgGreenBright.black.bold('  CORE ONLINE  ') + chalk.greenBright('  System synchronized with WhatsApp.\n'));

                const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);

                console.log(chalk.bgHex('#161B22').hex('#00D4FF').bold(' BOT METRICS '));
                console.log(chalk.hex('#30363D')('  ├─ ') + chalk.hex('#C9D1D9')('User') + chalk.hex('#30363D')(' ─── ') + chalk.greenBright(Mickey.user?.id?.split(':')[0] || 'Unknown'));
                console.log(chalk.hex('#30363D')('  ├─ ') + chalk.hex('#C9D1D9')('Memory') + chalk.hex('#30363D')(' ─ ') + chalk.yellowBright(`${ramUsage} MB`));
                console.log(chalk.hex('#30363D')('  └─ ') + chalk.hex('#C9D1D9')('State') + chalk.hex('#30363D')(' ─── ') + chalk.greenBright('LIVE'));
                UI.divider();

                try {
                    await MickeyHelper.handleConnection(Mickey, UI);
                } catch (e) {
                    UI.warning('Connection helper failed: ' + (e?.message || e));
                }

                if (rl) {
                    try { rl.close(); } catch (_) {}
                    rl = null;
                }
            }

            if (connection === "close") {
                isWhatsAppRunning = false;
                await cleanupPreviousSocket();

                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const errorMessage = lastDisconnect?.error?.message || 'Unknown';

                const isDecryptError = /decrypt|no session|session|bad mac/i.test(errorMessage);

                if (isDecryptError) {
                    UI.info(`Session error (recoverable): ${errorMessage.substring(0, 50)}...`);
                    UI.warning('Session credentials and valid key files were preserved for reconnect.');
                } else {
                    UI.warning(`Link disrupted: ${errorMessage.substring(0, 60)}`);
                }

                if (statusCode === DisconnectReason.loggedOut) {
                    UI.error('Session structure revoked (Logged Out). Flashing memory...');
                    clearSession();
                    reconnectAttempts = 0;
                    isStartingBot = false;
                    await delay(3000);
                    return startMickeyBot();
                }

                if (statusCode === DisconnectReason.connectionClosed || statusCode === DisconnectReason.connectionLost) {
                    UI.info('Connection lost, attempting reconnect...');
                }

                if (reconnectAttempts < 20) {
                    const delayTime = Math.min(3000 + (reconnectAttempts * 1500), 45000);
                    reconnectAttempts++;
                    console.log(chalk.cyan(`  🔄 [RECONNECT] Attempting re-entry in ${(delayTime / 1000).toFixed(1)}s... (${reconnectAttempts}/20)`));
                    isStartingBot = false;
                    await delay(delayTime);
                    return startMickeyBot();
                } else {
                    UI.error('Max reconnection threshold reached. Manual restart mandatory.');
                    process.exit(1);
                }
            }
        });

        // ────────────────────────────────────────────────
        // PAIRING - INJECTING CUSTOM CODE "MICKDADY"
        // ────────────────────────────────────────────────
        if (!hasSession && !isPairing) {
            isPairing = true;
            let keepAliveInterval = null;
            let pairingTimeout = null;

            const stopPairingTimers = () => {
                if (keepAliveInterval) {
                    clearInterval(keepAliveInterval);
                    keepAliveInterval = null;
                }
                if (pairingTimeout) {
                    clearTimeout(pairingTimeout);
                    pairingTimeout = null;
                }
            };

            try {
                const phoneNumber = await askPhoneNumber();
                UI.info('Intercepting token stream and pushing custom signature...');

                await delay(3000);

                await Mickey.requestPairingCode(phoneNumber, "MICKDADY");

                console.log('\n' + chalk.magenta.bold('  ┌────────────────────────────────────────────────────────┐'));
                console.log(chalk.magenta.bold('  │') + chalk.bgMagenta.black.bold('              🔐 CUSTOM WHATSAPP PAIRING CODE             ') + chalk.magenta.bold('  │'));
                console.log(chalk.magenta.bold('  ├────────────────────────────────────────────────────────┤'));
                console.log(chalk.magenta.bold('  │') + chalk.white.bold('   Nenda: WhatsApp ➜ Settings ➜ Linked Devices ➜ Link    ') + chalk.magenta.bold('│'));
                console.log(chalk.magenta.bold('  │') + chalk.white.bold('   Kisha chagua "Link with phone number instead"        ') + chalk.magenta.bold('│'));
                console.log(chalk.magenta.bold('  ├────────────────────────────────────────────────────────┤'));
                console.log(chalk.magenta.bold('  │') + chalk.greenBright.bold('               👉    M I C K D A D Y    👈               ') + chalk.magenta.bold('│'));
                console.log(chalk.magenta.bold('  └────────────────────────────────────────────────────────┘\n'));

                UI.info('Waiting for authorization handshakes... (10-30s)');

                keepAliveInterval = setInterval(() => {
                    if (isWhatsAppRunning && typeof Mickey.sendPresenceUpdate === 'function') {
                        void Mickey.sendPresenceUpdate('available').catch(() => {});
                        stopPairingTimers();
                    }
                }, 5000);

                pairingTimeout = setTimeout(() => {
                    stopPairingTimers();
                    isPairing = false;
                }, 120000);
            } catch (err) {
                stopPairingTimers();
                isPairing = false;
                UI.error('Pairing pipeline blocked: ' + err.message);
                if (pairingAttempts < 3) {
                    pairingAttempts++;
                    isStartingBot = false;
                    await delay(5000);
                    return startMickeyBot();
                }
            }
        }

        return Mickey;
    } catch (err) {
        UI.error('Critical exception detected: ' + err.message);
        isStartingBot = false;
        await delay(5000);
        return startMickeyBot();
    } finally {
        isStartingBot = false;
    }
}

// ────────────────────────────────────────────────
// KEEP ALIVE & MONITORING
// ────────────────────────────────────────────────
function startKeepAlive() {
    setInterval(() => {
        if (whatsappBot && isWhatsAppRunning && typeof whatsappBot.sendPresenceUpdate === 'function') {
            void whatsappBot.sendPresenceUpdate('available').catch(() => {});
        }
        const status = isWhatsAppRunning ? chalk.greenBright('ONLINE') : chalk.redBright('OFFLINE');
        const ram = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
        const inboundAge = lastInboundAt ? `${Math.floor((Date.now() - lastInboundAt) / 60000)}m ago` : 'none yet';
        const heap = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        console.log(chalk.hex('#30363D')('  ├─') + chalk.bgHex('#161B22').hex('#C9D1D9').bold(' MONITOR ') + chalk.hex('#30363D')('  status ') + status + chalk.hex('#30363D')('  •  RSS ') + chalk.yellowBright(`${ram} MB`) + chalk.hex('#30363D')('  •  Heap ') + chalk.yellowBright(`${heap} MB`));
        console.log(chalk.hex('#30363D')('  └─') + chalk.hex('#C9D1D9')(` inbound updates=${inboundUpdateCount}, ignored non-notify=${ignoredUpsertCount}, last=${lastInboundType} ${inboundAge}`));
    }, 5 * 60 * 1000);
}

// ────────────────────────────────────────────────
// INITIALIZATION ENTRYPOINT
// ────────────────────────────────────────────────
async function initializeBot() {
    UI.banner();
    startKeepAlive();

    const hasTelegramToken = settings.telegram?.botToken && settings.telegram.botToken?.trim()?.length > 0;

    if (hasTelegramToken && startTelegramBot) {
        try {
            await startTelegramBot();
            UI.success('Telegram mainframe operational.');
        } catch (err) {
            UI.warning(`Telegram linkage error: ${err.message}`);
        }
    } else {
        UI.info('WhatsApp standalone operation active.');
    }

    await startMickeyBot();

    process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n  👋 Terminating bot processes...'));
        await cleanupPreviousSocket();
        if (rl) { try { rl.close(); } catch (_) {} }
        process.exit(0);
    });
}

initializeBot().catch(err => {
    UI.error(`Fatal crash: ${err.message}`);
    process.exit(1);
});

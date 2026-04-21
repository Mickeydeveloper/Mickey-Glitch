require('./settings')
const settings = require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const pino = require("pino")
const path = require('path')
const customLogger = require('./lib/silentLogger')
const { TextValidator, DeliveryTracker, sendTextWithRetry } = require('./lib/textHandler')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay,
    jidNormalizedUser
} = require("@whiskeysockets/baileys")

// Boresha Logger kuzuia Buffer Timeout
const logger = pino({ 
    level: 'silent', // Zima logi zisizo na lazima kuzuia mzigo
    sync: false 
})

// Delivery Tracker instance
const deliveryTracker = new DeliveryTracker()

// RAM Management - Garbage Collection
if (typeof global.gc === 'function') {
    setInterval(() => { global.gc(); }, 3 * 60 * 1000); // Kila baada ya dk 3
}

// Periodic cleanup of old delivery records
setInterval(() => {
    deliveryTracker.cleanup(3600000); // Remove records older than 1 hour
}, 600000); // Every 10 minutes

// Log delivery stats periodically
setInterval(() => {
    const stats = deliveryTracker.getStats();
    console.log(chalk.cyan(`📊 Delivery Stats: ${stats.delivered}✅ ${stats.failed}❌ ${stats.pending}⏳ (Success: ${stats.successRate}%)`));
}, 300000); // Every 5 minutes

// Text Quality & Validation Module
const textValidator = {
    sanitizeText: (text) => {
        if (!text) return '';
        return String(text)
            .trim()
            .replace(/\0/g, '') // Remove null characters
            .replace(/[\u0000-\u001F]/g, '') // Remove control characters
            .substring(0, 4096); // WhatsApp limit
    },
    
    isValidText: (text) => {
        if (!text || typeof text !== 'string') return false;
        if (text.trim().length === 0) return false;
        if (text.length > 4096) return false;
        return true;
    },
    
    isHighQuality: (text) => {
        const cleaned = String(text).trim();
        return cleaned.length >= 1 && cleaned.length <= 4096;
    }
};

// Message Queue for Reliable Delivery
class MessageQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.maxRetries = 3;
        this.retryDelay = 2000;
    }

    async add(job) {
        this.queue.push({
            ...job,
            retries: 0,
            timestamp: Date.now()
        });
        this.process();
    }

    async process() {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const job = this.queue[0];
            try {
                await job.execute();
                this.queue.shift();
                await delay(500); // Rate limiting
            } catch (err) {
                job.retries++;
                if (job.retries >= this.maxRetries) {
                    console.error(chalk.red(`❌ Message delivery failed after ${this.maxRetries} retries`));
                    this.queue.shift();
                } else {
                    console.warn(chalk.yellow(`⚠️  Retrying message (${job.retries}/${this.maxRetries})...`));
                    await delay(this.retryDelay);
                }
            }
        }

        this.processing = false;
    }
}

const messageQueue = new MessageQueue();

// Connection Status Tracker
class ConnectionTracker {
    constructor() {
        this.status = 'disconnected';
        this.lastConnect = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    setStatus(status) {
        this.status = status;
        if (status === 'connected') {
            this.lastConnect = Date.now();
            this.reconnectAttempts = 0;
        }
    }

    getStatus() {
        return this.status;
    }

    canReconnect() {
        return this.reconnectAttempts < this.maxReconnectAttempts;
    }

    incrementReconnectAttempts() {
        this.reconnectAttempts++;
    }

    resetReconnectAttempts() {
        this.reconnectAttempts = 0;
    }

    getUptime() {
        if (!this.lastConnect) return 0;
        return Date.now() - this.lastConnect;
    }
}

const connectionTracker = new ConnectionTracker();

// Global Error Handler (Silent Mode kwa Errors za kijinga)
const silentErrors = ['Bad MAC', 'SessionError', 'Failed to decrypt', 'status@broadcast', 'skmsg'];
const isSilentError = (err) => silentErrors.some(msg => err?.includes(msg));

process.on('uncaughtException', (err) => {
    if (isSilentError(err.message)) return;
    console.error('Critical Error:', err);
});

process.on('unhandledRejection', (reason) => {
    if (isSilentError(reason?.message)) return;
    // Zuia kufurika kwa logi za [ERROR] kwenye console
});

const { handleMessages, handleStatus } = require('./main')

async function startXeonBotInc() {
    const { state, saveCreds } = await useMultiFileAuthState(`./session`)
    const { version } = await fetchLatestBaileysVersion()

    const XeonBotInc = makeWASocket({
        version,
        logger: logger,
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"], 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => { return { conversation: 'Mickey Glitch' } },
        shouldSyncHistoryMessage: () => false,
        syncFullHistory: false,
        retryRequestDelayMs: 100,
        shouldCacheMediasFromThisJid: () => false,
        fireInitQueries: false,
        maxMsgsInMemory: 100,
        emitOwnEvents: false,
        // Boresha connection settings
        keepAliveIntervalMs: 10000,
        linkPreviewImageThumbnailWidth: 192,
        transactionTimeout: 60000,
        defaultQueryTimeoutMs: 0,
        reqTimeout: 30000
    })

    // Enhanced Send Message wrapper with delivery confirmation
    XeonBotInc.sendTextWithConfirmation = async (chatId, text, options = {}) => {
        try {
            // Validate text quality
            if (!textValidator.isValidText(text)) {
                console.warn(chalk.yellow(`⚠️  Invalid text format. Cleaning...`));
                text = textValidator.sanitizeText(text);
                if (!textValidator.isValidText(text)) {
                    throw new Error('Text failed validation after sanitization');
                }
            }

            // Ensure text is high quality
            const cleanText = textValidator.sanitizeText(text);
            
            // Send message
            const sentMsg = await XeonBotInc.sendMessage(chatId, { text: cleanText }, options);
            
            // Log delivery
            if (sentMsg && sentMsg.key) {
                console.log(chalk.green(`✅ Message delivered to ${chatId}`));
                return {
                    success: true,
                    messageId: sentMsg.key.id,
                    timestamp: new Date(),
                    chatId: chatId
                };
            }
            return { success: false };
        } catch (err) {
            console.error(chalk.red(`❌ Send text error: ${err.message}`));
            return { success: false, error: err.message };
        }
    };

    // PAIRING LOGIC
    if (!XeonBotInc.authState.creds.registered) {
        let phoneNumber = settings.ownerNumber.replace(/[^0-9]/g, '')
        await delay(10000) 
        try {
            let code = await XeonBotInc.requestPairingCode(phoneNumber, "MICKDADY")
            code = code?.match(/.{1,4}/g)?.join("-") || code
            console.log(chalk.black(chalk.bgGreen(`\n PAIRING CODE: ${code} \n`)))
        } catch (e) {}
    }

    XeonBotInc.ev.on('creds.update', saveCreds)

    XeonBotInc.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        
        if (qr) console.log(chalk.yellow(`📱 SCAN QR CODE`))
        if (connection === "connecting") {
            console.log(chalk.blue(`🔄 Connecting...`))
            connectionTracker.setStatus('connecting');
        }
        
        if (connection === "open") {
            console.log(chalk.green(`✅ ${settings.botName} IS ONLINE!`))
            connectionTracker.setStatus('connected');
            connectionTracker.resetReconnectAttempts();
            
            // Owner Notification
            try {
                const ownerJid = jidNormalizedUser(XeonBotInc.user.id)
                const startup = textValidator.sanitizeText(`🚀 *MICKEY GLITCH V3* is now Active!\n⏰ ${new Date().toLocaleString()}`);
                await XeonBotInc.sendTextWithConfirmation(ownerJid, startup);
            } catch (e) {
                console.error(chalk.red(`⚠️  Failed to send startup notification`));
            }
        }

        if (connection === 'close') {
            connectionTracker.setStatus('disconnected');
            let reason = new Boom(lastDisconnect?.error)?.output?.statusCode
            
            if (reason !== DisconnectReason.loggedOut) {
                connectionTracker.incrementReconnectAttempts();
                
                if (connectionTracker.canReconnect()) {
                    console.log(chalk.yellow(`🔄 Reconnecting... (${connectionTracker.reconnectAttempts}/${connectionTracker.maxReconnectAttempts})`))
                    await delay(3000);
                    startXeonBotInc()
                } else {
                    console.error(chalk.red(`❌ Max reconnection attempts reached. Please restart the bot.`));
                }
            } else {
                console.log(chalk.red(`🚫 Logged out. Please re-authenticate.`));
            }
        }
    })

    XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = chatUpdate.messages[0]
            if (!mek.message || (mek.key && mek.key.remoteJid === 'status@broadcast')) return

            // Validate message text if it exists
            const messageText = mek.message?.conversation || mek.message?.extendedTextMessage?.text || '';
            if (messageText && typeof messageText === 'string') {
                if (!textValidator.isHighQuality(messageText)) {
                    console.warn(chalk.yellow(`⚠️  Message quality issue detected, processing anyway...`));
                }
            }

            await Promise.all([
                handleMessages(XeonBotInc, chatUpdate),
                handleStatus(XeonBotInc, chatUpdate)
            ]).catch((err) => {
                console.error(chalk.red(`Message handling error: ${err.message}`));
            })
        } catch (err) {
            console.error(chalk.red(`Upsert handler error: ${err.message}`));
        }
    })

    return XeonBotInc
}

startXeonBotInc()

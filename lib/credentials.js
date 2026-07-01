/**
 * CREDENTIALS MANAGER - Handles WhatsApp Pairing Data
 * Stores pairing session, phone number, and connection status
 */

const fs = require('fs');
const path = require('path');

const CREDS_DIR = path.resolve(process.cwd(), 'data');
const CREDS_FILE = path.join(CREDS_DIR, 'whatsapp-creds.json');

// Ensure credentials directory exists
function ensureCredsDir() {
    if (!fs.existsSync(CREDS_DIR)) {
        fs.mkdirSync(CREDS_DIR, { recursive: true });
    }
}

/**
 * Initialize/create empty credentials file
 */
function initCredsFile() {
    ensureCredsDir();
    if (!fs.existsSync(CREDS_FILE)) {
        const defaultCreds = {
            paired: false,
            phoneNumber: null,
            pairingCode: null,
            sessionId: null,
            pairedAt: null,
            telegramChatId: null,
            lastUpdate: new Date().toISOString()
        };
        fs.writeFileSync(CREDS_FILE, JSON.stringify(defaultCreds, null, 2), 'utf8');
        return defaultCreds;
    }
    return readCreds();
}

/**
 * Read credentials from file
 */
function readCreds() {
    try {
        ensureCredsDir();
        if (!fs.existsSync(CREDS_FILE)) {
            return initCredsFile();
        }
        const raw = fs.readFileSync(CREDS_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        console.error(`[CREDS] Error reading credentials: ${error.message}`);
        return {
            paired: false,
            phoneNumber: null,
            pairingCode: null,
            sessionId: null,
            pairedAt: null,
            telegramChatId: null,
            lastUpdate: new Date().toISOString()
        };
    }
}

/**
 * Write credentials to file
 */
function writeCreds(data) {
    try {
        ensureCredsDir();
        const updated = {
            ...readCreds(),
            ...data,
            lastUpdate: new Date().toISOString()
        };
        fs.writeFileSync(CREDS_FILE, JSON.stringify(updated, null, 2), 'utf8');
        return updated;
    } catch (error) {
        console.error(`[CREDS] Error writing credentials: ${error.message}`);
        return null;
    }
}

/**
 * Get current paired phone number
 */
function getPairedNumber() {
    const creds = readCreds();
    return creds.paired ? creds.phoneNumber : null;
}

/**
 * Check if already paired
 */
function isPaired() {
    const creds = readCreds();
    return creds.paired === true && !!creds.phoneNumber;
}

/**
 * Set pairing in progress
 */
function setPairingInProgress(phoneNumber, telegramChatId, pairingCode = null) {
    return writeCreds({
        paired: false,
        phoneNumber: phoneNumber,
        pairingCode: pairingCode,
        telegramChatId: telegramChatId,
        sessionId: `session_${Date.now()}`
    });
}

/**
 * Mark as successfully paired
 */
function markAsPaired(phoneNumber, telegramChatId, sessionId = null) {
    return writeCreds({
        paired: true,
        phoneNumber: phoneNumber,
        telegramChatId: telegramChatId,
        sessionId: sessionId || `session_${Date.now()}`,
        pairedAt: new Date().toISOString()
    });
}

/**
 * Clear pairing (unpair)
 */
function clearPairing() {
    return writeCreds({
        paired: false,
        phoneNumber: null,
        pairingCode: null,
        sessionId: null,
        pairedAt: null,
        telegramChatId: null
    });
}

/**
 * Get Telegram chat ID of the user who paired
 */
function getTelegramChatId() {
    const creds = readCreds();
    return creds.telegramChatId;
}

/**
 * Get all credentials
 */
function getAllCreds() {
    return readCreds();
}

/**
 * Update pairing code
 */
function updatePairingCode(code) {
    const creds = readCreds();
    return writeCreds({
        pairingCode: code
    });
}

module.exports = {
    initCredsFile,
    readCreds,
    writeCreds,
    getPairedNumber,
    isPaired,
    setPairingInProgress,
    markAsPaired,
    clearPairing,
    getTelegramChatId,
    getAllCreds,
    updatePairingCode,
    CREDS_FILE
};

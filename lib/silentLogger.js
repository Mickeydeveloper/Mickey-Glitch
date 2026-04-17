/**
 * Silent Logger for Baileys
 * Suppresses noisy debug/info logs while preserving critical errors
 */
const pino = require('pino')
const chalk = require('chalk')

// Create a silent logger that only shows errors
const silentLogger = pino({
    level: 'silent',  // We'll still suppress pino's own output; customLogger handles display
    transport: {
        target: 'pino/file',
        options: { destination: '/dev/null' }  // Send to null device
    }
})

// pretty-print helpers
const formatLog = (level, msg) => {
    let color = chalk.white
    if (level === 'WARN') color = chalk.yellow
    else if (level === 'ERROR') color = chalk.red
    else if (level === 'INFO') color = chalk.cyan
    else if (level === 'DEBUG') color = chalk.dim

    // wrap in a simple block for visibility
    const header = color(`[${level}]`)
    process.stderr.write(`${header} ${msg}\n`)
}

// Helper to safely convert message to string
const util = require('util')
const msgToString = (msg) => {
    if (typeof msg === 'string') return msg
    if (msg instanceof Error) return msg.message || msg.toString()
    if (msg?.message) return String(msg.message)
    if (typeof msg === 'object' && msg !== null) {
        try {
            // attempt JSON stringify first
            return JSON.stringify(msg)
        } catch {
            // some objects (like Baileys SessionEntry) are circular; inspect them instead
            return util.inspect(msg, { depth: null, colors: false })
        }
    }
    if (msg?.toString && typeof msg.toString === 'function') return msg.toString()
    return String(msg)
}

// List of SPECIFIC spam patterns to suppress (VERY TARGETED)
const SPAM_PATTERNS = [
    'Decrypted message with closed session',
    'closed session',
    '"error":"{}"',
    '"error":{}',
    '"error":"479"',
    'prekey',
    'Bad MAC'
]

const isSpam = (msgStr) => {
    if (typeof msgStr !== 'string') return false
    return SPAM_PATTERNS.some(pattern => msgStr.includes(pattern))
}

// Override with a custom logger - ONLY for Baileys internals
const customLogger = {
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn: (msg) => {
        const msgStr = msgToString(msg)
        if (isSpam(msgStr)) return
        formatLog('WARN', msgStr)
    },
    error: (msg) => {
        const msgStr = msgToString(msg)
        if (isSpam(msgStr)) return
        formatLog('ERROR', msgStr)
    },
    fatal: (msg) => {
        const msgStr = msgToString(msg)
        if (isSpam(msgStr)) return
        process.stderr.write(`[FATAL] ${msgStr}\n`)
    },
    child: () => customLogger  // Return self for child loggers
}

module.exports = customLogger

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

// Override with a custom logger
const customLogger = {
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn: (msg) => {
        const msgStr = msgToString(msg)

        // keep only truly meaningless noise suppressed; session and closing
        // messages are now considered informative so we log them.
        const suppressed = msgStr.includes('\"error\":\"479\"') ||  // WhatsApp error 479
                          msgStr.includes('prekey') ||
                          msgStr.includes('Bad MAC')
        if (suppressed) return

        formatLog('WARN', msgStr)
    },
    error: (msg) => {
        const msgStr = msgToString(msg)

        // drop only pure cruft; show closing/session messages so commands aren't
        // accidentally hidden or truncated in the console.
        const suppressed = msgStr === '{"error":{}}' ||
                          msgStr.includes('\"error\":{}') ||
                          (msgStr.includes('\"err\":{}') && msgStr.includes('skmsg')) ||
                          msgStr.includes('prekey') ||
                          msgStr.includes('Bad MAC') ||
                          msgStr.includes('\"error\":\"479\"')
        if (suppressed) return

        formatLog('ERROR', msgStr)
    },
    fatal: (msg) => {
        const msgStr = msgToString(msg)
        process.stderr.write(`[FATAL] ${msgStr}\n`)
    },
    child: () => customLogger  // Return self for child loggers
}

module.exports = customLogger

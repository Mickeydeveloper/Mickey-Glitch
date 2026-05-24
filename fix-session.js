#!/usr/bin/env node
/**
 * Session Cleanup & Fix Script (Optimized)
 * Solves: "No session found to decrypt message" without logging out
 */

const fs = require('fs');
const path = require('path');

// Tumia console ya kawaida kama chalk haipo kwenye node_modules
const log = {
    info: (msg) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`),
    success: (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
    warn: (msg) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`),
    error: (msg) => console.error(`\x1b[31m❌ ${msg}\x1b[0m`)
};

const SESSION_DIR = path.join(process.cwd(), 'session');

console.log('\n\x1b[43m\x1b[30m 🔧 WHATSAPP BOT SESSION REPAIR TOOL 🔧 \x1b[0m\n');

try {
    if (fs.existsSync(SESSION_DIR)) {
        const files = fs.readdirSync(SESSION_DIR);
        let deletedCount = 0;

        files.forEach(file => {
            const filePath = path.join(SESSION_DIR, file);

            // USIFUTE creds.json ili usilogout
            if (file === 'creds.json') {
                log.info(`Keeping active login: ${file}`);
                return;
            }

            // Futa session zote za sender-keys, pre-keys na app-state zinazoleta error
            if (
                file.startsWith('sender-key') || 
                file.startsWith('session-') || 
                file.startsWith('pre-key-') ||
                file.startsWith('app-state')
            ) {
                fs.unlinkSync(filePath);
                deletedCount++;
            }
        });

        if (deletedCount > 0) {
            log.success(`Cleaned ${deletedCount} corrupted session/key files.`);
            log.success('Session repaired successfully without logging out!');
        } else {
            log.info('No corrupted session keys found to delete.');
        }

        console.log('\n\x1b[34mNext steps:\x1b[0m');
        console.log('1. Restart your bot on the hosting panel.');
        console.log('2. The bot will automatically regenerate fresh keys upon new messages.\n');
    } else {
        log.warn('Session folder not found. Nothing to fix.');
    }
} catch (error) {
    log.error(`Error repairing session: ${error.message}`);
    process.exit(1);
}

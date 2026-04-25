#!/usr/bin/env node
/**
 * Session Cleanup & Fix Script
 * Solves: "No session found to decrypt message" errors
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const SESSION_DIR = path.join(process.cwd(), 'session');

console.log(chalk.bgYellow.black('\n 🔧 SESSION REPAIR TOOL 🔧 \n'));

try {
    // Remove old/corrupted session
    if (fs.existsSync(SESSION_DIR)) {
        const files = fs.readdirSync(SESSION_DIR);
        
        // Delete all session files except pre-key files (safer approach)
        files.forEach(file => {
            const filePath = path.join(SESSION_DIR, file);
            if (file.startsWith('creds') || file.startsWith('sender')) {
                console.log(chalk.red(`🗑️  Deleting: ${file}`));
                fs.unlinkSync(filePath);
            }
        });
        
        console.log(chalk.green('\n✅ Session cleaned! Start bot fresh.\n'));
        console.log(chalk.cyan('Next steps:'));
        console.log('1. Run: npm run start');
        console.log('2. Scan QR code with WhatsApp');
        console.log('3. Bot will regenerate session keys\n');
    } else {
        console.log(chalk.yellow('⚠️  Session folder not found. First run detected.\n'));
    }
} catch (error) {
    console.error(chalk.red('❌ Error:', error.message));
    process.exit(1);
}

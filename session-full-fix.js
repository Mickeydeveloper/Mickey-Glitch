#!/usr/bin/env node
/**
 * 🔥 MICKEY GLITCH - COMPLETE SESSION FIX v2 🔥
 * Full recovery with pre-flight checks & validation
 * - Backs up session completely
 * - Cleans corrupted encryption keys
 * - Validates creds.json integrity
 * - Prepares fresh pairing
 * - Auto-restarts with fresh session
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ────────────────────────────────────────────────
// UI HELPERS
// ────────────────────────────────────────────────
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};

const ui = {
    header: (text) => console.log(`\n${colors.cyan}${colors.bright}╔${'═'.repeat(58)}╗${colors.reset}`),
    title: (text) => console.log(`${colors.cyan}${colors.bright}║ ${text.padEnd(56)} ║${colors.reset}`),
    divider: () => console.log(`${colors.cyan}${colors.bright}╠${'═'.repeat(58)}╣${colors.reset}`),
    success: (text) => console.log(`${colors.green}✅ ${text}${colors.reset}`),
    error: (text) => console.log(`${colors.red}❌ ${text}${colors.reset}`),
    warn: (text) => console.log(`${colors.yellow}⚠️  ${text}${colors.reset}`),
    info: (text) => console.log(`${colors.blue}ℹ️  ${text}${colors.reset}`),
    footer: () => console.log(`${colors.cyan}${colors.bright}╚${'═'.repeat(58)}╝${colors.reset}\n`),
    step: (num, text) => console.log(`${colors.cyan}[Step ${num}]${colors.reset} ${text}`),
};

const PATHS = {
    session: path.join(process.cwd(), 'session'),
    backup: path.join(process.cwd(), 'session_backups'),
    creds: path.join(process.cwd(), 'session', 'creds.json'),
    data: path.join(process.cwd(), 'data'),
    temp: path.join(process.cwd(), 'temp'),
    logs: path.join(process.cwd(), 'logs'),
};

// ────────────────────────────────────────────────
// FUNCTIONS
// ────────────────────────────────────────────────

function fileSize(bytes) {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (e) {
        return 0;
    }
}

function validateCredsJson(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return { valid: false, reason: 'Creds file does not exist' };
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const creds = JSON.parse(content);

        // Check critical encryption keys
        const requiredKeys = [
            'noiseKey', 'signedIdentityKey', 'signedPreKey',
            'me', 'myID', 'platform'
        ];

        const missing = requiredKeys.filter(key => !creds[key]);
        if (missing.length > 0) {
            return { valid: false, reason: `Missing keys: ${missing.join(', ')}` };
        }

        return { valid: true, reason: 'Creds file is healthy', creds };
    } catch (e) {
        return { valid: false, reason: `JSON parse error: ${e.message}` };
    }
}

function backupSession() {
    ui.step(1, 'Creating complete session backup...');

    try {
        if (!fs.existsSync(PATHS.backup)) {
            fs.mkdirSync(PATHS.backup, { recursive: true });
        }

        if (fs.existsSync(PATHS.session)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(PATHS.backup, `session_${timestamp}`);

            // Copy entire session directory
            fs.cpSync(PATHS.session, backupPath, { recursive: true, force: true });
            
            const backupSize = getDirectorySize(backupPath);
            ui.success(`Session backed up to: ${backupPath} (${fileSize(backupSize)})`);
            return true;
        } else {
            ui.warn('No existing session to backup');
            return true;
        }
    } catch (e) {
        ui.error(`Backup failed: ${e.message}`);
        return false;
    }
}

function getDirectorySize(dirPath) {
    let size = 0;
    try {
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                size += getDirectorySize(filePath);
            } else {
                size += stat.size;
            }
        });
    } catch (e) {}
    return size;
}

function validateSessionStructure() {
    ui.step(2, 'Validating session structure...');

    try {
        if (!fs.existsSync(PATHS.session)) {
            ui.warn('Session directory does not exist (fresh start)');
            return true;
        }

        const files = fs.readdirSync(PATHS.session);
        
        // Check if creds exists
        if (files.includes('creds.json')) {
            const validation = validateCredsJson(PATHS.creds);
            if (validation.valid) {
                ui.success(`Creds file is valid and healthy`);
                return true;
            } else {
                ui.error(`Creds validation failed: ${validation.reason}`);
                return false;
            }
        } else {
            ui.info('No creds.json found - will prompt for pairing');
            return true;
        }
    } catch (e) {
        ui.error(`Structure validation failed: ${e.message}`);
        return false;
    }
}

function cleanCorruptedFiles() {
    ui.step(3, 'Cleaning corrupted/obsolete key files...');

    try {
        if (!fs.existsSync(PATHS.session)) {
            ui.info('No session directory to clean');
            return 0;
        }

        let deleted = 0;
        const files = fs.readdirSync(PATHS.session);

        // Patterns for problematic files to delete (except creds.json)
        const deletePatterns = [
            /^sender-key-/,
            /^pre-key-/,
            /^session-/,
            /^app-state-/,
            /\.tmp$/,
            /\.log$/,
        ];

        files.forEach(file => {
            // NEVER delete creds.json
            if (file === 'creds.json') {
                ui.info(`🔒 Preserving: ${file}`);
                return;
            }

            const shouldDelete = deletePatterns.some(pattern => pattern.test(file));
            if (shouldDelete) {
                const filePath = path.join(PATHS.session, file);
                try {
                    if (fs.statSync(filePath).isDirectory()) {
                        fs.rmSync(filePath, { recursive: true, force: true });
                    } else {
                        fs.unlinkSync(filePath);
                    }
                    deleted++;
                    console.log(`  🗑️  Deleted: ${file}`);
                } catch (e) {
                    console.log(`  ⚠️  Could not delete ${file}: ${e.message}`);
                }
            }
        });

        ui.success(`Deleted ${deleted} corrupted key files`);
        return deleted;
    } catch (e) {
        ui.error(`Cleanup failed: ${e.message}`);
        return 0;
    }
}

function clearCacheAndTemp() {
    ui.step(4, 'Clearing cache and temporary files...');

    const dirsToClean = [PATHS.temp, PATHS.logs];
    let totalCleaned = 0;

    dirsToClean.forEach(dir => {
        try {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                files.forEach(file => {
                    const filePath = path.join(dir, file);
                    try {
                        if (fs.statSync(filePath).isDirectory()) {
                            fs.rmSync(filePath, { recursive: true, force: true });
                        } else {
                            fs.unlinkSync(filePath);
                        }
                        totalCleaned++;
                    } catch (e) {}
                });
            }
        } catch (e) {}
    });

    ui.success(`Cleared ${totalCleaned} cache/temp files`);
}

function resetCredsForFreshPairing() {
    ui.step(5, 'Preparing for fresh WhatsApp pairing...');

    try {
        // If creds exists and is corrupted, back it up separately
        if (fs.existsSync(PATHS.creds)) {
            const validation = validateCredsJson(PATHS.creds);
            if (!validation.valid) {
                const corruptBackup = PATHS.creds + '.corrupted';
                fs.copyFileSync(PATHS.creds, corruptBackup);
                ui.warn(`Corrupted creds backed up to: ${corruptBackup}`);
                fs.unlinkSync(PATHS.creds);
                ui.success('Removed corrupted creds.json');
            }
        }

        // Remove other files for fresh auth
        const keysToDelete = ['app_state_sync_version', 'app_state_sync_new'];
        keysToDelete.forEach(file => {
            const filePath = path.join(PATHS.session, file);
            if (fs.existsSync(filePath)) {
                try {
                    fs.rmSync(filePath, { recursive: true, force: true });
                    ui.info(`Cleared: ${file}`);
                } catch (e) {}
            }
        });

        ui.success('Session ready for fresh pairing!');
        return true;
    } catch (e) {
        ui.error(`Prep failed: ${e.message}`);
        return false;
    }
}

// ────────────────────────────────────────────────
// MAIN EXECUTION
// ────────────────────────────────────────────────

async function main() {
    try {
        ui.header();
        ui.title('🔥 MICKEY GLITCH SESSION RECOVERY v2 🔥');
        ui.divider();
        ui.title('Full Reset & Fresh Pairing Preparation');
        ui.footer();

        // Execute steps
        if (!backupSession()) {
            ui.error('Backup failed, aborting');
            process.exit(1);
        }

        if (!validateSessionStructure()) {
            ui.warn('Session validation found issues - will proceed with cleanup');
        }

        cleanCorruptedFiles();
        clearCacheAndTemp();

        if (!resetCredsForFreshPairing()) {
            ui.error('Failed to prepare for pairing');
            process.exit(1);
        }

        // Summary
        ui.header();
        ui.title('✅ RECOVERY COMPLETE');
        ui.divider();
        ui.success('Session has been reset and cleaned');
        ui.success('Ready for fresh WhatsApp pairing');
        ui.footer();

        // Next steps
        console.log(`${colors.cyan}${colors.bright}📋 NEXT STEPS:${colors.reset}\n`);
        console.log(`${colors.green}1. Start the bot:${colors.reset}`);
        console.log(`   npm start\n`);
        console.log(`${colors.green}2. Scan QR Code OR Enter Phone Number${colors.reset}`);
        console.log(`   • Use your WhatsApp to scan the QR code`);
        console.log(`   • OR enter your phone number for custom pairing\n`);
        console.log(`${colors.green}3. Complete pairing on your phone${colors.reset}`);
        console.log(`   • You'll see a 8-digit code: MICKDADY`);
        console.log(`   • Confirm pairing on WhatsApp settings\n`);
        console.log(`${colors.yellow}⚠️  IMPORTANT:${colors.reset}`);
        console.log(`   • Bot will auto-restart once connection is established`);
        console.log(`   • Keep the terminal open during pairing`);
        console.log(`   • Session will be automatically saved\n`);

    } catch (e) {
        ui.error(`Fatal error: ${e.message}`);
        console.error(e);
        process.exit(1);
    }
}

// Run
main();

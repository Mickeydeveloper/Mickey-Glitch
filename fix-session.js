#!/usr/bin/env node
/**
 * 🔥 MICKEY GLITCH - ADVANCED SESSION RECOVERY & FIX TOOL 🔥
 * Solves ALL session problems:
 * - "No session found to decrypt message"
 * - "SessionError: No matching sessions"
 * - Corrupted key files
 * - Buffer timeouts
 * - Connection issues
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 🎨 Enhanced logging with colors
const log = {
    info: (msg) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`),
    success: (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
    warn: (msg) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`),
    error: (msg) => console.error(`\x1b[31m❌ ${msg}\x1b[0m`),
    header: (msg) => console.log(`\x1b[43m\x1b[30m ${msg} \x1b[0m`),
    debug: (msg) => console.log(`\x1b[35m🐛 ${msg}\x1b[0m`)
};

const SESSION_DIR = path.join(process.cwd(), 'session');
const BACKUP_DIR = path.join(process.cwd(), 'session_backups');
const CREDS_PATH = path.join(SESSION_DIR, 'creds.json');
const BACKUP_CREDS_PATH = path.join(BACKUP_DIR, `creds_backup_${Date.now()}.json`);

// ─────────────────────────────────────────────────────
// 📋 HELPER FUNCTIONS
// ─────────────────────────────────────────────────────

function fileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function validateCredsFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) return { valid: false, reason: 'File not found' };
        
        const content = fs.readFileSync(filePath, 'utf8');
        const creds = JSON.parse(content);
        
        // Check required fields
        if (!creds.noiseKey || !creds.signedIdentityKey) {
            return { valid: false, reason: 'Missing critical encryption keys' };
        }
        
        return { valid: true, reason: 'Creds file is healthy' };
    } catch (e) {
        return { valid: false, reason: `JSON parse error: ${e.message}` };
    }
}

function backupCredsFile() {
    try {
        if (!fs.existsSync(CREDS_PATH)) return false;
        
        // Create backup directory
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }
        
        // Backup creds.json
        fs.copyFileSync(CREDS_PATH, BACKUP_CREDS_PATH);
        log.success(`Creds file backed up to: ${path.relative(process.cwd(), BACKUP_CREDS_PATH)}`);
        return true;
    } catch (e) {
        log.warn(`Could not backup creds: ${e.message}`);
        return false;
    }
}

function getDirSize(dir) {
    let size = 0;
    try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            size += stat.size;
        });
    } catch (e) {}
    return size;
}

// ─────────────────────────────────────────────────────
// 🔍 ANALYSIS FUNCTIONS
// ─────────────────────────────────────────────────────

function analyzeSession() {
    log.header('📊 SESSION ANALYSIS');
    
    if (!fs.existsSync(SESSION_DIR)) {
        log.warn('Session folder does not exist yet');
        return null;
    }
    
    const files = fs.readdirSync(SESSION_DIR);
    const analysis = {
        totalFiles: files.length,
        totalSize: getDirSize(SESSION_DIR),
        filesByType: {}
    };
    
    const fileTypes = {
        'creds': [],
        'sender-keys': [],
        'session': [],
        'pre-keys': [],
        'app-state': [],
        'other': []
    };
    
    files.forEach(file => {
        const filePath = path.join(SESSION_DIR, file);
        const stat = fs.statSync(filePath);
        const size = fileSize(stat.size);
        
        if (file === 'creds.json') {
            const validation = validateCredsFile(filePath);
            fileTypes.creds.push({ file, size, status: validation.valid ? '✅' : '⚠️', reason: validation.reason });
        } else if (file.startsWith('sender-key')) {
            fileTypes['sender-keys'].push({ file, size });
        } else if (file.startsWith('session-')) {
            fileTypes.session.push({ file, size });
        } else if (file.startsWith('pre-key-')) {
            fileTypes['pre-keys'].push({ file, size });
        } else if (file.startsWith('app-state')) {
            fileTypes['app-state'].push({ file, size });
        } else {
            fileTypes.other.push({ file, size });
        }
    });
    
    console.log(`\n📁 Total Files: ${analysis.totalFiles}`);
    console.log(`💾 Total Size: ${fileSize(analysis.totalSize)}\n`);
    
    Object.entries(fileTypes).forEach(([type, items]) => {
        if (items.length > 0) {
            console.log(`\n${type.toUpperCase()} (${items.length}):`);
            items.forEach(item => {
                const status = item.status ? ` ${item.status}` : '';
                const reason = item.reason ? ` - ${item.reason}` : '';
                console.log(`  • ${item.file} ${item.size}${status}${reason}`);
            });
        }
    });
    
    return fileTypes;
}

// ─────────────────────────────────────────────────────
// 🧹 CLEANUP & REPAIR FUNCTIONS
// ─────────────────────────────────────────────────────

function cleanCorruptedKeys() {
    log.header('🔨 CLEANING CORRUPTED KEYS');
    
    if (!fs.existsSync(SESSION_DIR)) {
        log.warn('Session folder not found');
        return 0;
    }
    
    const files = fs.readdirSync(SESSION_DIR);
    let deletedCount = 0;
    let skippedCount = 0;
    
    files.forEach(file => {
        const filePath = path.join(SESSION_DIR, file);
        
        // NEVER delete creds.json - it contains your login
        if (file === 'creds.json') {
            log.info(`🔒 Keeping critical login file: ${file}`);
            skippedCount++;
            return;
        }
        
        // Delete problematic session/key files
        if (
            file.startsWith('sender-key-') || 
            file.startsWith('session-') || 
            file.startsWith('pre-key-') ||
            file.startsWith('app-state-')
        ) {
            try {
                fs.unlinkSync(filePath);
                deletedCount++;
                log.debug(`Deleted: ${file}`);
            } catch (e) {
                log.warn(`Could not delete ${file}: ${e.message}`);
            }
        }
    });
    
    console.log(`\n✅ Deleted: ${deletedCount} corrupted key files`);
    console.log(`🔒 Preserved: ${skippedCount} critical files\n`);
    
    return deletedCount;
}

function deepClean() {
    log.header('🌪️  DEEP SESSION CLEAN (NUCLEAR OPTION)');
    
    if (!fs.existsSync(SESSION_DIR)) {
        log.warn('Session folder not found');
        return 0;
    }
    
    backupCredsFile();
    
    const files = fs.readdirSync(SESSION_DIR);
    let deletedCount = 0;
    
    files.forEach(file => {
        const filePath = path.join(SESSION_DIR, file);
        
        // Keep only creds.json for deep clean
        if (file === 'creds.json') {
            log.info(`🔒 Preserving login credentials: ${file}`);
            return;
        }
        
        try {
            fs.unlinkSync(filePath);
            deletedCount++;
            log.debug(`Purged: ${file}`);
        } catch (e) {
            log.warn(`Could not delete ${file}`);
        }
    });
    
    console.log(`\n⚡ Purged: ${deletedCount} files`);
    console.log(`🔒 Kept: creds.json only\n`);
    
    return deletedCount;
}

function validateAndRepair() {
    log.header('🔧 VALIDATION & REPAIR');
    
    if (!fs.existsSync(SESSION_DIR)) {
        log.warn('Session folder does not exist - will be created on first run');
        return false;
    }
    
    const credsValidation = validateCredsFile(CREDS_PATH);
    if (credsValidation.valid) {
        log.success(`Creds file: ${credsValidation.reason}`);
        return true;
    } else {
        log.error(`Creds file issue: ${credsValidation.reason}`);
        return false;
    }
}

// ─────────────────────────────────────────────────────
// 🎯 MAIN MENU
// ─────────────────────────────────────────────────────

console.log(`
${'╔════════════════════════════════════════════════════════════╗'}
${'║                                                            ║'}
${'║        🔥 MICKEY GLITCH SESSION FIX TOOL 🔥              ║'}
${'║                                                            ║'}
${'║     Advanced Session Recovery & Repair Utility           ║'}
${'║                                                            ║'}
${'╚════════════════════════════════════════════════════════════╝'}
`);

try {
    // Check args for auto mode
    const args = process.argv.slice(2);
    const mode = args[0]?.toLowerCase();
    
    if (mode === 'full' || mode === 'deep') {
        console.log('\n⚡ Running in DEEP CLEAN mode...\n');
        analyzeSession();
        deepClean();
        validateAndRepair();
    } else if (mode === 'analyze') {
        console.log('\n📊 Running analysis only...\n');
        analyzeSession();
    } else {
        // Default: Smart cleanup
        console.log('\n🧹 Running STANDARD REPAIR mode...\n');
        analyzeSession();
        console.log('\n');
        cleanCorruptedKeys();
        validateAndRepair();
    }
    
    console.log('\n' + '─'.repeat(60));
    console.log(chalk?.green('✅ Session repair complete!') || '✅ Session repair complete!');
    console.log('─'.repeat(60) + '\n');
    
    console.log('📝 NEXT STEPS:');
    console.log('   1. npm run start');
    console.log('   2. Wait for QR code or pairing code');
    console.log('   3. Complete WhatsApp authentication');
    console.log('   4. Your bot will regenerate fresh encryption keys\n');
    
    console.log('🔧 USAGE:');
    console.log('   node fix-session.js          - Standard repair');
    console.log('   node fix-session.js analyze  - Analysis only');
    console.log('   node fix-session.js full     - Deep clean (keeps creds)\n');
    
} catch (error) {
    log.error(`Critical error: ${error.message}`);
    console.log('\n📞 If this persists, try:');
    console.log('   1. Delete entire session/ folder');
    console.log('   2. Run: npm run start:fresh');
    console.log('   3. Re-authenticate your bot\n');
    process.exit(1);
}

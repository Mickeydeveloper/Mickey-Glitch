const fs = require('fs');
const path = require('path');

// Comprehensive cleanup script for deployment
console.log('🧹 Starting comprehensive cleanup...');

// Clean temp directories
function cleanTempDirs() {
    const dirs = ['temp', 'tmp', 'node_modules/.cache'];
    let totalCleaned = 0;

    dirs.forEach(dir => {
        const dirPath = path.join(process.cwd(), dir);
        if (fs.existsSync(dirPath)) {
            try {
                const files = fs.readdirSync(dirPath);
                files.forEach(file => {
                    try {
                        const filePath = path.join(dirPath, file);
                        const stat = fs.statSync(filePath);
                        if (stat.isDirectory()) {
                            fs.rmSync(filePath, { recursive: true, force: true });
                        } else {
                            fs.unlinkSync(filePath);
                        }
                        totalCleaned++;
                    } catch (err) {
                        // Silent fail
                    }
                });
                console.log(`✅ Cleaned ${dir}: ${files.length} items`);
            } catch (err) {
                console.log(`⚠️ Could not clean ${dir}: ${err.message}`);
            }
        }
    });

    return totalCleaned;
}

// Clean session optimization (keep only essential files)
function optimizeSession() {
    const sessionDir = path.join(process.cwd(), 'session');
    if (!fs.existsSync(sessionDir)) return 0;

    let optimized = 0;
    try {
        const files = fs.readdirSync(sessionDir);

        // Keep only creds.json and recent session files
        files.forEach(file => {
            if (!file.includes('creds.json') && !file.includes('app-state-sync-')) {
                try {
                    fs.unlinkSync(path.join(sessionDir, file));
                    optimized++;
                } catch (err) {
                    // Silent fail
                }
            }
        });

        console.log(`✅ Optimized session: ${optimized} files removed`);
    } catch (err) {
        console.log(`⚠️ Could not optimize session: ${err.message}`);
    }

    return optimized;
}

// Clear logs and cache
function clearLogsAndCache() {
    const logFiles = ['npm-debug.log', 'yarn-error.log', '.npm/_logs'];
    let cleared = 0;

    logFiles.forEach(log => {
        const logPath = path.join(process.cwd(), log);
        if (fs.existsSync(logPath)) {
            try {
                if (fs.statSync(logPath).isDirectory()) {
                    fs.rmSync(logPath, { recursive: true, force: true });
                } else {
                    fs.unlinkSync(logPath);
                }
                cleared++;
                console.log(`✅ Cleared: ${log}`);
            } catch (err) {
                // Silent fail
            }
        }
    });

    return cleared;
}

// Run all cleanup operations
function main() {
    console.log('🚀 Starting cleanup process...\n');

    const tempCleaned = cleanTempDirs();
    const sessionOptimized = optimizeSession();
    const logsCleared = clearLogsAndCache();

    console.log('\n📊 Cleanup Summary:');
    console.log(`• Temp files cleaned: ${tempCleaned}`);
    console.log(`• Session files optimized: ${sessionOptimized}`);
    console.log(`• Logs cleared: ${logsCleared}`);
    console.log(`• Total items processed: ${tempCleaned + sessionOptimized + logsCleared}`);

    console.log('\n✅ Cleanup completed! System optimized for better performance.');
    console.log('💡 Use "npm run start:performance" for optimal performance mode.');
}

main();
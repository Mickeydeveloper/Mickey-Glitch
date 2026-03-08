const fs = require('fs');
const path = require('path');

// Utility for cleaning temp files efficiently
function cleanupTempFiles() {
    const tempDir = path.join(process.cwd(), 'temp');
    
    if (!fs.existsSync(tempDir)) {
        return;
    }
    
    try {
        const files = fs.readdirSync(tempDir);
        if (files.length === 0) return; // Skip if folder is empty
        
        let cleanedCount = 0;
        const now = Date.now();
        const maxAge = 6 * 60 * 60 * 1000; // 6 hours (increased from 3)
        
        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            try {
                const stats = fs.statSync(filePath);
                // Delete files older than 6 hours
                if (now - stats.mtimeMs > maxAge) {
                    fs.unlinkSync(filePath);
                    cleanedCount++;
                }
            } catch (err) {
                // Silent fail on individual files
            }
        });
        
    } catch (err) {
        // Silent fail
    }
}

// Cleanup on startup
cleanupTempFiles();

// Cleanup every 3 hours (optimized from 1 hour)
setInterval(cleanupTempFiles, 3 * 60 * 60 * 1000);

module.exports = { cleanupTempFiles };


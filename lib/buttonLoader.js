/**
 * Automatic Button Handler Loader
 * Scans all commands and loads their button handlers dynamically
 */

const fs = require('fs');
const path = require('path');

/**
 * Load all button handlers from commands folder
 * @returns {Object} Dictionary of all button handlers
 */
async function loadButtonHandlers() {
    const handlersMap = {};
    const commandsPath = path.join(__dirname, '../commands');
    
    try {
        const files = fs.readdirSync(commandsPath);
        
        for (const file of files) {
            if (!file.endsWith('.js') || file === 'Mickey') continue;
            
            const filePath = path.join(commandsPath, file);
            try {
                const command = require(filePath);
                
                // Check if command exports buttonHandlers
                if (command.buttonHandlers && typeof command.buttonHandlers === 'object') {
                    const handlers = command.buttonHandlers;
                    const commandName = file.replace('.js', '');
                    
                    Object.entries(handlers).forEach(([buttonId, handler]) => {
                        if (typeof handler === 'function') {
                            handlersMap[buttonId] = handler;
                            console.log(`✅ [ButtonLoader] Loaded: ${buttonId} (from ${commandName})`);
                        }
                    });
                }
            } catch (err) {
                console.error(`⚠️ [ButtonLoader] Error loading ${file}:`, err.message);
            }
        }
        
        console.log(`\n📦 [ButtonLoader] Total button handlers loaded: ${Object.keys(handlersMap).length}`);
        return handlersMap;
    } catch (err) {
        console.error('❌ [ButtonLoader] Failed to load button handlers:', err.message);
        return {};
    }
}

/**
 * Execute button handler
 * @param {string} buttonId - Button ID to execute
 * @param {Object} sock - Socket connection
 * @param {string} chatId - Chat ID
 * @param {Object} message - Message object
 * @param {Object} handlers - Button handlers map
 */
async function executeButtonHandler(buttonId, sock, chatId, message, handlers) {
    try {
        if (!handlers[buttonId]) {
            console.warn(`⚠️ [ButtonLoader] Unknown button ID: ${buttonId}`);
            return false;
        }
        
        console.log(`🔘 [ButtonLoader] Executing handler for: ${buttonId}`);
        await handlers[buttonId](sock, chatId, message);
        return true;
    } catch (err) {
        console.error(`❌ [ButtonLoader] Error executing ${buttonId}:`, err.message);
        await sock.sendMessage(chatId, { 
            text: `❌ Error executing button action: ${err.message.slice(0, 100)}` 
        }).catch(() => {});
        return false;
    }
}

module.exports = {
    loadButtonHandlers,
    executeButtonHandler
};

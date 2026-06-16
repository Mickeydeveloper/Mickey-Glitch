/**
 * Global Button & List Handler v2.0
 * Inasoma ID kutoka kwenye muundo wowote wa Button wa WhatsApp
 * Inasupport command IDs (starting with .) na static handlers
 */

/**
 * Extract button/list ID from any message type
 * @param {Object} m - Message object
 * @returns {string|null} - Button ID or null
 */
const getButtonId = (m) => {
    // Template button responses (standard buttons)
    if (m.message?.templateButtonReplyMessage?.selectedId) {
        return m.message.templateButtonReplyMessage.selectedId;
    }
    
    // List responses (single select lists)
    if (m.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
        return m.message.listResponseMessage.singleSelectReply.selectedRowId;
    }
    
    // Alternative list response formats
    if (m.message?.singleSelectReply?.selectedRowId) {
        return m.message.singleSelectReply.selectedRowId;
    }
    
    // Quick reply buttons
    if (m.message?.buttonsResponseMessage?.selectedButtonId) {
        return m.message.buttonsResponseMessage.selectedButtonId;
    }
    
    // Native flow responses
    if (m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
        try {
            const params = JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
            return params.id;
        } catch (e) {
            return null;
        }
    }
    
    return null;
};

/**
 * Check if button ID is a command ID (starts with .)
 * @param {string} id - Button/List ID
 * @returns {boolean}
 */
const isCommandId = (id) => id && id.toString().startsWith('.');

/**
 * Extract command name from command ID
 * @param {string} id - Button/List ID (e.g., ".ping" or ".help menu")
 * @returns {string} - Command name extracted
 */
const extractCommand = (id) => {
    if (!id) return '';
    return id.toString().toLowerCase().trim();
};

/**
 * Check if message is a button/list response
 * @param {Object} m - Message object
 * @returns {boolean}
 */
const isButtonResponse = (m) => {
    return !!(
        m.message?.buttonsResponseMessage?.selectedButtonId ||
        m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
        m.message?.singleSelectReply?.selectedRowId ||
        m.message?.templateButtonReplyMessage?.selectedId ||
        (m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson)
    );
};

/**
 * Auto-detect and handle buttons - returns command if button is a command
 * @param {Object} m - Message object
 * @returns {string|null} - Command string if button is a command, null otherwise
 */
const autoDetectButtonCommand = (m) => {
    const buttonId = getButtonId(m);
    
    if (!buttonId) return null;
    
    // Ikiwa button ID ni command, return it kwa main handler
    if (isCommandId(buttonId)) {
        const command = extractCommand(buttonId);
        console.log(`🔘 [AutoButton] Command detected from button: ${command}`);
        return command;
    }
    
    return null;
};

/**
 * Execute button handler (for static button handlers)
 * @param {string} buttonId - Button ID
 * @param {Object} sock - Socket/Bot instance
 * @param {string} chatId - Chat ID
 * @param {Object} m - Message object
 * @param {Object} handlers - Static button handlers map
 * @returns {boolean} - True if handler was executed
 */
async function executeButtonHandler(buttonId, sock, chatId, m, handlers) {
    if (!buttonId) return false;

    try {
        // Ikiwa ina custom handler, execute it
        if (handlers && handlers[buttonId]) {
            console.log(`✅ [Button] Executing handler for: ${buttonId}`);
            await handlers[buttonId](sock, chatId, m);
            return true;
        }

        console.warn(`⚠️ [Button] No handler found for ID: ${buttonId}`);
        return false;

    } catch (err) {
        console.error('❌ [Button Error]:', err.message);
        return false;
    }
}

/**
 * Load button handlers from command files (optional, for advanced use)
 * @returns {Object} - Map of button handlers
 */
async function loadButtonHandlers() {
    const handlers = {};
    
    // Static/custom handlers for non-command buttons
    handlers['channel'] = async (sock, chatId, m) => {
        await sock.sendMessage(chatId, { 
            text: '📢 *Join our Channel:*\nhttps://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A' 
        }, { quoted: m });
    };
    
    handlers['owner'] = async (sock, chatId, m) => {
        try {
            const ownerCommand = require('../commands/owner');
            await ownerCommand(sock, chatId, m);
        } catch (e) {
            console.error('Error loading owner command:', e);
        }
    };
    
    handlers['support'] = async (sock, chatId, m) => {
        await sock.sendMessage(chatId, { 
            text: `🔗 *Support Group*\n\nJoin our support community:\nhttps://chat.whatsapp.com/GA4WrOFythU6g3BFVubYM7?mode=wwt` 
        }, { quoted: m });
    };

    handlers['repo_download_zip'] = async (sock, chatId, m) => {
        try {
            await sock.sendMessage(chatId, { react: { text: '📥', key: m.key } });

            const axios = require('axios');
            const fs = require('fs');
            const path = require('path');

            // Get repo info to get ZIP URL
            const repoRes = await axios.get('https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch', {
                headers: { 'User-Agent': 'MickeyBot' }
            });

            const repo = repoRes.data;
            const zipUrl = `https://github.com/Mickeydeveloper/Mickey-Glitch/archive/refs/heads/${repo.default_branch}.zip`;

            // Download ZIP
            const zipResponse = await axios.get(zipUrl, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'MickeyBot' }
            });

            // Save to temp file
            const tempDir = path.join(process.cwd(), 'temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const zipPath = path.join(tempDir, `Mickey-Glitch-${repo.default_branch}.zip`);
            fs.writeFileSync(zipPath, zipResponse.data);

            // Send ZIP file
            await sock.sendMessage(chatId, {
                document: { url: zipPath },
                fileName: `Mickey-Glitch-${repo.default_branch}.zip`,
                mimetype: 'application/zip'
            }, { quoted: m });

            // Clean up temp file
            setTimeout(() => {
                try { fs.unlinkSync(zipPath); } catch (e) {}
            }, 30000); // Delete after 30 seconds

            await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } });

        } catch (err) {
            console.error('Repo ZIP Download Error:', err);
            await sock.sendMessage(chatId, {
                text: `❌ *Error downloading ZIP.*\n\n_${err.message}_`
            }, { quoted: m });
            await sock.sendMessage(chatId, { react: { text: '❌', key: m.key } });
        }
    };
    
    return handlers;
}

module.exports = { 
    executeButtonHandler, 
    getButtonId,
    isCommandId,
    extractCommand,
    isButtonResponse,
    autoDetectButtonCommand,
    loadButtonHandlers
};

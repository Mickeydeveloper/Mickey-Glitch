/**
 * Global Button & List Handler
 * Inasoma ID kutoka kwenye muundo wowote wa Button wa WhatsApp
 */
const getButtonId = (m) => {
    return m.message?.buttonsResponseMessage?.selectedButtonId || 
           m.message?.listResponseMessage?.singleSelectReply?.selectedRowId || 
           m.message?.templateButtonReplyMessage?.selectedId || 
           m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson && 
           JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id ||
           null;
};

async function executeButtonHandler(sock, m, handlers) {
    const chatId = m.key.remoteJid;
    const buttonId = getButtonId(m);

    if (!buttonId) return false; // Siyo button message

    try {
        // 1. Kama ID inaanza na prefix (.), itreat kama command ya kawaida
        if (buttonId.startsWith('.')) {
            const commandName = buttonId.slice(1).trim().split(' ')[0];
            // Hapa unaweza ku-trigger command handler yako kuu
            console.log(`🔘 [Button] Command detected: ${commandName}`);
            // Logic ya ku-execute command iende hapa
            return true;
        }

        // 2. Kama ina handler maalum kwenye 'buttonHandlers'
        if (handlers[buttonId]) {
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

module.exports = { executeButtonHandler, getButtonId };

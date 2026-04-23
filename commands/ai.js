// AI Voice Command – Text to speech with different AI voices
const axios = require('axios');

// ============ CONFIGURATION ============
const VOICE_MODELS = [
    { number: "1", name: "Hatsune Miku", model: "miku" },
    { number: "2", name: "Nahida (Exclusive)", model: "nahida" },
    { number: "3", name: "Nami", model: "nami" },
    { number: "4", name: "Ana (Female)", model: "ana" },
    { number: "5", name: "Optimus Prime", model: "optimus_prime" },
    { number: "6", name: "Goku", model: "goku" },
    { number: "7", name: "Taylor Swift", model: "taylor_swift" },
    { number: "8", name: "Elon Musk", model: "elon_musk" },
    { number: "9", name: "Mickey Mouse", model: "mickey_mouse" },
    { number: "10", name: "Kendrick Lamar", model: "kendrick_lamar" },
    { number: "11", name: "Angela Adkinsh", model: "angela_adkinsh" },
    { number: "12", name: "Eminem", model: "eminem" }
];

const CONFIG = {
    HANDLER_TIMEOUT: 120000, // 2 minutes
    API_TIMEOUT: 60000, // 60 seconds
    API_RETRY_COUNT: 3, // Retry attempts
    API_BASE_URL: "https://api.agatz.xyz/api/voiceover",
    MENU_IMAGE: "https://files.catbox.moe/w6mzc7.jpg"
};

// ============ HELPER FUNCTIONS ============

/**
 * Build the voice model selection menu
 * @param {string} inputText - The text to be converted to speech
 * @returns {string} - Formatted menu text
 */
const buildMenuText = (inputText) => {
    let menuText = "╭━━━〔 *AI VOICE MODELS* 〕━━━⊷\n";
    VOICE_MODELS.forEach(model => {
        menuText += `┃▸ ${model.number}. ${model.name}\n`;
    });
    menuText += "╰━━━⪼\n\n";
    menuText += `📌 *Reply with the number to select voice model for:*\n"${inputText}"`;
    return menuText;
};

/**
 * Validate and get selected voice model
 * @param {string} selectedNumber - User's selected number
 * @returns {Object|null} - Voice model or null if invalid
 */
const getSelectedModel = (selectedNumber) => {
    return VOICE_MODELS.find(model => model.number === selectedNumber.trim()) || null;
};

/**
 * Generate audio using the voice API with retry logic
 * @param {string} inputText - Text to convert to speech
 * @param {Object} selectedModel - Selected voice model
 * @returns {Promise<Object>} - API response
 */
const generateAudio = async (inputText, selectedModel) => {
    let lastError;
    
    for (let attempt = 1; attempt <= CONFIG.API_RETRY_COUNT; attempt++) {
        try {
            const apiUrl = `${CONFIG.API_BASE_URL}?text=${encodeURIComponent(inputText)}&model=${selectedModel.model}`;
            const response = await axios.get(apiUrl, {
                timeout: CONFIG.API_TIMEOUT
            });
            return response.data;
        } catch (error) {
            lastError = error;
            console.error(`API attempt ${attempt}/${CONFIG.API_RETRY_COUNT} failed:`, error.message);
            
            // If timeout, wait before retrying
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                if (attempt < CONFIG.API_RETRY_COUNT) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
                }
            } else {
                // Don't retry on non-timeout errors
                break;
            }
        }
    }
    
    throw lastError;
};

/**
 * Create message handler for voice selection
 * @param {Object} params - Handler parameters
 * @returns {Function} - Message handler function
 */
const createMessageHandler = ({ sock, chatId, message, messageID, handlerActive, inputText }) => {
    return async (msgData) => {
        if (!handlerActive) return;
        
        const receivedMsg = msgData.messages[0];
        if (!receivedMsg?.message) return;

        const receivedText = receivedMsg.message.conversation || 
                          receivedMsg.message.extendedTextMessage?.text || 
                          receivedMsg.message.buttonsResponseMessage?.selectedButtonId;
        const senderID = receivedMsg.key.remoteJid;
        const isReplyToBot = receivedMsg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

        if (!isReplyToBot || senderID !== chatId) return;

        // Add voice selection handler logic
        await handleVoiceSelection({
            sock,
            chatId,
            receivedMsg,
            receivedText,
            inputText,
            handlerActive
        });
    };
};

/**
 * Handle voice model selection and audio generation
 */
const handleVoiceSelection = async ({ sock, chatId, receivedMsg, receivedText, inputText, handlerActive }) => {
    try {
        handlerActive = false;

        // React to selection
        await sock.sendMessage(chatId, {
            react: { text: '⬇️', key: receivedMsg.key }
        });

        const selectedNumber = receivedText.trim();
        const selectedModel = getSelectedModel(selectedNumber);

        if (!selectedModel) {
            await sock.sendMessage(chatId, {
                text: "❌ Invalid option! Please reply with a number from the menu."
            }, { quoted: receivedMsg });
            return;
        }

        // Show processing message
        await sock.sendMessage(chatId, {
            text: `🔊 Generating audio with ${selectedModel.name} voice...`
        }, { quoted: receivedMsg });

        try {
            const data = await generateAudio(inputText, selectedModel);

            if (data.status === 200 && data.data?.oss_url) {
                await sock.sendMessage(chatId, {
                    audio: { url: data.data.oss_url },
                    mimetype: "audio/mpeg"
                }, { quoted: receivedMsg });
            } else {
                await sock.sendMessage(chatId, {
                    text: "❌ Error generating audio. Please try again."
                }, { quoted: receivedMsg });
            }
        } catch (apiError) {
            console.error("API Error:", apiError.message);
            
            // Check if it's a timeout error
            let errorMsg = "❌ Error processing your request.";
            if (apiError.code === 'ECONNABORTED' || apiError.message.includes('timeout')) {
                errorMsg = "⏱️ Audio generation is taking longer than expected. Please try again or use a shorter text.";
            }
            
            await sock.sendMessage(chatId, {
                text: errorMsg
            }, { quoted: receivedMsg });
        }
    } catch (error) {
        console.error("Selection Handler Error:", error);
        await sock.sendMessage(chatId, {
            text: "❌ An error occurred while processing your selection."
        }, { quoted: receivedMsg });
    }
};

/**
 * Setup response timeout handler
 */
const setupTimeoutHandler = ({ sock, chatId, handlerActive, messageHandler }) => {
    return setTimeout(() => {
        handlerActive = false;
        sock.ev.off("messages.upsert", messageHandler);
        sock.sendMessage(chatId, {
            text: "⌛ Voice selection timed out. Please try the command again."
        });
    }, CONFIG.HANDLER_TIMEOUT);
};

// ============ MAIN COMMAND ============

/**
 * AI Voice Command
 * Usage: .aivoice <text>
 * Aliases: .vai, .voicex, .voiceai
 */
async function aiVoiceCommand(sock, chatId, senderId, text, message) {
    try {
        // Validate input
        if (!text || text.trim() === '') {
            await sock.sendMessage(chatId, {
                text: "Please provide text after the command.\nExample: .aivoice hello"
            }, { quoted: message });
            return;
        }

        const inputText = text.trim();

        // Send initial reaction
        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });

        // Build and send menu
        const menuText = buildMenuText(inputText);
        const sentMsg = await sock.sendMessage(chatId, {
            image: { url: CONFIG.MENU_IMAGE },
            caption: menuText
        }, { quoted: message });

        const messageID = sentMsg.key.id;
        let handlerActive = true;

        // Setup message handler
        const messageHandler = createMessageHandler({
            sock,
            chatId,
            message,
            messageID,
            handlerActive,
            inputText
        });

        // Setup timeout
        const handlerTimeout = setupTimeoutHandler({
            sock,
            chatId,
            handlerActive,
            messageHandler
        });

        // Register handler
        sock.ev.on("messages.upsert", messageHandler);

    } catch (error) {
        console.error("AI Voice Command Error:", error);
        await sock.sendMessage(chatId, {
            text: "❌ An error occurred. Please try again."
        }, { quoted: message });
    }
}

module.exports = aiVoiceCommand; 
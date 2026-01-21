const { cmd } = require('../command');
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
    API_TIMEOUT: 30000, // 30 seconds
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
 * Generate audio using the voice API
 * @param {string} inputText - Text to convert to speech
 * @param {Object} selectedModel - Selected voice model
 * @returns {Promise<Object>} - API response
 */
const generateAudio = async (inputText, selectedModel) => {
    const apiUrl = `${CONFIG.API_BASE_URL}?text=${encodeURIComponent(inputText)}&model=${selectedModel.model}`;
    const response = await axios.get(apiUrl, {
        timeout: CONFIG.API_TIMEOUT
    });
    return response.data;
};

/**
 * Create message handler for voice selection
 * @param {Object} params - Handler parameters
 * @returns {Function} - Message handler function
 */
const createMessageHandler = ({ conn, from, m, messageID, handlerActive, reply, inputText }) => {
    return async (msgData) => {
        if (!handlerActive) return;
        
        const receivedMsg = msgData.messages[0];
        if (!receivedMsg?.message) return;

        const receivedText = receivedMsg.message.conversation || 
                          receivedMsg.message.extendedTextMessage?.text || 
                          receivedMsg.message.buttonsResponseMessage?.selectedButtonId;
        const senderID = receivedMsg.key.remoteJid;
        const isReplyToBot = receivedMsg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

        if (!isReplyToBot || senderID !== from) return;

        // Add voice selection handler logic
        await handleVoiceSelection({
            conn,
            from,
            receivedMsg,
            receivedText,
            reply,
            inputText,
            handlerActive
        });
    };
};

/**
 * Handle voice model selection and audio generation
 */
const handleVoiceSelection = async ({ conn, from, receivedMsg, receivedText, reply, inputText, handlerActive }) => {
    try {
        handlerActive = false;

        // React to selection
        await conn.sendMessage(from, {
            react: { text: '⬇️', key: receivedMsg.key }
        });

        const selectedNumber = receivedText.trim();
        const selectedModel = getSelectedModel(selectedNumber);

        if (!selectedModel) {
            return reply("❌ Invalid option! Please reply with a number from the menu.");
        }

        // Show processing message
        await conn.sendMessage(from, {
            text: `🔊 Generating audio with ${selectedModel.name} voice...`
        }, { quoted: receivedMsg });

        try {
            const data = await generateAudio(inputText, selectedModel);

            if (data.status === 200 && data.data?.oss_url) {
                await conn.sendMessage(from, {
                    audio: { url: data.data.oss_url },
                    mimetype: "audio/mpeg"
                }, { quoted: receivedMsg });
            } else {
                reply("❌ Error generating audio. Please try again.");
            }
        } catch (apiError) {
            console.error("API Error:", apiError.message);
            reply(`❌ Error processing your request: ${apiError.message}`);
        }
    } catch (error) {
        console.error("Selection Handler Error:", error);
        reply("❌ An error occurred while processing your selection.");
    }
};

/**
 * Setup response timeout handler
 */
const setupTimeoutHandler = ({ conn, from, reply, handlerActive, messageHandler }) => {
    return setTimeout(() => {
        handlerActive = false;
        conn.ev.off("messages.upsert", messageHandler);
        reply("⌛ Voice selection timed out. Please try the command again.");
    }, CONFIG.HANDLER_TIMEOUT);
};

// ============ MAIN COMMAND ============

cmd({
    pattern: "aivoice",
    alias: ["vai", "voicex", "voiceai"],
    desc: "Text to speech with different AI voices",
    category: "main",
    react: "🪃",
    filename: __filename
},
async (conn, mek, m, { 
    from, 
    args, 
    reply 
}) => {
    try {
        // Validate input
        if (!args[0]) {
            return reply("Please provide text after the command.\nExample: .aivoice hello");
        }

        const inputText = args.join(' ');

        // Send initial reaction
        await conn.sendMessage(from, {
            react: { text: '⏳', key: m.key }
        });

        // Build and send menu
        const menuText = buildMenuText(inputText);
        const sentMsg = await conn.sendMessage(from, {
            image: { url: CONFIG.MENU_IMAGE },
            caption: menuText
        }, { quoted: m });

        const messageID = sentMsg.key.id;
        let handlerActive = true;

        // Setup message handler
        const messageHandler = createMessageHandler({
            conn,
            from,
            m,
            messageID,
            handlerActive,
            reply,
            inputText
        });

        // Setup timeout
        const handlerTimeout = setupTimeoutHandler({
            conn,
            from,
            reply,
            handlerActive,
            messageHandler
        });

        // Register handler
        conn.ev.on("messages.upsert", messageHandler);

    } catch (error) {
        console.error("Command Error:", error);
        reply("❌ An error occurred. Please try again.");
    }
}); 
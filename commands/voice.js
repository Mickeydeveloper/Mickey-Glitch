// aiVoiceModule.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { gTTS } = require('gtts'); // npm install gtts
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// ======================
// Function to get AI Response via public GPT API URL
// ======================
async function getAIResponse(promptText) {
    try {
        const encodedPrompt = encodeURIComponent(promptText);
        const url = `https://gpt-3-5.apis-bj-devs.workers.dev/?prompt=${encodedPrompt}`;
        const res = await axios.get(url, { timeout: 30000 });
        // assume API returns JSON with "response" field
        if (res.data?.response) {
            return res.data.response.trim();
        }
        return res.data?.choices?.[0]?.text?.trim() || "Sorry, I couldn't get a response.";
    } catch (error) {
        console.error('Error fetching GPT API response:', error.message);
        return "Sorry, I couldn't process your request.";
    }
}

// ======================
// Function to convert text → speech using gTTS
// ======================
async function textToSpeech(text, outputFile) {
    return new Promise((resolve, reject) => {
        try {
            const gtts = new gTTS(text, 'en');
            gtts.save(outputFile, function(err) {
                if (err) return reject(err);
                resolve(outputFile);
            });
        } catch (e) {
            reject(e);
        }
    });
}

// ======================
// Handle incoming text message and respond with audio
// sock = Baileys socket, chatId = jid, text = user message
// ======================
async function handleTextMessage(sock, chatId, text) {
    // Get AI response
    const aiReply = await getAIResponse(text);
    console.log('AI Response:', aiReply);

    // Convert AI response to audio
    const audioPath = path.join(__dirname, `aiReply_${Date.now()}.mp3`);
    await textToSpeech(aiReply, audioPath);

    // Send audio back to WhatsApp
    await sock.sendMessage(chatId, {
        audio: fs.readFileSync(audioPath),
        mimetype: 'audio/mpeg'
    });

    // Cleanup
    try { fs.unlinkSync(audioPath); } catch {}
}

// ======================
// Export functions
// ======================
module.exports = {
    getAIResponse,
    textToSpeech,
    handleTextMessage
};
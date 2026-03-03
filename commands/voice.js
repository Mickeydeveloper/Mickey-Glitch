const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const axios = require('axios');
const gTTS = require('gtts'); // npm install gtts
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const VOICE_CONFIG_PATH = './data/voiceConfig.json';

// ======================
// Helper functions for Config (On/Off)
// ======================
function readVoiceConfig() {
    try {
        if (!fs.existsSync(VOICE_CONFIG_PATH)) {
            return { aiVoiceActive: true, showTranscription: true };
        }
        const raw = fs.readFileSync(VOICE_CONFIG_PATH, 'utf8');
        return JSON.parse(raw || '{}');
    } catch {
        return { aiVoiceActive: true, showTranscription: true };
    }
}

function writeVoiceConfig(newConfig) {
    try {
        if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
        const current = readVoiceConfig();
        const payload = { ...current, ...newConfig };
        fs.writeFileSync(VOICE_CONFIG_PATH, JSON.stringify(payload, null, 2));
    } catch (e) {
        console.error('Save config error:', e);
    }
}

// ======================
// AI Response Logic
// ======================
async function getAIResponse(promptText) {
    try {
        const url = `https://gpt-3-5.apis-bj-devs.workers.dev/?prompt=${encodeURIComponent(promptText)}`;
        const res = await axios.get(url, { timeout: 15000 });
        
        // Handling multiple API response formats
        if (res.data?.response) return res.data.response.trim();
        if (res.data?.choices?.[0]?.text) return res.data.choices[0].text.trim();
        
        return "Samahani (Sorry), sikuweza kupata jibu kwa sasa.";
    } catch (error) {
        console.error('AI API Error:', error.message);
        return "Error: Connection lost.";
    }
}

async function textToSpeech(text, outputFile) {
    return new Promise((resolve, reject) => {
        try {
            const gtts = new gTTS(text, 'sw'); // Changed to 'sw' for Swahili support
            gtts.save(outputFile, (err) => {
                if (err) return reject(err);
                resolve(outputFile);
            });
        } catch (e) {
            reject(e);
        }
    });
}

// ======================
// Main Handlers
// ======================
async function handleTextMessage(sock, chatId, text) {
    const cfg = readVoiceConfig();
    
    // Ikiwa AI Voice imezimwa, usifanye lolote (If off, do nothing)
    if (!cfg.aiVoiceActive) return;

    const audioPath = path.join(__dirname, `temp_${Date.now()}.mp3`);
    
    try {
        const aiReply = await getAIResponse(text);
        await textToSpeech(aiReply, audioPath);

        await sock.sendMessage(chatId, {
            audio: await fsPromises.readFile(audioPath),
            mimetype: 'audio/mpeg',
            ptt: true // Sends as a voice note (PTT)
        });
    } catch (e) {
        console.error('HandleText Error:', e);
    } finally {
        if (fs.existsSync(audioPath)) await fsPromises.unlink(audioPath);
    }
}

async function voiceConfigCommand(sock, chatId, message, args) {
    // Note: requires 'isOwner' check in your main router
    const argStr = (args || '').trim().toLowerCase();
    
    if (argStr === 'on') {
        writeVoiceConfig({ aiVoiceActive: true });
        return sock.sendMessage(chatId, { text: "✅ AI Voice Mode: *ENABLED*" });
    } else if (argStr === 'off') {
        writeVoiceConfig({ aiVoiceActive: false });
        return sock.sendMessage(chatId, { text: "❌ AI Voice Mode: *DISABLED*" });
    } else if (argStr === 'status') {
        const cfg = readVoiceConfig();
        return sock.sendMessage(chatId, { 
            text: `*System Status*\n- AI Voice: ${cfg.aiVoiceActive ? 'ON' : 'OFF'}\n- Transcription: ${cfg.showTranscription ? 'ON' : 'OFF'}` 
        });
    } else {
        return sock.sendMessage(chatId, { 
            text: "Tumia (Use):\n.voiceconfig on\n.voiceconfig off\n.voiceconfig status" 
        });
    }
}

module.exports = {
    getAIResponse,
    textToSpeech,
    handleTextMessage,
    voiceConfigCommand,
    readVoiceConfig
};

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
// Voice command / configuration helpers
// ======================

const isOwner = require('../lib/isOwner');

const VOICE_CONFIG_PATH = './data/voiceConfig.json';

function readVoiceConfig() {
    try {
        if (!fs.existsSync(VOICE_CONFIG_PATH)) return { showTranscription: true };
        const raw = fs.readFileSync(VOICE_CONFIG_PATH, 'utf8');
        const data = JSON.parse(raw || '{}');
        return { showTranscription: !!data.showTranscription };
    } catch {
        return { showTranscription: true };
    }
}

function writeVoiceConfig(config) {
    try {
        if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
        const current = readVoiceConfig();
        const payload = {
            showTranscription: typeof config.showTranscription === 'boolean' ? config.showTranscription : current.showTranscription
        };
        fs.writeFileSync(VOICE_CONFIG_PATH, JSON.stringify(payload, null, 2));
    } catch {}
}

/**
 * handleVoiceCommand - called when a PTT/audio message is detected
 * This implementation currently does not perform any real transcription; it
 * simply downloads the media and returns `null` so that voice messages are
 * ignored.  You can extend this function to call a speech-to-text API (e.g.
 * OpenAI Whisper) and return the resulting string if you want voice-to-text
 * commands.
 */
async function handleVoiceCommand(sock, chatId, message) {
    try {
        // ensure we only process audio messages
        if (!message.message?.pttMessage && !message.message?.audioMessage) return null;

        // download media so the message is buffered locally
        await downloadMediaMessage(message, 'buffer');

        // Placeholder transcription logic.  Right now we don't have a
        // speech‑to‑text integration, so we just send a notice if the
        // configuration asks for it.  This keeps the command from crashing
        // and gives the owner a hook to implement a real STT service later.
        const cfg = readVoiceConfig();
        if (cfg.showTranscription) {
            await sock.sendMessage(chatId, {
                text: '🔊 Voice message received (transcription not available yet).'
            }, { quoted: message });
        }

        // Returning null tells the caller to abort further command handling.
        return null;
    } catch (e) {
        console.error('Error during voice processing:', e);
        return null;
    }
}

async function voiceConfigCommand(sock, chatId, message, args) {
    const senderId = message.key.participant || message.key.remoteJid;
    // only owner or sudo may change config
    if (!message.key.fromMe && !await isOwner(senderId, sock, chatId)) {
        await sock.sendMessage(chatId, { text: 'Only bot owner can use this command!' }, { quoted: message });
        return;
    }

    const argStr = (args || '').trim().toLowerCase();
    if (!argStr || !['on', 'off', 'status'].includes(argStr)) {
        await sock.sendMessage(chatId, {
            text: '*VOICECONFIG (Owner only)*\n\n.voiceconfig on - Show voice message transcriptions\n.voiceconfig off - Hide transcription\n.voiceconfig status - View current setting'
        }, { quoted: message });
        return;
    }

    if (argStr === 'status') {
        const state = readVoiceConfig();
        await sock.sendMessage(chatId, { text: `Voice transcription display is currently *${state.showTranscription ? 'ON' : 'OFF'}*` }, { quoted: message });
        return;
    }

    const enable = argStr === 'on';
    writeVoiceConfig({ showTranscription: enable });
    await sock.sendMessage(chatId, { text: `Voice transcription display has been *${enable ? 'ENABLED' : 'DISABLED'}*` }, { quoted: message });
}

async function voiceStatusCommand(sock, chatId, message) {
    const state = readVoiceConfig();
    await sock.sendMessage(chatId, { text: `Voice configuration:\nshowTranscription: *${state.showTranscription ? 'ON' : 'OFF'}*` }, { quoted: message });
}

// ======================
// Export functions
// ======================
module.exports = {
    getAIResponse,
    textToSpeech,
    handleTextMessage,
    handleVoiceCommand,
    voiceConfigCommand,
    voiceStatusCommand
};
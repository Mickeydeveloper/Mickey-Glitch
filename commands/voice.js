const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { spawn } = require('child_process');

/* ================================
   🔐 ANDIKA API KEYS ZAKO HAPA
================================ */

// Google Speech API Key (optional)
const GOOGLE_SPEECH_KEY = "WEKA_GOOGLE_SPEECH_KEY_HAPA";

// OpenAI Whisper API Key (recommended)
const OPENAI_API_KEY = "WEKA_OPENAI_API_KEY_HAPA";

// Vosk Model Path (offline)
const VOSK_MODEL_PATH = path.join(process.cwd(), 'models', 'vosk-model-small-en-us-0.15');


/* =====================================
   🎤 TRANSCRIBE USING GOOGLE API
===================================== */
async function transcribeAudio(audioBuffer) {

    if (!GOOGLE_SPEECH_KEY) {
        console.log('🎤 No Google API key. Using Whisper fallback...');
        return await transcribeWithWhisper(audioBuffer);
    }

    try {
        const response = await axios.post(
            `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_SPEECH_KEY}`,
            {
                config: {
                    encoding: 'OGG_OPUS',
                    languageCode: 'en-US',
                    audioChannelCount: 1
                },
                audio: {
                    content: audioBuffer.toString('base64')
                }
            },
            { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
        );

        return response.data?.results?.[0]?.alternatives?.[0]?.transcript?.trim() || null;

    } catch (error) {
        console.error('Google error:', error.message);
        return await transcribeWithWhisper(audioBuffer);
    }
}


/* =====================================
   🎤 TRANSCRIBE USING OPENAI WHISPER
===================================== */
async function transcribeWithWhisper(audioBuffer) {

    if (!OPENAI_API_KEY) {
        console.log('⚠️ No OpenAI key. Using offline Vosk...');
        return await transcribeWithVosk(audioBuffer);
    }

    try {
        const FormData = require('form-data');
        const form = new FormData();
        form.append('file', audioBuffer, { filename: 'audio.ogg' });
        form.append('model', 'whisper-1');
        form.append('language', 'en');

        const response = await axios.post(
            'https://api.openai.com/v1/audio/transcriptions',
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                timeout: 30000
            }
        );

        return response.data?.text?.trim() || null;

    } catch (error) {
        console.error('Whisper error:', error.message);
        return await transcribeWithVosk(audioBuffer);
    }
}


/* =====================================
   🎤 OFFLINE TRANSCRIPTION (VOSK)
===================================== */
async function transcribeWithVosk(audioBuffer) {

    try {
        const Vosk = require('vosk');

        if (!fs.existsSync(VOSK_MODEL_PATH)) {
            console.log('⚠️ Vosk model not found.');
            return null;
        }

        const tmpFile = path.join(process.cwd(), 'tmp', `voice_${Date.now()}.wav`);
        await fs.promises.mkdir(path.dirname(tmpFile), { recursive: true });

        await new Promise((resolve, reject) => {
            const ff = spawn('ffmpeg', ['-i', 'pipe:0', '-ar', '16000', '-ac', '1', '-f', 'wav', tmpFile]);
            ff.stdin.write(audioBuffer);
            ff.stdin.end();
            ff.on('exit', code => code === 0 ? resolve() : reject());
        });

        const wavBuffer = await fs.promises.readFile(tmpFile);
        await fs.promises.unlink(tmpFile);

        const model = new Vosk.Model(VOSK_MODEL_PATH);
        const rec = new Vosk.Recognizer({ model, sampleRate: 16000 });

        rec.acceptWaveform(wavBuffer);
        const result = JSON.parse(rec.finalResult());

        return result.text?.trim() || null;

    } catch (error) {
        console.error('Offline transcription error:', error);
        return null;
    }
}


/* =====================================
   🎤 EXTRACT COMMAND
===================================== */
function extractCommand(text) {
    if (!text) return null;
    const normalized = text.trim().toLowerCase();
    return normalized.startsWith('.') ? normalized : '.' + normalized;
}


/* =====================================
   🎤 HANDLE VOICE MESSAGE
===================================== */
async function handleVoiceCommand(sock, chatId, message) {

    try {

        if (!message.message?.pttMessage && !message.message?.audioMessage)
            return null;

        await sock.sendPresenceUpdate('composing', chatId);

        const audioBuffer = await downloadMediaMessage(
            message,
            'buffer',
            {},
            { logger: undefined, reuploadRequest: sock.updateMediaMessage }
        );

        if (!audioBuffer) {
            await sock.sendMessage(chatId, { text: '❌ Audio extraction failed.' }, { quoted: message });
            return null;
        }

        const transcription = await transcribeAudio(audioBuffer);

        if (!transcription) {
            await sock.sendMessage(chatId, { text: '❌ Could not understand voice.' }, { quoted: message });
            return null;
        }

        await sock.sendMessage(chatId, { text: `🎤 Heard: _${transcription}_` }, { quoted: message });

        return extractCommand(transcription);

    } catch (error) {
        console.error('Voice handler error:', error);
        await sock.sendMessage(chatId, { text: '❌ Voice processing failed.' }, { quoted: message });
        return null;
    }
}


/* =====================================
   🎤 VOICE STATUS
===================================== */
async function voiceStatusCommand(sock, chatId, message) {

    const googleKey = GOOGLE_SPEECH_KEY ? '✅ Configured' : '❌ Not configured';
    const openaiKey = OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured';

    const status = `
🎤 Voice Status

Google Speech: ${googleKey}
OpenAI Whisper: ${openaiKey}

Offline Vosk: ${fs.existsSync(VOSK_MODEL_PATH) ? '✅ Ready' : '❌ Not ready'}
    `;

    await sock.sendMessage(chatId, { text: status.trim() }, { quoted: message });
}


module.exports = { handleVoiceCommand, voiceStatusCommand };
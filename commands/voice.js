const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { writeFileSync } = require('fs');
const { spawn } = require('child_process');

// @description Transcribe voice messages and execute spoken commands automatically

// Cache for transcription API key
let speechToTextKey = null;

function getSpeechToTextKey() {
    try {
        if (speechToTextKey) return speechToTextKey;
        
        // Try to load from environment
        if (process.env.GOOGLE_SPEECH_KEY) {
            speechToTextKey = process.env.GOOGLE_SPEECH_KEY;
            return speechToTextKey;
        }

        // Try to load from config file
        const configPath = path.join(__dirname, '..', 'config.js');
        if (fs.existsSync(configPath)) {
            const config = require(configPath);
            if (config.googleSpeechKey) {
                speechToTextKey = config.googleSpeechKey;
                return speechToTextKey;
            }
        }
    } catch (e) {
        console.error('Error loading speech-to-text key:', e);
    }
    return null;
}

/**
 * Transcribe audio buffer to text using Google Cloud Speech-to-Text API.
 * Alternative: You can use other services like Azure Speech or Whisper API.
 */
async function transcribeAudio(audioBuffer, mimeType = 'audio/ogg;codecs=opus') {
    const apiKey = getSpeechToTextKey();
    
    // If no API key, try using a fallback transcription service (Whisper API as fallback)
    if (!apiKey) {
        console.log('🎤 No Speech-to-Text API key configured. Using fallback transcription...');
        return await transcribeWithWhisper(audioBuffer);
    }

    try {
        // Google Cloud Speech-to-Text API
        const response = await axios.post(
            `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
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
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        if (response.data?.results?.[0]?.alternatives?.[0]?.transcript) {
            return response.data.results[0].alternatives[0].transcript.trim();
        }
        return null;
    } catch (error) {
        console.error('Error transcribing audio with Google:', error.message);
        // Fall back to Whisper API
        return await transcribeWithWhisper(audioBuffer);
    }
}

/**
 * Fallback transcription using OpenAI Whisper API (requires API key)
 */
async function transcribeWithWhisper(audioBuffer) {
    const whisperKey = process.env.OPENAI_API_KEY || process.env.WHISPER_KEY;
    
    if (!whisperKey) {
        console.log('⚠️  No Whisper API key found. Trying offline transcription...');
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
                    'Authorization': `Bearer ${whisperKey}`
                },
                timeout: 30000
            }
        );

        if (response.data?.text) {
            return response.data.text.trim();
        }
        return null;
    } catch (error) {
        console.error('Error transcribing audio with Whisper:', error.message);
        console.log('⚠️  Falling back to offline transcription...');
        return await transcribeWithVosk(audioBuffer);
    }
}

/**
 * Offline transcription using Vosk or fallback detection
 * Attempts to use Vosk library if installed, otherwise provides instructions
 */
async function transcribeWithVosk(audioBuffer) {
    /*
     * Attempt to perform offline speech-to-text using Vosk.
     * Requirements:
     *   npm install vosk
     *   Download and unpack a model, then set VOSK_MODEL_PATH env or place it
     *   under ./models/<model-folder>.
     */
    try {
        let Vosk;
        try {
            Vosk = require('vosk');
        } catch (e) {
            console.log('ℹ️  Vosk library not installed. To enable offline voice recognition run:');
            console.log('   npm install vosk');
            return null;
        }

        const modelPath = process.env.VOSK_MODEL_PATH || path.join(process.cwd(), 'models', 'vosk-model-small-en-us-0.15');
        if (!fs.existsSync(modelPath)) {
            console.log(`⚠️  Vosk model not found at ${modelPath}`);
            console.log('   Download a model from https://alphacephei.com/vosk/models and set VOSK_MODEL_PATH to its folder');
            return null;
        }

        // convert input buffer to 16k WAV using ffmpeg
        const tmpFile = path.join(process.cwd(), 'tmp', `voice_${Date.now()}.wav`);
        await fs.promises.mkdir(path.dirname(tmpFile), { recursive: true });
        await new Promise((resolve, reject) => {
            const ff = spawn('ffmpeg', ['-i', 'pipe:0', '-ar', '16000', '-ac', '1', '-f', 'wav', tmpFile]);
            ff.stdin.write(audioBuffer);
            ff.stdin.end();
            ff.on('error', reject);
            ff.on('exit', code => code === 0 ? resolve() : reject(new Error('ffmpeg failed ' + code)));
        });

        const wavBuffer = await fs.promises.readFile(tmpFile);
        try { await fs.promises.unlink(tmpFile); } catch {};

        const model = new Vosk.Model(modelPath);
        const rec = new Vosk.Recognizer({model: model, sampleRate: 16000});
        rec.acceptWaveform(wavBuffer);
        const result = rec.finalResult();
        const text = (JSON.parse(result).text || '').trim();
        if (text) return text;
        return null;
    } catch (error) {
        console.error('Offline transcription error:', error);
        return null;
    }
}

/**
 * Extract command from transcribed text
 * Handles variations like:
 *  - "menu" → ".menu"
 *  - "help" → ".help"
 *  - "ban user123" → ".ban user123"
 *  - ".ping" → ".ping"
 */
function extractCommand(text) {
    if (!text) return null;

    const normalized = text.trim().toLowerCase();
    
    // If already has a dot prefix, return as-is
    if (normalized.startsWith('.')) {
        return normalized;
    }

    // Try to match known command names (without dot prefix)
    // This will be validated later when the command is executed
    return '.' + normalized;
}

/**
 * Handle voice messages (audio and PTT)
 * This should be called from main.js when an audio/voice message is detected.
 */
async function handleVoiceCommand(sock, chatId, message, rawUserMessage = null) {
    try {
        // Check if message has audio or PTT
        if (!message.message?.pttMessage && !message.message?.audioMessage) {
            return null;
        }

        // Show typing indicator
        await sock.sendPresenceUpdate('composing', chatId);

        // Download audio buffer using the proper method
        console.log('🎤 Downloading voice message...');
        let audioBuffer;
        
        try {
            audioBuffer = await downloadMediaMessage(
                message,
                'buffer',
                {},
                { logger: undefined, reuploadRequest: sock.updateMediaMessage }
            );
        } catch (downloadError) {
            console.error('Error downloading audio:', downloadError);
            await sock.sendMessage(chatId, {
                text: '❌ Could not extract audio data. Please try again.'
            }, { quoted: message });
            return null;
        }

        if (!audioBuffer || !Buffer.isBuffer(audioBuffer)) {
            await sock.sendMessage(chatId, {
                text: '❌ Could not extract audio data. Please try again.'
            }, { quoted: message });
            return null;
        }

        // Transcribe audio
        console.log('🎤 Transcribing voice message...');
        const transcription = await transcribeAudio(audioBuffer);

        if (!transcription) {
            await sock.sendMessage(chatId, {
                text: "❌ I couldn't understand your voice message.\n\n🔧 *Setup Required:*\n\n1️⃣ *Using OpenAI Whisper (Recommended):*\nSet: OPENAI_API_KEY=sk-...\n\n2️⃣ *Using Google Speech-to-Text:*\nSet: GOOGLE_SPEECH_KEY=your-key\n\n3️⃣ *Using Vosk (Offline/Free):*\nnpm install vosk\nDownload: https://alphacephei.com/vosk/models"
            }, { quoted: message });
            return null;
        }

        console.log(`🎤 Transcribed: "${transcription}"`);

        // Extract command from transcription
        const voiceCommand = extractCommand(transcription);
        
        if (!voiceCommand) {
            await sock.sendMessage(chatId, {
                text: '❌ Command not recognized. Please say a valid command.'
            }, { quoted: message });
            return null;
        }

        console.log(`🎤 Voice command extracted: "${voiceCommand}"`);

        // Send transcription confirmation (optional, can be toggled)
        try {
            const voiceConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'voiceConfig.json'), 'utf8'));
            if (voiceConfig.showTranscription) {
                await sock.sendMessage(chatId, {
                    text: `🎤 *Heard:* _${transcription}_`
                }, { quoted: message });
            }
        } catch (e) {
            // Config not found, show transcription by default
            await sock.sendMessage(chatId, {
                text: `🎤 *Heard:* _${transcription}_`
            }, { quoted: message });
        }

        // Return the extracted command to be processed by main.js
        // This will be handled as if the user typed the command manually
        return voiceCommand;

    } catch (error) {
        console.error('Error handling voice command:', error);
        await sock.sendMessage(chatId, {
            text: "❌ I couldn't understand your voice message. Please try again."
        }, { quoted: message });
        return null;
    }
}

/**
 * Toggle voice command transcription display
 */
async function voiceConfigCommand(sock, chatId, message, args) {
    try {
        const configPath = path.join(__dirname, '..', 'data', 'voiceConfig.json');
        
        let config = { showTranscription: true };
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        const action = args ? args.split(' ')[0]?.toLowerCase() : null;

        if (action === 'on') {
            config.showTranscription = true;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            await sock.sendMessage(chatId, {
                text: '🎤 Voice transcription display is now **enabled**. The bot will show what it heard.'
            }, { quoted: message });
        } else if (action === 'off') {
            config.showTranscription = false;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            await sock.sendMessage(chatId, {
                text: '🎤 Voice transcription display is now **disabled**. The bot will silently execute voice commands.'
            }, { quoted: message });
        } else {
            const currentState = config.showTranscription ? 'enabled' : 'disabled';
            await sock.sendMessage(chatId, {
                text: `🎤 Voice Transcription Display: **${currentState}**\n\nUse:\n.voiceconfig on - Show transcription\n.voiceconfig off - Hide transcription`,
                quoted: message
            });
        }
    } catch (error) {
        console.error('Error in voiceConfigCommand:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Error configuring voice settings'
        }, { quoted: message });
    }
}

/**
 * Display voice API status and setup instructions
 */
async function voiceStatusCommand(sock, chatId, message) {
    const googleKey = process.env.GOOGLE_SPEECH_KEY ? '✅ Configured' : '❌ Not configured';
    const openaiKey = process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured';
    
    const status = `
🎤 *Voice Command Status*

📊 *API Configuration:*
• Google Speech-to-Text: ${googleKey}
• OpenAI Whisper: ${openaiKey}

🚀 *Setup Instructions:*

1️⃣ *Using OpenAI Whisper (Recommended):*
export OPENAI_API_KEY=sk-your-api-key

2️⃣ *Using Google Cloud:*
export GOOGLE_SPEECH_KEY=your-key

3️⃣ *Using Vosk (Offline/Free):*
npm install vosk
Download model: https://alphacephei.com/vosk/models

💡 *Without APIs, voice commands will not work.*
    `;
    
    await sock.sendMessage(chatId, { text: status.trim() }, { quoted: message });
}

module.exports = { handleVoiceCommand, voiceConfigCommand, voiceStatusCommand };
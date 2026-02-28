const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { writeFileSync } = require('fs');

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
        console.log('⚠️  No transcription API key found. Cannot transcribe audio.');
        return null;
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
        // Extract audio data
        let audioData = null;
        let mediaUrl = null;

        // PTT (Push-to-Talk) message
        if (message.message?.pttMessage) {
            mediaUrl = await sock.downloadMediaMessage(message);
            audioData = mediaUrl;
        }
        // Regular audio message
        else if (message.message?.audioMessage) {
            mediaUrl = await sock.downloadMediaMessage(message);
            audioData = mediaUrl;
        }

        if (!audioData) {
            await sock.sendMessage(chatId, {
                text: '❌ Could not extract audio data. Please try again.'
            }, { quoted: message });
            return;
        }

        // Show typing indicator
        await sock.sendPresenceUpdate('composing', chatId);

        // Transcribe audio
        console.log('🎤 Transcribing voice message...');
        const audioBuffer = Buffer.isBuffer(audioData) ? audioData : audioData;
        const transcription = await transcribeAudio(audioBuffer);

        if (!transcription) {
            await sock.sendMessage(chatId, {
                text: "❌ I couldn't understand your voice message. Please try again."
            }, { quoted: message });
            return;
        }

        console.log(`🎤 Transcribed: "${transcription}"`);

        // Extract command from transcription
        const voiceCommand = extractCommand(transcription);
        
        if (!voiceCommand) {
            await sock.sendMessage(chatId, {
                text: '❌ Command not recognized. Please say a valid command.'
            }, { quoted: message });
            return;
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

module.exports = { handleVoiceCommand, voiceConfigCommand };
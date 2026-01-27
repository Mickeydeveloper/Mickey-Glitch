const axios = require('axios');
const yts = require('yt-search');
const { toAudio } = require('../lib/converter');

/**
 * Download audio using PLAY url from vreden API and convert
 */
async function downloadAudio(query) {
    const apiUrl = `https://api.vreden.my.id/api/v1/download/play/audio?query=${encodeURIComponent(query)}`;

    const { data } = await axios.get(apiUrl, { timeout: 60000 });

    if (!data || !data.result || !data.result.play) {
        throw new Error('Invalid API response (no play url)');
    }

    const {
        play,
        title = 'audio'
    } = data.result;

    // Download audio from PLAY url
    const audioRes = await axios.get(play, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': '*/*'
        }
    });

    if (!audioRes.data || audioRes.data.byteLength < 30000) {
        throw new Error('Audio stream too small or empty');
    }

    // Convert audio using converter
    const convertedBuffer = await toAudio(Buffer.from(audioRes.data), 'mp3');

    return {
        buffer: convertedBuffer,
        title
    };
}

/**
 * SONG COMMAND
 */
async function songCommand(sock, chatId, message) {
    try {
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        if (!text.trim()) {
            return sock.sendMessage(
                chatId,
                { text: 'Usage: .song <song name or YouTube link>' },
                { quoted: message }
            );
        }

        // Optional preview (search only)
        let preview;
        if (!text.includes('youtube.com') && !text.includes('youtu.be')) {
            const search = await yts(text);
            if (search.videos.length) preview = search.videos[0];
        }

        // Preview message
        await sock.sendMessage(
            chatId,
            {
                image: preview?.thumbnail ? { url: preview.thumbnail } : undefined,
                caption: `🎵 *${preview?.title || text}*\n\nDownloading audio…`
            },
            { quoted: message }
        );

        // Download using PLAY url
        const { buffer, title } = await downloadAudio(text);

        const safeTitle = (title || 'audio')
            .replace(/[^a-z0-9 ]/gi, '_')
            .slice(0, 60);

        await sock.sendMessage(
            chatId,
            {
                audio: buffer,
                mimetype: 'audio/mpeg',
                fileName: `${safeTitle}.mp3`,
                ptt: false
            },
            { quoted: message }
        );

        console.log('[SONG] Sent:', safeTitle);

    } catch (err) {
        console.error('[SONG ERROR]', err);

        let msg = '❌ Failed to download song.';
        const e = (err.message || '').toLowerCase();

        if (e.includes('timeout')) {
            msg = '❌ Server timeout. Try again.';
        } else if (e.includes('play')) {
            msg = '❌ Audio stream unavailable.';
        }

        await sock.sendMessage(chatId, { text: msg }, { quoted: message });
    }
}

module.exports = songCommand;
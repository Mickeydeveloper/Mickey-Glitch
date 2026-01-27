const axios = require('axios');
const yts = require('yt-search');

/**
 * Download audio using vreden API
 */
async function downloadAudio(query) {
    const api = `https://api.vreden.my.id/api/v1/download/play/audio?query=${encodeURIComponent(query)}`;

    const { data } = await axios.get(api, { timeout: 60000 });

    if (!data || !data.result || !data.result.download) {
        throw new Error('Invalid API response');
    }

    const audioUrl = data.result.download;

    const audioRes = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 60000
    });

    return {
        buffer: Buffer.from(audioRes.data),
        title: data.result.title || 'audio'
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

        let title = text;
        let thumbnail;

        // Search only for preview (optional)
        if (!text.includes('youtube.com') && !text.includes('youtu.be')) {
            const search = await yts(text);
            if (search.videos.length) {
                title = search.videos[0].title;
                thumbnail = search.videos[0].thumbnail;
            }
        }

        // Preview message
        await sock.sendMessage(
            chatId,
            {
                image: thumbnail ? { url: thumbnail } : undefined,
                caption: `🎵 *${title}*\n\nDownloading audio…`
            },
            { quoted: message }
        );

        // Download audio
        const { buffer, title: apiTitle } = await downloadAudio(text);

        if (!buffer || buffer.length < 30000) {
            throw new Error('Audio too small or empty');
        }

        const safeTitle = (apiTitle || title)
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
        } else if (e.includes('invalid')) {
            msg = '❌ Download service error.';
        }

        await sock.sendMessage(chatId, { text: msg }, { quoted: message });
    }
}

module.exports = songCommand;
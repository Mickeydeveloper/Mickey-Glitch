const axios = require('axios');

async function spotifyCommand(sock, chatId, message) {
    try {
        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        const used = (rawText || '').split(/\s+/)[0] || '.spotify';
        const query = rawText.slice(used.length).trim();

        if (!query) {
            await sock.sendMessage(chatId, { text: 'Usage: .spotify <spotify_url>\nExample: .spotify https://open.spotify.com/track/...' }, { quoted: message });
            return;
        }

        // Ensure caller provided a Spotify URL (the downstream API expects a URL)
        const isSpotifyUrl = /^(spotify:|https?:\/\/(open\.)?spotify\.com)\/?.+/i.test(query) || /spotify:track:/i.test(query);
        if (!isSpotifyUrl) {
            await sock.sendMessage(chatId, { text: 'Please provide a valid Spotify URL (track/album/playlist).\nExample: .spotify https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6' }, { quoted: message });
            return;
        }

        const apiUrl = `https://api.vreden.my.id/api/v1/download/spotify?url=${encodeURIComponent(query)}`;
        const { data } = await axios.get(apiUrl, { timeout: 20000, headers: { 'user-agent': 'Mozilla/5.0' } });

        if (!data?.status || !data?.result) {
            throw new Error('No result from Spotify API');
        }

        const r = data.result;
        const audioUrl = r.audio;
        if (!audioUrl) {
            await sock.sendMessage(chatId, { text: 'No downloadable audio found for this query.' }, { quoted: message });
            return;
        }

        const caption = `🎵 ${r.title || r.name || 'Unknown Title'}\n👤 ${r.artist || ''}\n⏱ ${r.duration || ''}\n🔗 ${r.url || ''}`.trim();

         // Send cover and info as a follow-up (optional)
         if (r.thumbnails) {
            await sock.sendMessage(chatId, { image: { url: r.thumbnails }, caption }, { quoted: message });
        } else if (caption) {
            await sock.sendMessage(chatId, { text: caption }, { quoted: message });
        }
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            fileName: `${(r.title || r.name || 'track').replace(/[\\/:*?"<>|]/g, '')}.mp3`
        }, { quoted: message });

       

    } catch (error) {
        console.error('[SPOTIFY] error:', error?.message || error);
        if (error?.response) {
            console.error('[SPOTIFY] response status:', error.response.status);
            console.error('[SPOTIFY] response data:', error.response.data);
        }
        const status = error?.response?.status;
        const statusText = status ? ` (status ${status})` : '';
        await sock.sendMessage(chatId, { text: `Failed to fetch Spotify audio${statusText}. Ensure you provided a valid Spotify URL, or try again later.` }, { quoted: message });
    }
}

module.exports = spotifyCommand;

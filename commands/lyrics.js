const fetch = require('node-fetch');

/**
 * @command: .lyrics
 * @description: Get song lyrics from Alan Walker and other artists
 * @usage: .lyrics <song name>
 * @example: .lyrics Alone
 */

async function lyricsCommand(sock, chatId, songTitle, message) {
    if (!songTitle) {
        await sock.sendMessage(chatId, { 
            text: '🎵 *LYRICS COMMAND*\n\n🔍 *Usage:* `.lyrics <song name>`\n📝 *Example:* `.lyrics Alone`\n🎤 *Example:* `.lyrics Faded`\n\n⚡ *Supported artists:* Alan Walker, Charli XCX, Steve Aoki, Sofia Carson & more!'
        }, { quoted: message });
        return;
    }

    try {
        // Send loading message
        await sock.sendMessage(chatId, { 
            text: `⏳ *Searching lyrics for:* "${songTitle}"...\n🔍 Please wait...`
        }, { quoted: message });

        // API call
        const apiUrl = `https://api.popcat.xyz/v2/lyrics?song=${encodeURIComponent(songTitle)}`;
        const res = await fetch(apiUrl);

        if (!res.ok) {
            throw new Error(`API returned ${res.status}`);
        }

        const data = await res.json();

        // Check if API returned success and has results
        if (!data.success || !data.result || data.result.length === 0) {
            await sock.sendMessage(chatId, { 
                text: `❌ *No lyrics found for:* "${songTitle}"\n\n💡 *Try:*\n• Checking the spelling\n• Using a different song title\n• Example: .lyrics Faded`
            }, { quoted: message });
            return;
        }

        // Get first result (best match)
        const song = data.result[0];
        
        // Check if song has lyrics (not instrumental)
        if (song.instrumental === true || !song.plainLyrics) {
            await sock.sendMessage(chatId, { 
                text: `🎵 *${song.trackName}* by *${song.artistName}*\n\n⚠️ *This song is instrumental!*\nNo lyrics available for this track.`
            }, { quoted: message });
            return;
        }

        // Prepare lyrics with better formatting
        const duration = formatDuration(song.duration);
        const lyrics = song.plainLyrics;
        
        // Create beautiful formatted message
        let output = `🎤 *LYRICS FOUND!*\n\n`;
        output += `╭━━━━━━━━━━━━━━━━━━━━╮\n`;
        output += `┃ 🎵 *Title:* ${song.trackName}\n`;
        output += `┃ 👤 *Artist:* ${song.artistName}\n`;
        output += `┃ 💿 *Album:* ${song.albumName || 'Single'}\n`;
        output += `┃ ⏱️ *Duration:* ${duration}\n`;
        output += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        output += `📝 *LYRICS:*\n━━━━━━━━━━━━━━━━━━━━\n`;
        output += `${lyrics}\n\n`;
        output += `━━━━━━━━━━━━━━━━━━━━\n`;
        output += `✨ *Enjoy the song!* | 🎧 *Mickey Glitch Bot*`;

        // Split if too long (WhatsApp limit ~4096 chars)
        const maxLength = 4000;
        if (output.length > maxLength) {
            // Send first part with lyrics
            const firstPart = output.slice(0, maxLength);
            await sock.sendMessage(chatId, { text: firstPart }, { quoted: message });
            
            // Send remaining lyrics if any
            let remaining = output.slice(maxLength);
            while (remaining.length > 0) {
                const part = remaining.slice(0, maxLength);
                await sock.sendMessage(chatId, { text: part });
                remaining = remaining.slice(maxLength);
            }
        } else {
            await sock.sendMessage(chatId, { text: output }, { quoted: message });
        }

        // Optional: Send synced lyrics if available
        if (song.syncedLyrics && song.syncedLyrics.length > 0) {
            const syncMsg = `🎼 *SYNCED LYRICS (LRC)*\n━━━━━━━━━━━━━━━━━━━━\n\`\`\`${song.syncedLyrics.slice(0, 1500)}\`\`\``;
            await sock.sendMessage(chatId, { text: syncMsg });
        }

    } catch (error) {
        console.error('Lyrics Command Error:', error);
        
        // Better error message
        let errorMsg = `❌ *Error fetching lyrics!*\n\n`;
        errorMsg += `🔍 *Search:* "${songTitle}"\n`;
        errorMsg += `💡 *Troubleshooting:*\n`;
        errorMsg += `• Check your internet connection\n`;
        errorMsg += `• Try a different song name\n`;
        errorMsg += `• Example: .lyrics Faded\n`;
        errorMsg += `• Example: .lyrics The Spectre\n\n`;
        errorMsg += `⚡ *Supported:* Alan Walker & more!`;
        
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
    }
}

// Helper function to format duration (seconds to MM:SS)
function formatDuration(seconds) {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Optional: Search for specific song by ID
async function lyricsById(sock, chatId, songId, message) {
    try {
        const apiUrl = `https://eliteprotech-apis.zone.id/lyrics?id=${songId}`;
        const res = await fetch(apiUrl);
        const data = await res.json();
        
        if (!data.success || !data.result) {
            throw new Error('Song not found');
        }
        
        const song = data.result;
        // Same formatting as above...
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Optional: Get multiple song suggestions
async function searchSongs(sock, chatId, query, message) {
    try {
        const apiUrl = `https://eliteprotech-apis.zone.id/lyrics?query=${encodeURIComponent(query)}`;
        const res = await fetch(apiUrl);
        const data = await res.json();
        
        if (!data.success || !data.result || data.result.length === 0) {
            await sock.sendMessage(chatId, { text: `❌ No results for "${query}"` });
            return;
        }
        
        let output = `🔍 *SEARCH RESULTS for "${query}"*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        data.result.forEach((song, index) => {
            if (index < 10) { // Show first 10
                const duration = formatDuration(song.duration);
                output += `${index + 1}. 🎵 *${song.trackName}*\n`;
                output += `   👤 ${song.artistName}\n`;
                output += `   ⏱️ ${duration} ${song.instrumental ? '🎹 [Instrumental]' : '🎤 [With Lyrics]'}\n\n`;
            }
        });
        
        output += `━━━━━━━━━━━━━━━━━━━━\n`;
        output += `💡 Use: *.lyrics ${query}* to get lyrics!`;
        
        await sock.sendMessage(chatId, { text: output }, { quoted: message });
        
    } catch (error) {
        console.error('Search Error:', error);
    }
}

module.exports = { 
    lyricsCommand,
    lyricsById,
    searchSongs,
    formatDuration 
};
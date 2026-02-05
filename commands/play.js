const axios = require('axios');
const yts = require('yt-search');
const config = require('../config.js');

const OWNER_NAME = (config && config.OWNER_NAME) || process.env.OWNER_NAME || 'Mickey';

/**
 * SONG COMMAND
 */
async function songCommand(sock, chatId, message) {
  const textBody =
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    '';

  // Extract the song name or link
  const args = textBody.trim().split(/\s+/);
  const query = args.length > 1 ? args.slice(1).join(' ') : null;

  if (!query) {
    return sock.sendMessage(chatId, { text: '❌ Please provide a song name or YouTube link.' }, { quoted: message });
  }

  try {
    // 1. React with Search Icon
    try { await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } }); } catch {}

    /* ─────── YouTube Search (Using yt-search) ─────── */
    const searchResult = await yts(query);
    const video = searchResult.videos[0]; // Get the first result

    if (!video) {
      return sock.sendMessage(chatId, { text: '❌ No results found on YouTube.' }, { quoted: message });
    }

    const videoUrl = video.url;
    const videoTitle = video.title;
    const timestamp = video.timestamp;
    const thumbnail = video.thumbnail;

    // 2. Inform User
    await sock.sendMessage(chatId, { text: `📥 Downloading: *${videoTitle}*...` }, { quoted: message });

    /* ─────── Download API Logic ─────── */
    // Using your specific API URL format
    const apiEndpoint = `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${encodeURIComponent(videoUrl)}`;
    
    const response = await axios.get(apiEndpoint, {
      timeout: 30000, // Wait up to 30 seconds for the download link
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    });

    // Extracting the download link from your specific API response
    const downloadUrl = response.data?.result?.download_url || response.data?.data?.download || response.data?.url;

    if (!downloadUrl) {
      throw new Error('Could not retrieve a valid download link from the API.');
    }

    // Clean filename for WhatsApp stability
    const safeName = videoTitle.replace(/[\\/:*?"<>|]/g, '').slice(0, 40);

    /* ─────── Send Audio File ─────── */
    await sock.sendMessage(
      chatId,
      {
        audio: { url: downloadUrl },
        mimetype: 'audio/mpeg',
        fileName: `${safeName}.mp3`,
        ptt: false, // Set to true if you want it to send as a voice note
        contextInfo: {
          externalAdReply: {
            title: videoTitle,
            body: `Duration: ${timestamp} | Requested by ${OWNER_NAME}`,
            thumbnailUrl: thumbnail,
            mediaType: 1,
            showAdAttribution: true,
            renderLargerThumbnail: true,
            sourceUrl: videoUrl
          }
        }
      },
      { quoted: message }
    );

    // Final Success Reaction
    try { await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }); } catch {}

  } catch (err) {
    console.error('❌ SONG ERROR:', err.message);
    await sock.sendMessage(chatId, { text: `❌ Error: ${err.message || 'The download server is currently unavailable.'}` }, { quoted: message });
    try { await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }); } catch {}
  }
}

module.exports = songCommand;

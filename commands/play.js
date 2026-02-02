const axios = require('axios');
const config = require('../config.js');

const OWNER_NAME = (config && config.OWNER_NAME) || process.env.OWNER_NAME || 'Mickey';
const API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyDV11sdmCCdyyToNU-XRFMbKgAA4IEDOS0';
const FASTAPI_URL = process.env.FASTAPI_URL || 'https://api.danscot.dev/api';

async function songCommand(sock, chatId, message) {
  const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
  try {
    const title = getArg(textBody);
    if (!title) {
      await sock.sendMessage(chatId, { text: '❌ Please provide a video title.' }, { quoted: message });
      return;
    }

    // React to user's command to show processing (best-effort)
    try {
      await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });
    } catch (e) {
      // ignore if not supported
    }

    // Improved initial status message
    await sock.sendMessage(chatId, { text: `🔎 Searching for: *${title}*\nPlease wait...` }, { quoted: message });

    // Search YouTube
    const searchUrl = 'https://www.googleapis.com/youtube/v3/search';
    const { data: searchData } = await axios.get(searchUrl, {
      params: { part: 'snippet', q: title, type: 'video', maxResults: 1, key: API_KEY },
      timeout: 20000
    });

    if (!searchData?.items || searchData.items.length === 0) {
      throw new Error('No video found.');
    }

    const video = searchData.items[0];
    const videoId = video.id?.videoId || (video.id && video.id);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const videoTitle = video.snippet.title;
    const thumbnail = video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url || null;

    // Call FastAPI downloader only
    const apiUrl = `${FASTAPI_URL}/youtube/downl/`;
    const { data } = await axios.get(apiUrl, { params: { url: videoUrl, fmt: 'mp3' }, timeout: 60000 });

    let downloadUrl = null;
    if (data?.status === 'ok' && data?.results?.download_url) downloadUrl = data.results.download_url;
    else if (data?.results?.download) downloadUrl = data.results.download;
    else if (data?.download_url) downloadUrl = data.download_url;
    else if (data?.data?.download_url) downloadUrl = data.data.download_url;

    if (!downloadUrl) throw new Error('Failed to get audio from FastAPI downloader.');

    // Try to fetch content-length for nicer UI (optional)
    let sizeText = '';
    let sizeMB = null;
    try {
      const head = await axios.head(downloadUrl, { timeout: 10000 });
      const len = head.headers['content-length'] || head.headers['Content-Length'];
      if (len) {
        const mb = (Number(len) / 1024 / 1024).toFixed(2);
        sizeText = `• Size: ${mb} MB`;
        sizeMB = mb;
      }
    } catch (e) {
      // ignore head errors — not critical
    }

    // Fetch video duration via YouTube Videos API for nicer info
    let durationText = 'Unknown';
    try {
      const vd = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: { part: 'contentDetails,snippet', id: videoId, key: API_KEY }
      });
      const item = vd?.data?.items?.[0];
      const iso = item?.contentDetails?.duration;
      if (iso) {
        durationText = isoToTime(iso);
      }
    } catch (e) {
      // ignore
    }

    // Build a clean, safe filename
    const shortTitle = (videoTitle || 'Unknown').replace(/\s+/g, ' ').trim();
    const safeFileName = shortTitle.replace(/[\\/:*?"<>|]/g, '') || 'song';

    // Prepare ad-style message (like alive.js) — no explicit link or "converting" text
    const adText = `🎵 Downloading: *${shortTitle}*\n⏱ Duration: ${durationText}${sizeText ? `\n${sizeText}` : ''}`;

    // Send single ad-style message with large thumbnail preview
    await sock.sendMessage(chatId, {
      text: adText,
      contextInfo: {
        externalAdReply: {
          title: shortTitle || 'Music',
          body: `${durationText}${sizeMB ? ` • ${sizeMB} MB` : ''}`,
          thumbnailUrl: thumbnail,
          sourceUrl: videoUrl,
          mediaType: 1,
          showAdAttribution: false,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: message });

    // Send audio via URL with sanitized filename
    await sock.sendMessage(chatId, {
      audio: { url: downloadUrl },
      mimetype: 'audio/mpeg',
      fileName: `${safeFileName}.mp3`,
      ptt: false
    }, { quoted: message });

    // Mark original command as completed (best-effort reaction)
    try {
      await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (e) {
      // ignore if not supported
    }

  } catch (err) {
    console.error('❌ Error in play command:', err?.message || err);
    try { await sock.sendMessage(chatId, { text: `❌ Failed to play: ${err?.message || String(err)}` }, { quoted: message }); } catch (e) { }
  }
}

function getArg(body) {
  const parts = body.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(' ') : null;
}

function isoToTime(iso) {
  if (!iso || typeof iso !== 'string') return 'Unknown';
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 'Unknown';
  const hours = parseInt(m[1] || 0, 10);
  const mins = parseInt(m[2] || 0, 10);
  const secs = parseInt(m[3] || 0, 10);
  if (hours > 0) return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

module.exports = songCommand;
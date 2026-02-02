const axios = require('axios');
const config = require('../config.js');

const OWNER_NAME =
  (config && config.OWNER_NAME) ||
  process.env.OWNER_NAME ||
  'Mickey';

const API_KEY =
  process.env.YOUTUBE_API_KEY ||
  'AIzaSyDV11sdmCCdyyToNU-XRFMbKgAA4IEDOS0';

// Main API + fallback
const FASTAPI_PRIMARY =
  process.env.FASTAPI_URL ||
  'https://api.danscot.dev/api';

const FASTAPI_FALLBACK =
  'https://api.vreden.my.id/api/v1/download/play/audio';

/**
 * SONG COMMAND
 */
async function songCommand(sock, chatId, message) {
  const textBody =
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    '';

  try {
    const title = getArg(textBody);
    if (!title) {
      return sock.sendMessage(
        chatId,
        { text: '❌ Please provide a song name.' },
        { quoted: message }
      );
    }

    // Reaction (best effort)
    try {
      await sock.sendMessage(chatId, {
        react: { text: '🔎', key: message.key }
      });
    } catch {}

    await sock.sendMessage(
      chatId,
      { text: `🔎 Searching: *${title}*` },
      { quoted: message }
    );

    /* ---------------- YOUTUBE SEARCH ---------------- */
    const searchRes = await axios.get(
      'https://www.googleapis.com/youtube/v3/search',
      {
        params: {
          part: 'snippet',
          q: title,
          type: 'video',
          maxResults: 1,
          key: API_KEY
        },
        timeout: 20000
      }
    );

    const video = searchRes.data?.items?.[0];
    if (!video) throw new Error('No video found');

    const videoId = video.id.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const videoTitle = video.snippet.title;
    const thumbnail =
      video.snippet.thumbnails?.high?.url ||
      video.snippet.thumbnails?.default?.url;

    /* ---------------- DOWNLOAD AUDIO ---------------- */
    const downloadUrl = await getAudioUrl(videoUrl);

    /* ---------------- VIDEO DURATION ---------------- */
    let durationText = 'Unknown';
    try {
      const vd = await axios.get(
        'https://www.googleapis.com/youtube/v3/videos',
        {
          params: {
            part: 'contentDetails',
            id: videoId,
            key: API_KEY
          }
        }
      );
      const iso = vd.data?.items?.[0]?.contentDetails?.duration;
      if (iso) durationText = isoToTime(iso);
    } catch {}

    /* ---------------- FILE NAME ---------------- */
    const safeName = videoTitle
      .replace(/[\\/:*?"<>|]/g, '')
      .slice(0, 80);

    /* ---------------- INFO MESSAGE ---------------- */
    await sock.sendMessage(
      chatId,
      {
        text: `🎵 *${videoTitle}*\n⏱ Duration: ${durationText}`,
        contextInfo: {
          externalAdReply: {
            title: videoTitle,
            body: `Requested by ${OWNER_NAME}`,
            thumbnailUrl: thumbnail,
            sourceUrl: videoUrl,
            mediaType: 1,
            renderLargerThumbnail: true
          }
        }
      },
      { quoted: message }
    );

    /* ---------------- SEND AUDIO ---------------- */
    await sock.sendMessage(
      chatId,
      {
        audio: { url: downloadUrl },
        mimetype: 'audio/mpeg',
        fileName: `${safeName}.mp3`,
        ptt: false
      },
      { quoted: message }
    );

    // Success reaction
    try {
      await sock.sendMessage(chatId, {
        react: { text: '✅', key: message.key }
      });
    } catch {}

  } catch (err) {
    console.error('❌ PLAY ERROR:', err);

    const msg =
      err.message.includes('server') ||
      err.message.includes('Downloader')
        ? '❌ Music server busy. Try again later.'
        : '❌ Failed to play this song.';

    await sock.sendMessage(
      chatId,
      { text: msg },
      { quoted: message }
    );
  }
}

/* ======================================================
   AUDIO FETCHER (PRIMARY + FALLBACK)
====================================================== */
async function getAudioUrl(videoUrl) {
  // 1️⃣ PRIMARY API
  try {
    const res = await axios.get(
      `${FASTAPI_PRIMARY}/youtube/downl`,
      {
        params: { url: videoUrl, fmt: 'mp3' },
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json'
        }
      }
    );

    const url =
      res.data?.results?.download_url ||
      res.data?.results?.download ||
      res.data?.download_url;

    if (url) return url;
    throw new Error('Primary downloader failed');
  } catch (e) {
    console.warn('⚠️ Primary API failed, using fallback');
  }

  // 2️⃣ FALLBACK API
  const fallback = await axios.get(FASTAPI_FALLBACK, {
    params: { query: videoUrl },
    timeout: 60000
  });

  const fbUrl = fallback.data?.data?.download_url;
  if (!fbUrl) throw new Error('Downloader server error');

  return fbUrl;
}

/* ======================================================
   HELPERS
====================================================== */
function getArg(body) {
  const parts = body.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(' ') : null;
}

function isoToTime(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 'Unknown';
  const h = +m[1] || 0;
  const mnt = +m[2] || 0;
  const s = +m[3] || 0;
  return h
    ? `${h}:${String(mnt).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${mnt}:${String(s).padStart(2, '0')}`;
}

module.exports = songCommand;
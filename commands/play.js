const axios = require('axios');
const config = require('../config.js');

const OWNER_NAME =
  config?.OWNER_NAME ||
  process.env.OWNER_NAME ||
  'Mickey';

const YT_API_KEY =
  process.env.YOUTUBE_API_KEY ||
  'AIzaSyDV11sdmCCdyyToNU-XRFMbKgAA4IEDOS0';

// FASTAPI PRIMARY ONLY
const FASTAPI_URL =
  process.env.FASTAPI_URL ||
  'https://api.danscot.dev/api';

// Optional downloader API key
const FASTAPI_KEY =
  process.env.FASTAPI_KEY || null;

/**
 * PLAY SONG COMMAND
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

    // Reaction (safe)
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

    /* ─────── YouTube Search ─────── */
    const searchRes = await axios.get(
      'https://www.googleapis.com/youtube/v3/search',
      {
        params: {
          part: 'snippet',
          q: title,
          type: 'video',
          maxResults: 1,
          key: YT_API_KEY
        },
        timeout: 20000
      }
    );

    const video = searchRes.data?.items?.[0];
    if (!video) throw new Error('No results found');

    const videoId = video.id.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const videoTitle = video.snippet.title;
    const thumbnail =
      video.snippet.thumbnails?.high?.url ||
      video.snippet.thumbnails?.default?.url;

    /* ─────── FASTAPI DOWNLOAD ─────── */
    const downloadUrl = await getAudioFromFastAPI(videoUrl);

    /* ─────── Duration ─────── */
    let durationText = 'Unknown';
    try {
      const vd = await axios.get(
        'https://www.googleapis.com/youtube/v3/videos',
        {
          params: {
            part: 'contentDetails',
            id: videoId,
            key: YT_API_KEY
          }
        }
      );
      const iso = vd.data?.items?.[0]?.contentDetails?.duration;
      if (iso) durationText = isoToTime(iso);
    } catch {}

    /* ─────── File name ─────── */
    const safeName = videoTitle
      .replace(/[\\/:*?"<>|]/g, '')
      .slice(0, 80);

    /* ─────── Info message ─────── */
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

    /* ─────── Send Audio ─────── */
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

    let msg = '❌ Failed to play this song.';
    if (err.message.includes('server')) {
      msg = '❌ Music server busy. Try again later.';
    }

    await sock.sendMessage(
      chatId,
      { text: msg },
      { quoted: message }
    );
  }
}

/* ======================================================
   FASTAPI AUDIO FETCHER (PRIMARY ONLY)
====================================================== */
async function getAudioFromFastAPI(videoUrl) {
  try {
    const res = await axios.get(
      `${FASTAPI_URL}/youtube/downl`,
      {
        params: {
          url: videoUrl,
          fmt: 'mp3',
          ...(FASTAPI_KEY ? { key: FASTAPI_KEY } : {})
        },
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json'
        },
        timeout: 60000
      }
    );

    const downloadUrl =
      res.data?.results?.download_url ||
      res.data?.results?.download ||
      res.data?.download_url;

    if (!downloadUrl) {
      throw new Error('Downloader response invalid');
    }

    return downloadUrl;

  } catch (err) {
    if (err.response?.status === 500) {
      throw new Error('Music server error');
    }
    throw new Error('Downloader not responding');
  }
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
const axios = require('axios');
const config = require('../config.js');

const OWNER_NAME =
  (config && config.OWNER_NAME) ||
  process.env.OWNER_NAME ||
  'Mickey';

const API_KEY =
  process.env.YOUTUBE_API_KEY ||
  'AIzaSyDV11sdmCCdyyToNU-XRFMbKgAA4IEDOS0';

/* ======================================================
   MULTI MP3 APIS (FAST RACE)
====================================================== */
const MP3_APIS = [
  url => `https://apis-malvin.vercel.app/download/dlmp3?url=${url}`,
  url => `https://apis.davidcyriltech.my.id/youtube/mp3?url=${url}`,
  url => `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${url}`,
  url => `https://api.dreaded.site/api/ytdl/audio?url=${url}`,
  url => `https://jawad-tech.vercel.app/download/ytmp3?url=${url}`,
  url => `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${url}`
];

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
        { text: '❌ Please provide a video title.' },
        { quoted: message }
      );
    }

    // React (safe)
    try {
      await sock.sendMessage(chatId, {
        react: { text: '🔎', key: message.key }
      });
    } catch {}

    await sock.sendMessage(
      chatId,
      { text: `🔎 Searching for: *${title}*` },
      { quoted: message }
    );

    /* ─────── YouTube Search ─────── */
    const search = await axios.get(
      'https://www.googleapis.com/youtube/v3/search',
      {
        params: {
          part: 'snippet',
          q: title,
          type: 'video',
          maxResults: 1,
          key: API_KEY
        },
        timeout: 15000
      }
    );

    const video = search.data?.items?.[0];
    if (!video) throw new Error('No video found');

    const videoId = video.id.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const videoTitle = video.snippet.title;
    const thumbnail =
      video.snippet.thumbnails?.high?.url ||
      video.snippet.thumbnails?.default?.url;

    /* ─────── FAST MP3 FETCH ─────── */
    const downloadUrl = await fetchMp3Fast(videoUrl);

    /* ─────── Duration (optional) ─────── */
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

    const safeName = videoTitle
      .replace(/[\\/:*?"<>|]/g, '')
      .slice(0, 80);

    /* ─────── Info Message ─────── */
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

    try {
      await sock.sendMessage(chatId, {
        react: { text: '✅', key: message.key }
      });
    } catch {}

  } catch (err) {
    console.error('❌ PLAY ERROR:', err);
    await sock.sendMessage(
      chatId,
      { text: '❌ Failed to play this song. Try again.' },
      { quoted: message }
    );
  }
}

/* ======================================================
   FAST MULTI-API RACE (FIRST SUCCESS WINS)
====================================================== */
async function fetchMp3Fast(videoUrl) {
  const requests = MP3_APIS.map(fn =>
    axios
      .get(fn(videoUrl), { timeout: 20000 })
      .then(res => extractDownloadUrl(res.data))
      .catch(() => null)
  );

  const results = await Promise.all(requests);
  const url = results.find(u => u && u.startsWith('http'));

  if (!url) throw new Error('All MP3 servers failed');
  return url;
}

/* ======================================================
   RESPONSE PARSER (MULTI FORMAT)
====================================================== */
function extractDownloadUrl(data) {
  return (
    data?.result?.download_url ||
    data?.result?.url ||
    data?.data?.download ||
    data?.data?.url ||
    data?.download ||
    data?.url ||
    null
  );
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
const axios = require('axios');
const fs = require('fs/promises');
const { createWriteStream } = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');

const NEW_API_BASE = 'https://engez.a7a.online/api/v1/download/ytdl';
const OLD_API_BASE = 'https://engez.a7a.online/api/v1/download/youtube';
const SELECT_SEPARATOR = '|';

const DOWNLOAD_TIMEOUT_MS = 120 * 1000;

function addProtocol(url) {
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function isYouTubeUrl(input) {
  try {
    const parsed = new URL(addProtocol(input));
    const host = parsed.hostname.replace(/^www\./i, '').replace(/^m\./i, '');
    return host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com');
  } catch {
    return false;
  }
}

function cleanTitle(value) {
  if (!value) return 'Unknown Title';
  return String(value).replace(/\s+/g, ' ').trim();
}

function buildApiUrl(base, url, type, quality) {
  const params = new URLSearchParams({ url });
  if (type) params.set('type', type);
  if (quality) params.set('quality', quality);
  return `${base}?${params.toString()}`;
}

async function fetchYoutubeData(url, type = null, quality = null) {
  const sources = [
    () => axios.get(buildApiUrl(NEW_API_BASE, url, type, quality), { timeout: DOWNLOAD_TIMEOUT_MS }),
    () => axios.get(buildApiUrl(OLD_API_BASE, url, type, quality), { timeout: DOWNLOAD_TIMEOUT_MS })
  ];

  let lastError = null;

  for (const source of sources) {
    try {
      const { data } = await source();
      if (!data || data.success !== true) {
        throw new Error(data?.error || 'API failed');
      }

      const payload = data.response || data.data || {};
      const downloadUrl = payload.download_url;

      if (!downloadUrl) {
        throw new Error('download_url not found');
      }

      return {
        title: payload.title || cleanTitle(url),
        thumbnail: payload.thumbnail || '',
        download_url: downloadUrl,
        type: payload.type === 'audio' || payload.type === 'mp3' ? 'audio' : 'mp4',
        requested_quality: payload.requested_quality || quality || 'auto',
        file_size_bytes: payload.file_size_bytes || null,
        source_used: data.response ? 'new' : 'old',
        is_fallback: data.response ? false : true
      };
    } catch (err) {
      lastError = err;
      console.log('[PLAY] API source failed:', err.message);
    }
  }

  throw lastError || new Error('All API sources failed');
}

async function downloadFile(fileUrl, outputPath) {
  const response = await axios.get(fileUrl, {
    responseType: 'stream',
    timeout: 120000,
    maxRedirects: 5,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });

  await pipeline(response.data, createWriteStream(outputPath));
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';

    ff.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    ff.on('error', reject);
    ff.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg exited with code ${code}\n${stderr}`));
    });
  });
}

async function convertAudioToMp3(inputPath, outputPath) {
  try {
    await runFfmpeg(['-y', '-i', inputPath, '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', outputPath]);
    return outputPath;
  } catch (err) {
    console.error('[PLAY] MP3 conversion failed:', err.message);
    await runFfmpeg(['-y', '-i', inputPath, '-vn', '-c:a', 'aac', '-b:a', '128k', outputPath]);
    return outputPath;
  }
}

async function prepareFileFromDownload(payload) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ytplay-'));
  const randomId = crypto.randomBytes(6).toString('hex');
  const sourcePath = path.join(tmpDir, `source-${randomId}.bin`);
  const audioPath = path.join(tmpDir, `audio-${randomId}.mp3`);

  await downloadFile(payload.download_url, sourcePath);

  if (payload.type === 'audio') {
    const finalPath = await convertAudioToMp3(sourcePath, audioPath);
    return { filePath: finalPath, tmpDir, mimetype: 'audio/mpeg' };
  }

  return { filePath: sourcePath, tmpDir, mimetype: 'video/mp4' };
}

async function getYoutubeAudio(inputUrl) {
  const parsedUrl = addProtocol(inputUrl);
  const result = await fetchYoutubeData(parsedUrl);

  if (!result || !result.download_url) {
    throw new Error('The API did not return a valid download URL.');
  }

  const prepared = await prepareFileFromDownload(result);
  const buffer = await fs.readFile(prepared.filePath);

  await fs.rm(prepared.tmpDir, { recursive: true, force: true }).catch(() => {});

  return {
    buffer,
    title: cleanTitle(result.title),
    source: result.source_used || 'engez API',
    quality: result.requested_quality || 'auto',
    mimeType: prepared.mimetype,
    filesize: buffer.length
  };
}

async function playCommand(sock, chatId, message) {
  try {
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || message.message?.imageMessage?.caption || '';
    const query = text.replace(/^\S+\s*/, '').trim();

    if (!query) {
      return sock.sendMessage(chatId, {
        text: '🎵 *YouTube Downloader*\n\nUsage: `.play <youtube link>`\nExample: `.play https://youtu.be/xxxxx`'
      });
    }

    if (!isYouTubeUrl(query)) {
      return sock.sendMessage(chatId, {
        text: '❌ Please send a valid YouTube link.'
      });
    }

    await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

    const result = await getYoutubeAudio(query);

    await sock.sendMessage(chatId, {
      audio: result.buffer,
      mimetype: result.mimeType,
      ptt: false,
      fileName: `${result.title}.mp3`
    });

    await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
  } catch (err) {
    console.error('[PLAY] Fatal error:', err);
    try {
      await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
      await sock.sendMessage(chatId, {
        text: `❌ Download failed\n${err.message || 'Unknown error'}\n\nTry another YouTube link or try again later.`
      });
    } catch (e) {
      console.error('[PLAY] Error sending failure message:', e);
    }
  }
}

playCommand.command = ['play', 'yt', 'music', 'song', 'audio', 'mp3'];
playCommand.help = ['play <youtube link>'];
playCommand.tags = ['downloader'];
playCommand.aliases = ['music', 'song', 'audio', 'mp3'];
playCommand.category = 'downloader';
playCommand.description = 'Download audio from YouTube with the custom API';
playCommand.usage = '.play <youtube link>';

module.exports = playCommand;
module.exports.default = playCommand;
module.exports.handler = playCommand;
module.exports.name = 'play';
module.exports.aliases = ['music', 'song', 'audio', 'mp3'];
module.exports.category = 'downloader';
module.exports.description = 'Download audio from YouTube with the custom API';
module.exports.usage = '.play <youtube link>';
module.exports.getYoutubeAudio = getYoutubeAudio;
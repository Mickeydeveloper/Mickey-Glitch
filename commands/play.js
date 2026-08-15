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
const YT_SEARCH_LIMIT = 5;

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

// Search YouTube for videos
async function searchYouTube(query) {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });

    // Extract video IDs from HTML
    const videoIds = [];
    const regex = /"videoId":"([^"]+)"/g;
    let match;
    while ((match = regex.exec(response.data)) !== null) {
      if (!videoIds.includes(match[1])) {
        videoIds.push(match[1]);
      }
      if (videoIds.length >= YT_SEARCH_LIMIT) break;
    }

    if (videoIds.length === 0) {
      // Alternative regex pattern
      const altRegex = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
      while ((match = altRegex.exec(response.data)) !== null) {
        if (!videoIds.includes(match[1])) {
          videoIds.push(match[1]);
        }
        if (videoIds.length >= YT_SEARCH_LIMIT) break;
      }
    }

    // Extract titles
    const titles = [];
    const titleRegex = /"title":{"runs":\[{"text":"([^"]+)"}\]}/g;
    while ((match = titleRegex.exec(response.data)) !== null) {
      titles.push(match[1]);
      if (titles.length >= videoIds.length) break;
    }

    // Combine IDs and titles
    const results = videoIds.map((id, index) => ({
      id,
      title: titles[index] || `Video ${index + 1}`,
      url: `https://youtube.com/watch?v=${id}`
    }));

    return results;
  } catch (error) {
    console.error('[SEARCH] Error searching YouTube:', error.message);
    return [];
  }
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

async function convertAudioToMp3(inputPath, outputPath, bitrate = '192k') {
  try {
    await runFfmpeg(['-y', '-i', inputPath, '-vn', '-c:a', 'libmp3lame', '-b:a', bitrate, outputPath]);
    return outputPath;
  } catch (err) {
    console.error('[PLAY] MP3 conversion failed:', err.message);
    await runFfmpeg(['-y', '-i', inputPath, '-vn', '-c:a', 'aac', '-b:a', '128k', outputPath]);
    return outputPath;
  }
}

async function prepareFileFromDownload(payload, quality = '192k') {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ytplay-'));
  const randomId = crypto.randomBytes(6).toString('hex');
  const sourcePath = path.join(tmpDir, `source-${randomId}.bin`);
  const audioPath = path.join(tmpDir, `audio-${randomId}.mp3`);

  await downloadFile(payload.download_url, sourcePath);

  if (payload.type === 'audio') {
    const finalPath = await convertAudioToMp3(sourcePath, audioPath, quality);
    return { filePath: finalPath, tmpDir, mimetype: 'audio/mpeg' };
  }

  return { filePath: sourcePath, tmpDir, mimetype: 'video/mp4' };
}

async function getYoutubeAudio(inputUrl, quality = '192k') {
  const parsedUrl = addProtocol(inputUrl);
  const result = await fetchYoutubeData(parsedUrl);

  if (!result || !result.download_url) {
    throw new Error('The API did not return a valid download URL.');
  }

  const prepared = await prepareFileFromDownload(result, quality);
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
    const text = message.message?.conversation || 
                  message.message?.extendedTextMessage?.text || 
                  message.message?.imageMessage?.caption || '';
    
    let query = text.replace(/^\S+\s*/, '').trim();
    
    // Check for quality option
    let quality = '192k';
    const qualityMatch = query.match(/--quality\s+(64k|128k|192k|256k|320k)/i);
    if (qualityMatch) {
      quality = qualityMatch[1];
      query = query.replace(qualityMatch[0], '').trim();
    }

    if (!query) {
      return sock.sendMessage(chatId, {
        text: '🎵 *YouTube Audio Downloader*\n\n' +
              '🔹 *Usage:* `.play <link or search term>`\n' +
              '🔹 *Examples:*\n' +
              '  • `.play https://youtu.be/xxxxx`\n' +
              '  • `.play shape of you ed sheeran`\n' +
              '  • `.play love story --quality 320k`\n\n' +
              '💡 *Quality Options:* 64k, 128k, 192k, 256k, 320k\n' +
              '⚡ *Default:* 192k'
      });
    }

    // Send initial reaction
    await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

    let videoUrl = query;
    let searchResults = [];

    // Check if it's a YouTube URL
    if (!isYouTubeUrl(query)) {
      // Search YouTube
      await sock.sendMessage(chatId, { 
        react: { text: '🔍', key: message.key } 
      });

      searchResults = await searchYouTube(query);

      if (searchResults.length === 0) {
        return sock.sendMessage(chatId, {
          text: '❌ *No results found*\n\n' +
                'Try a different search term or use a direct YouTube link.'
        });
      }

      // Send search results
      let resultText = '🎵 *Search Results:*\n\n';
      searchResults.forEach((result, index) => {
        resultText += `${index + 1}. ${result.title.substring(0, 50)}${result.title.length > 50 ? '...' : ''}\n`;
        resultText += `   🔗 ${result.url}\n\n`;
      });
      resultText += '💡 *Select a number or use the URL directly*';

      await sock.sendMessage(chatId, { text: resultText });

      // For now, use the first result
      videoUrl = searchResults[0].url;
    }

    await sock.sendMessage(chatId, { 
      react: { text: '📥', key: message.key } 
    });

    // Check if it's a search result selection
    if (searchResults.length > 0 && /^\d+$/.test(query) && parseInt(query) <= searchResults.length) {
      const index = parseInt(query) - 1;
      videoUrl = searchResults[index].url;
    }

    // Download audio
    const result = await getYoutubeAudio(videoUrl, quality);

    await sock.sendMessage(chatId, { 
      react: { text: '📤', key: message.key } 
    });

    // Send audio with metadata
    await sock.sendMessage(chatId, {
      audio: result.buffer,
      mimetype: result.mimeType,
      ptt: false,
      fileName: `${result.title}.mp3`,
      contextInfo: {
        externalAdReply: {
          title: result.title,
          body: `Quality: ${quality}`,
          thumbnail: result.buffer.slice(0, 1000), // First 1KB as thumbnail
          mediaType: 2,
          mediaUrl: videoUrl,
          sourceUrl: videoUrl
        }
      }
    });

    await sock.sendMessage(chatId, { 
      react: { text: '✅', key: message.key } 
    });

    // Send completion message
    await sock.sendMessage(chatId, {
      text: `✅ *Download Complete*\n\n` +
            `🎵 *Title:* ${result.title}\n` +
            `🎚️ *Quality:* ${quality}\n` +
            `📦 *Size:* ${(result.filesize / 1024 / 1024).toFixed(2)} MB\n` +
            `🔗 *Source:* ${result.source}`
    });

  } catch (err) {
    console.error('[PLAY] Fatal error:', err);
    try {
      await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
      await sock.sendMessage(chatId, {
        text: `❌ *Download Failed*\n\n` +
              `Error: ${err.message || 'Unknown error'}\n\n` +
              `💡 Try:\n` +
              `• Using a direct YouTube link\n` +
              `• Checking your internet connection\n` +
              `• Trying again later`
      });
    } catch (e) {
      console.error('[PLAY] Error sending failure message:', e);
    }
  }
}

// Command configuration
playCommand.command = ['play', 'yt', 'music', 'song', 'audio', 'mp3'];
playCommand.help = ['play <youtube link or search term>'];
playCommand.tags = ['downloader'];
playCommand.aliases = ['music', 'song', 'audio', 'mp3'];
playCommand.category = 'downloader';
playCommand.description = 'Download audio from YouTube with search support';
playCommand.usage = '.play <link or search term> [--quality 192k]';

module.exports = playCommand;
module.exports.default = playCommand;
module.exports.handler = playCommand;
module.exports.name = 'play';
module.exports.aliases = ['music', 'song', 'audio', 'mp3'];
module.exports.category = 'downloader';
module.exports.description = 'Download audio from YouTube with search support';
module.exports.usage = '.play <link or search term> [--quality 192k]';
module.exports.getYoutubeAudio = getYoutubeAudio;
module.exports.searchYouTube = searchYouTube;
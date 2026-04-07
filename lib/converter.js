
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const ffmpeg = require('fluent-ffmpeg')

function ffmpegSpawn(buffer, args = [], ext = '', ext2 = '') {
  return new Promise(async (resolve, reject) => {
    try {
      const tempDir = path.join(__dirname, '../temp')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }
      let tmp = path.join(tempDir, Date.now() + '.' + ext)
      let out = tmp + '.' + ext2
      await fs.promises.writeFile(tmp, buffer)
      spawn('ffmpeg', [
        '-y',
        '-i', tmp,
        ...args,
        out
      ])
        .on('error', reject)
        .on('close', async (code) => {
          try {
            await fs.promises.unlink(tmp)
            if (code !== 0) return reject(code)
            resolve(await fs.promises.readFile(out))
            await fs.promises.unlink(out)
          } catch (e) {
            reject(e)
          }
        })
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * Convert Audio to Playable WhatsApp Audio
 * @param {Buffer} buffer Audio Buffer
 * @param {String} ext File Extension 
 */
function toAudio(buffer, ext) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    ffmpeg()
      .input(buffer)
      .inputFormat(ext)
      .audioCodec('libmp3lame')
      .audioBitrate(128)
      .audioFrequency(44100)
      .audioChannels(2)
      .toFormat('mp3')
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .pipe()
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', () => {
        resolve(Buffer.concat(chunks));
      });
  });
}

/**
 * Convert Audio to Playable WhatsApp PTT
 * @param {Buffer} buffer Audio Buffer
 * @param {String} ext File Extension 
 */
function toPTT(buffer, ext) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    ffmpeg()
      .input(buffer)
      .inputFormat(ext)
      .audioCodec('libopus')
      .audioBitrate(128)
      .toFormat('opus')
      .on('error', reject)
      .pipe()
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', () => {
        resolve(Buffer.concat(chunks));
      });
  });
}

/**
 * Convert Audio to Playable WhatsApp Video
 * @param {Buffer} buffer Video Buffer
 * @param {String} ext File Extension 
 */
function toVideo(buffer, ext) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    ffmpeg()
      .input(buffer)
      .inputFormat(ext)
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioBitrate(128)
      .audioFrequency(44100)
      .videoBitrate(1000)
      .toFormat('mp4')
      .on('error', reject)
      .pipe()
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', () => {
        resolve(Buffer.concat(chunks));
      });
  });
}

module.exports = {
  toAudio,
  toPTT,
  toVideo,
  ffmpeg,
}
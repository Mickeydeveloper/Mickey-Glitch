
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

function ffmpeg(buffer, args = [], ext = '', ext2 = '') {
  return new Promise(async (resolve, reject) => {
    try {
      const tempDir = path.join(__dirname, '../temp')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }
      let tmp = path.join(tempDir, Date.now() + '.' + ext)
      let out = tmp + '.' + ext2
      await fs.promises.writeFile(tmp, buffer)
      
      const ffmpegProcess = spawn('ffmpeg', [
        '-y',
        '-i', tmp,
        ...args,
        out
      ])
      
      let errorOutput = ''
      ffmpegProcess.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })
      
      ffmpegProcess.on('error', async (err) => {
        console.error('FFmpeg spawn error:', err)
        try { await fs.promises.unlink(tmp) } catch (e) {}
        reject(err)
      })
      
      ffmpegProcess.on('close', async (code) => {
        try {
          if (fs.existsSync(tmp)) await fs.promises.unlink(tmp)
          if (code !== 0) {
            console.error('FFmpeg error output:', errorOutput)
            return reject(new Error(`FFmpeg failed with code ${code}`))
          }
          const result = await fs.promises.readFile(out)
          if (fs.existsSync(out)) await fs.promises.unlink(out)
          resolve(result)
        } catch (e) {
          console.error('File cleanup error:', e)
          reject(e)
        }
      })
    } catch (e) {
      console.error('Audio conversion error:', e)
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
  return ffmpeg(buffer, [
    '-vn',
    '-ac', '2',
    '-b:a', '128k',
    '-ar', '44100',
    '-f', 'mp3'
  ], ext || 'webm', 'mp3')
}

/**
 * Convert Audio to Playable WhatsApp PTT
 * @param {Buffer} buffer Audio Buffer
 * @param {String} ext File Extension 
 */
function toPTT(buffer, ext) {
  return ffmpeg(buffer, [
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-vbr', 'on',
    '-compression_level', '10'
  ], ext || 'webm', 'opus')
}

/**
 * Convert Audio to Playable WhatsApp Video
 * @param {Buffer} buffer Video Buffer
 * @param {String} ext File Extension 
 */
function toVideo(buffer, ext) {
  return ffmpeg(buffer, [
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-ab', '128k',
    '-ar', '44100',
    '-crf', '32',
    '-preset', 'slow'
  ], ext || 'webm', 'mp4')
}

module.exports = {
  toAudio,
  toPTT,
  toVideo,
  ffmpeg,
}
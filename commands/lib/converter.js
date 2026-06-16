const { createFFmpeg, fetchFile } = require('@ffmpeg/ffmpeg');
const fs = require('fs');
const path = require('path');

let ffmpeg = null;

async function getFFmpeg() {
    if (!ffmpeg) {
        ffmpeg = createFFmpeg({ log: true });
        console.log('[FFMPEG] Loading FFmpeg.wasm...');
        await ffmpeg.load();
        console.log('[FFMPEG] FFmpeg.wasm loaded successfully!');
    }
    return ffmpeg;
}

/**
 * Convert Video/Audio Buffer using FFmpeg.wasm
 * @param {Buffer} buffer Input buffer
 * @param {Array} args FFmpeg arguments
 * @param {String} inputExt Input file extension
 * @param {String} outputExt Output file extension
 */
async function ffmpegWasm(buffer, args = [], inputExt = 'mp4', outputExt = 'mp3') {
    try {
        const ff = await getFFmpeg();
        const inputFile = `input.${inputExt}`;
        const outputFile = `output.${outputExt}`;
        
        // Write input buffer to FFmpeg virtual filesystem
        ff.FS('writeFile', inputFile, buffer);
        
        // Run FFmpeg command
        const cmd = ['-i', inputFile, ...args, outputFile];
        console.log('[FFMPEG] Running command:', cmd.join(' '));
        
        await ff.run(...cmd);
        
        // Read output file
        const outputData = ff.FS('readFile', outputFile);
        
        // Cleanup
        ff.FS('unlink', inputFile);
        ff.FS('unlink', outputFile);
        
        return Buffer.from(outputData);
    } catch (error) {
        console.error('[FFMPEG] Error:', error);
        throw error;
    }
}

/**
 * Convert Video/Audio to Playable WhatsApp Audio (MP3)
 * @param {Buffer} buffer Input buffer
 * @param {String} ext File extension (mp4, webm, mkv, etc)
 */
async function toAudio(buffer, ext = 'mp4') {
    return ffmpegWasm(buffer, [
        '-vn',           // No video
        '-ac', '2',      // 2 audio channels
        '-b:a', '128k',  // Bitrate 128kbps
        '-ar', '44100',  // Sample rate 44.1kHz
        '-f', 'mp3'      // Output format MP3
    ], ext, 'mp3');
}

/**
 * Convert Video/Audio to WhatsApp PTT (Opus)
 * @param {Buffer} buffer Input buffer
 * @param {String} ext File extension
 */
async function toPTT(buffer, ext = 'mp4') {
    return ffmpegWasm(buffer, [
        '-vn',
        '-c:a', 'libopus',
        '-b:a', '128k',
        '-vbr', 'on',
        '-compression_level', '10'
    ], ext, 'opus');
}

/**
 * Convert Video for WhatsApp (MP4)
 * @param {Buffer} buffer Input buffer
 * @param {String} ext File extension
 */
async function toVideo(buffer, ext = 'mp4') {
    return ffmpegWasm(buffer, [
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-ab', '128k',
        '-ar', '44100',
        '-crf', '32',
        '-preset', 'slow'
    ], ext, 'mp4');
}

module.exports = {
    toAudio,
    toPTT,
    toVideo,
    ffmpegWasm,
    getFFmpeg
};
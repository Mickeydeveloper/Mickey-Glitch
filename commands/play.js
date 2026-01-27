const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { toAudio } = require('../lib/converter');

const AXIOS_DEFAULTS = {
	timeout: 60000,
	headers: {
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		'Accept': 'application/json, text/plain, */*'
	}
};

/**
 * Retry request with exponential backoff
 * @param {Function} getter - Function that returns a promise
 * @param {Number} attempts - Number of retry attempts
 * @returns {Promise}
 */
async function tryRequest(getter, attempts = 3) {
	let lastError;
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			return await getter();
		} catch (err) {
			lastError = err;
			if (attempt < attempts) {
				await new Promise(r => setTimeout(r, 1000 * attempt));
			}
		}
	}
	throw lastError;
}

/**
 * Convert query or link to YouTube URL using yt-search
 * @param {String} query - Song name or YouTube URL
 * @returns {Promise<Object>} Video object with url, title, thumbnail, timestamp
 */
async function convertQueryToYoutubeLink(query) {
	try {
		// If already a YouTube link, validate and return
		if (query.includes('youtube.com') || query.includes('youtu.be')) {
			return { url: query };
		}

		// Search for the query
		console.log('[Play] Searching for:', query);
		const search = await yts(query);
		
		if (!search || !search.videos || search.videos.length === 0) {
			throw new Error('No YouTube videos found for: ' + query);
		}

		const video = search.videos[0];
		console.log('[Play] Found:', video.title, 'URL:', video.url);
		
		return {
			url: video.url,
			title: video.title,
			thumbnail: video.thumbnail,
			timestamp: video.timestamp,
			author: video.author?.name || 'Unknown'
		};
	} catch (err) {
		console.error('[Play] Query to link conversion failed:', err?.message);
		throw new Error('Failed to find YouTube video: ' + err?.message);
	}
}

/**
 * Get download link from Yupra API
 * @param {String} youtubeUrl - YouTube URL
 * @returns {Promise<Object>} Download data with url, title, thumbnail
 */
async function getYupraDownloadByUrl(youtubeUrl) {
	try {
		const apiUrl = `https://api.srihub.store/download/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
		console.log('[Play] Calling Yupra API...');
		const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
		
		if (res?.data?.success && res?.data?.data?.download_url) {
			return {
				download: res.data.data.download_url,
				title: res.data.data.title,
				thumbnail: res.data.data.thumbnail
			};
		}
		throw new Error('Yupra returned no download URL');
	} catch (err) {
		console.error('[Play] Yupra API error:', err?.message);
		throw err;
	}
}

/**
 * Get download link from Okatsu API (fallback)
 * @param {String} youtubeUrl - YouTube URL
 * @returns {Promise<Object>} Download data with url, title, thumbnail
 */
async function getOkatsuDownloadByUrl(youtubeUrl) {
	try {
		const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
		console.log('[Play] Calling Okatsu API...');
		const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
		
		if (res?.data?.dl) {
			return {
				download: res.data.dl,
				title: res.data.title,
				thumbnail: res.data.thumb
			};
		}
		throw new Error('Okatsu returned no download URL');
	} catch (err) {
		console.error('[Play] Okatsu API error:', err?.message);
		throw err;
	}
}

/**
 * Get audio download from either API with fallback
 * @param {String} youtubeUrl - YouTube URL
 * @returns {Promise<Object>} Audio data with download URL, title, thumbnail
 */
async function getAudioDownloadLink(youtubeUrl) {
	let yupraError, okatsuError;
	
	// Try Yupra first
	try {
		return await getYupraDownloadByUrl(youtubeUrl);
	} catch (err) {
		yupraError = err?.message;
		console.log('[Play] Yupra failed, trying Okatsu...');
	}

	// Try Okatsu fallback
	try {
		return await getOkatsuDownloadByUrl(youtubeUrl);
	} catch (err) {
		okatsuError = err?.message;
	}

	throw new Error(`All download APIs failed - Yupra: ${yupraError}, Okatsu: ${okatsuError}`);
}

/**
 * Download audio file to buffer using arraybuffer or stream
 * @param {String} audioUrl - Direct audio download URL
 * @returns {Promise<Buffer>} Audio buffer
 */
async function downloadAudioBuffer(audioUrl) {
	try {
		console.log('[Play] Downloading audio (arraybuffer mode)...');
		const audioResponse = await axios.get(audioUrl, {
			responseType: 'arraybuffer',
			timeout: 90000,
			maxContentLength: Infinity,
			maxBodyLength: Infinity,
			decompress: true,
			validateStatus: s => s >= 200 && s < 400,
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Accept': '*/*',
				'Accept-Encoding': 'identity'
			}
		});
		const buffer = Buffer.from(audioResponse.data);
		console.log('[Play] Downloaded:', buffer.length, 'bytes');
		return buffer;
	} catch (e1) {
		console.log('[Play] Arraybuffer failed:', e1?.message, 'Trying stream mode...');
		try {
			const audioResponse = await axios.get(audioUrl, {
				responseType: 'stream',
				timeout: 90000,
				maxContentLength: Infinity,
				maxBodyLength: Infinity,
				validateStatus: s => s >= 200 && s < 400,
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					'Accept': '*/*',
					'Accept-Encoding': 'identity'
				}
			});
			const chunks = [];
			let receivedBytes = 0;
			await new Promise((resolve, reject) => {
				audioResponse.data.on('data', c => {
					chunks.push(c);
					receivedBytes += c.length;
				});
				audioResponse.data.on('end', resolve);
				audioResponse.data.on('error', reject);
			});
			const buffer = Buffer.concat(chunks);
			console.log('[Play] Stream downloaded:', receivedBytes, 'bytes');
			return buffer;
		} catch (e2) {
			throw new Error(`Failed to download audio - Arraybuffer: ${e1?.message}, Stream: ${e2?.message}`);
		}
	}
}

/**
 * Detect audio format from file signature
 * @param {Buffer} buffer - Audio file buffer
 * @returns {Object} Format info with mimetype, extension, and format name
 */
function detectAudioFormat(buffer) {
	const firstBytes = buffer.slice(0, 12);
	const hexSignature = firstBytes.toString('hex');
	const asciiSignature = firstBytes.toString('ascii', 4, 8);

	let actualMimetype = 'audio/mpeg';
	let fileExtension = 'mp3';
	let detectedFormat = 'unknown';

	// Check for MP4/M4A (ftyp box)
	if (asciiSignature === 'ftyp' || hexSignature.startsWith('000000')) {
		const ftypBox = buffer.slice(4, 8).toString('ascii');
		if (ftypBox === 'ftyp') {
			detectedFormat = 'M4A/MP4';
			actualMimetype = 'audio/mp4';
			fileExtension = 'm4a';
		}
	}
	// Check for MP3 (ID3 tag or MPEG frame sync)
	else if (buffer.toString('ascii', 0, 3) === 'ID3' || 
	         (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0)) {
		detectedFormat = 'MP3';
		actualMimetype = 'audio/mpeg';
		fileExtension = 'mp3';
	}
	// Check for OGG/Opus
	else if (buffer.toString('ascii', 0, 4) === 'OggS') {
		detectedFormat = 'OGG/Opus';
		actualMimetype = 'audio/ogg; codecs=opus';
		fileExtension = 'ogg';
	}
	// Check for WAV
	else if (buffer.toString('ascii', 0, 4) === 'RIFF') {
		detectedFormat = 'WAV';
		actualMimetype = 'audio/wav';
		fileExtension = 'wav';
	}
	else {
		actualMimetype = 'audio/mp4';
		fileExtension = 'm4a';
		detectedFormat = 'Unknown (defaulting to M4A)';
	}

	return { actualMimetype, fileExtension, detectedFormat };
}

/**
 * Convert audio to MP3 if needed
 * @param {Buffer} audioBuffer - Audio buffer
 * @param {String} fileExtension - Current file extension
 * @returns {Promise<Object>} Final buffer, mimetype, and extension
 */
async function convertToMP3IfNeeded(audioBuffer, fileExtension) {
	let finalBuffer = audioBuffer;
	let finalMimetype = 'audio/mpeg';
	let finalExtension = 'mp3';

	if (fileExtension !== 'mp3') {
		try {
			console.log('[Play] Converting', fileExtension, 'to MP3...');
			finalBuffer = await toAudio(audioBuffer, fileExtension);
			if (!finalBuffer || finalBuffer.length === 0) {
				throw new Error('Conversion returned empty buffer');
			}
			console.log('[Play] Conversion success:', finalBuffer.length, 'bytes');
		} catch (convErr) {
			throw new Error(`Failed to convert to MP3: ${convErr.message}`);
		}
	} else {
		console.log('[Play] Audio already MP3, no conversion needed');
	}

	return { finalBuffer, finalMimetype, finalExtension };
}

/**
 * Clean up temporary files from conversion
 */
async function cleanupTempFiles() {
	try {
		const tempDir = path.join(__dirname, '../temp');
		if (fs.existsSync(tempDir)) {
			const files = fs.readdirSync(tempDir);
			const now = Date.now();
			files.forEach(file => {
				const filePath = path.join(tempDir, file);
				try {
					const stats = fs.statSync(filePath);
					if (now - stats.mtimeMs > 10000) {
						if (file.endsWith('.mp3') || file.endsWith('.m4a') || /^\d+\.(mp3|m4a)$/.test(file)) {
							fs.unlinkSync(filePath);
						}
					}
				} catch (e) {
					// Ignore individual file errors
				}
			});
		}
	} catch (cleanupErr) {
		// Ignore cleanup errors
	}
}

/**
 * Send notification message to user
 */
async function sendNotification(sock, chatId, message, videoData) {
	await sock.sendMessage(chatId, {
		text: `🎵 Downloading: *${videoData.title}*\n⏱ Duration: ${videoData.timestamp || 'Unknown'}`,
		contextInfo: {
			externalAdReply: {
				title: videoData.title || 'Mickey Glitch Music',
				body: 'Downloading audio...',
				thumbnailUrl: videoData.thumbnail,
				sourceUrl: videoData.url,
				mediaType: 1,
				showAdAttribution: false,
				renderLargerThumbnail: true
			}
		}
	}, { quoted: message });
}

/**
 * Main play command function - Send download link only
 */
async function songCommand(sock, chatId, message) {
	try {
		// Extract text from message
		const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
		if (!text || !text.trim()) {
			await sock.sendMessage(chatId, { text: 'Usage: .song <song name or YouTube link>' }, { quoted: message });
			return;
		}

		console.log('[Play] Command received with query:', text);

		// Step 1: Convert query to YouTube link
		const videoData = await convertQueryToYoutubeLink(text.trim());
		console.log('[Play] Got YouTube link:', videoData.url);

		// Step 2: Get audio download link from API
		const audioData = await getAudioDownloadLink(videoData.url);
		const audioUrl = audioData?.download || audioData?.dl;
		if (!audioUrl) {
			throw new Error('No valid audio URL returned from downloader API');
		}
		console.log('[Play] Got download URL from API');

		// Step 3: Send download link to user
		const responseMsg = `🎵 *${audioData.title || videoData.title || 'Song'}*

📥 Download Link:
${audioUrl}

🔗 YouTube: ${videoData.url}`;

		console.log('[Play] Sending download link to user');
		await sock.sendMessage(chatId, { text: responseMsg }, { quoted: message });
		console.log('[Play] Download link sent successfully!');

	} catch (err) {
		console.error('[Play] ERROR:', err?.message || err);
		const errorMsg = err?.message || String(err);
		
		let userMsg = '❌ Failed to get song download link.';
		if (errorMsg.includes('YouTube') || errorMsg.includes('search')) {
			userMsg = '❌ Could not find the song. Try another search term.';
		} else if (errorMsg.includes('API') || errorMsg.includes('downloader')) {
			userMsg = '❌ Download service unavailable. Try again later.';
		}
		
		try {
			await sock.sendMessage(chatId, { text: userMsg }, { quoted: message });
		} catch (sendErr) {
			console.error('[Play] Failed to send error message:', sendErr?.message);
		}
	}
}

module.exports = songCommand;

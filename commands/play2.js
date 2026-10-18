const { randomUUID } = require('crypto');
const { getYoutubeAudio, searchYoutubeSong } = require('./play');

const MAX_EMBEDDED_AUDIO_BYTES = 8 * 1024 * 1024;
const FALLBACK_THUMBNAIL = 'https://i.imgur.com/4XfCwQ0.png';

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isYouTubeUrl(value) {
    return /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))/i.test(value);
}

function createPlayerHtml({ title, artist, thumbnail, audioBase64 }) {
    const safeTitle = escapeHtml(title);
    const safeArtist = escapeHtml(artist);
    const safeThumbnail = escapeHtml(thumbnail);

    return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{margin:0;padding:8px;background:transparent;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif}.player{width:100%;padding:16px;border:1px solid #343434;border-radius:18px;background:#101010;box-shadow:0 12px 30px #0009}.brand{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;color:#bcbcbc;font-size:11px;font-weight:700;letter-spacing:1.4px}.badge{padding:5px 8px;border:1px solid #444;border-radius:8px;color:#eee;font:700 9px monospace}.track{display:flex;align-items:center;gap:14px;min-width:0;padding:12px;border:1px solid #292929;border-radius:14px;background:#181818}.cover{flex:none;width:76px;height:76px;overflow:hidden;border-radius:12px;background:#252525}.cover img{width:100%;height:100%;object-fit:cover}.details{min-width:0;flex:1}.title{overflow:hidden;color:#fff;font-size:16px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.artist{margin-top:6px;color:#aaa;font:11px monospace}.progress{width:100%;height:5px;margin:18px 0 7px;accent-color:#f5f5f5}.times{display:flex;justify-content:space-between;color:#888;font:10px monospace}.controls{display:flex;align-items:center;gap:12px;margin-top:15px}.play{min-width:82px;height:42px;border:0;border-radius:12px;background:#f3f3f3;color:#111;font-size:12px;font-weight:800;letter-spacing:1px}.volume{flex:1;accent-color:#f5f5f5}.status{margin-top:13px;text-align:center;color:#aaa;font:700 9px monospace;letter-spacing:1.5px}.footer{margin-top:13px;padding-top:10px;border-top:1px solid #303030;text-align:center;color:#777;font:9px monospace;letter-spacing:.5px}
</style></head><body><main class="player"><div class="brand"><span>MICKEY GLITCH MUSIC</span><span class="badge">MP3</span></div><div class="track"><div class="cover"><img src="${safeThumbnail}" alt="Track thumbnail"></div><div class="details"><div class="title">${safeTitle}</div><div class="artist">${safeArtist}</div></div></div><input class="progress" id="progress" type="range" min="0" max="1000" value="0" aria-label="Track progress"><div class="times"><span id="current">0:00</span><span id="duration">--:--</span></div><div class="controls"><button class="play" id="play">PLAY</button><span>VOL</span><input class="volume" id="volume" type="range" min="0" max="1" step=".01" value=".8" aria-label="Volume"></div><div class="status" id="status">READY TO PLAY</div><div class="footer">TAP PLAY TO START</div><audio id="audio" preload="metadata" src="data:audio/mpeg;base64,${audioBase64}"></audio></main><script>
(()=>{const a=document.getElementById('audio'),p=document.getElementById('play'),r=document.getElementById('progress'),v=document.getElementById('volume'),c=document.getElementById('current'),d=document.getElementById('duration'),s=document.getElementById('status');const fmt=n=>Number.isFinite(n)?Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0'):'0:00';const update=()=>{if(!Number.isFinite(a.duration)||a.duration<=0)return;r.value=String(Math.round(a.currentTime/a.duration*1000));c.textContent=fmt(a.currentTime)};p.addEventListener('click',async()=>{try{if(a.paused){await a.play()}else{a.pause()}}catch(e){s.textContent='PLAYBACK ERROR'}});v.addEventListener('input',()=>{a.volume=Number(v.value)});r.addEventListener('input',()=>{if(Number.isFinite(a.duration)&&a.duration>0)a.currentTime=Number(r.value)/1000*a.duration});a.addEventListener('loadedmetadata',()=>{d.textContent=fmt(a.duration)});a.addEventListener('timeupdate',update);a.addEventListener('play',()=>{p.textContent='PAUSE';s.textContent='NOW PLAYING'});a.addEventListener('pause',()=>{p.textContent='PLAY';s.textContent='PAUSED'});a.addEventListener('ended',()=>{p.textContent='PLAY';s.textContent='PLAYBACK COMPLETE';r.value='0';c.textContent='0:00'})})();
</script></body></html>`;
}

async function sendMusicPlayer(sock, chatId, message, audioData, artist) {
    if (audioData.buffer.length > MAX_EMBEDDED_AUDIO_BYTES) {
        await sock.sendMessage(chatId, {
            audio: audioData.buffer,
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: `${audioData.title || 'audio'}.mp3`,
            caption: 'Audio ni kubwa kwa player iliyojumuishwa; nimetuma MP3 moja kwa moja.'
        }, { quoted: message });
        return;
    }

    const responseId = randomUUID();
    const thumbnail = /^https?:\/\//i.test(audioData.thumbnail || '') ? audioData.thumbnail : FALLBACK_THUMBNAIL;
    const html = createPlayerHtml({
        title: audioData.title || 'Unknown Song',
        artist: artist || 'YouTube',
        thumbnail,
        audioBase64: audioData.buffer.toString('base64')
    });
    const responseData = {
        response_id: responseId,
        sections: [{
            view_model: {
                primitive: {
                    __typename: 'GenAIaeacdsnwHtmlPrimitive',
                    payload: html,
                    trusted_sources: []
                },
                __typename: 'GenAISingleLayoutViewModel'
            }
        }]
    };

    await sock.relayMessage(chatId, {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {
                messageDisclaimerText: '',
                botResponseId: responseId
            }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [{ messageType: 2, messageText: 'Mickey Glitch Music Player' }],
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify(responseData)).toString('base64')
                    },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
                        forwardOrigin: 4
                    }
                }
            }
        }
    }, { messageId: responseId });
}

module.exports = async function play2Command(sock, chatId, message) {
    const rawText = message?.message?.conversation || message?.message?.extendedTextMessage?.text || '';
    const query = rawText.trim().split(/\s+/).slice(1).join(' ').trim();

    if (!query) {
        await sock.sendMessage(chatId, {
            text: '🎵 Tumia: .play2 <jina la wimbo au YouTube URL>'
        }, { quoted: message });
        return;
    }

    try {
        if (message?.key) {
            try {
                await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });
            } catch {}
        }

        const song = isYouTubeUrl(query) ? null : await searchYoutubeSong(query);
        const audioData = await getYoutubeAudio(song?.url || query);
        await sendMusicPlayer(sock, chatId, message, audioData, song?.author);

        if (message?.key) {
            try {
                await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
            } catch {}
        }
    } catch (error) {
        console.error('[PLAY2] Error:', error?.message || error);
        if (message?.key) {
            try {
                await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            } catch {}
        }
        await sock.sendMessage(chatId, {
            text: '❌ Imeshindikana kuandaa music player. Jaribu jina au YouTube URL nyingine.'
        }, { quoted: message });
    }
};

module.exports.name = 'play2';
module.exports.description = 'Play a song in an embedded rich music player';
module.exports.category = 'MEDIA';
module.exports.aliases = [];

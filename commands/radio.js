const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const { createCtx } = require('../lib/messageBuilder');

async function resolveAudioSource() {
  const candidates = [
    path.join(process.cwd(), 'lib', 'menu.mp3'),
    path.join(process.cwd(), 'lib', 'ushauri.mp3'),
    path.join(process.cwd(), 'glitch', 'ushauri.mp3'),
    path.join(process.cwd(), 'src', 'audio', 'menu.mp3')
  ];

  for (const filePath of candidates) {
    try {
      const data = await fs.readFile(filePath);
      return `data:audio/mpeg;base64,${data.toString('base64')}`;
    } catch (err) {
      // continue to next candidate
    }
  }

  return 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/ushauri.mp3';
}

async function buildRadioPayload(jid, titleText = 'LevviCode Music Player') {
  const responseId = randomUUID();
  const audioSrc = await resolveAudioSource();

  const html = `
<style>
*{
  box-sizing:border-box;
  -webkit-tap-highlight-color:transparent;
  -webkit-user-select:none;
  user-select:none;
}
html,
body{
  margin:0;
  padding:0;
  width:100%;
  overflow:hidden;
  background:transparent;
  font-family:Arial,Helvetica,sans-serif;
}

.musicWrap{
  width:100%;
  padding:7px;
  border:1px solid rgba(255,255,255,.16);
  border-radius:22px;
  background:#050505;
  box-shadow:0 10px 28px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.07);
}
.musicFrame{
  position:relative;
  overflow:hidden;
  padding:16px;
  border:1px solid rgba(255,255,255,.16);
  border-radius:18px;
  background:linear-gradient(145deg,#111113 0%,#080809 45%,#050505 100%);
  box-shadow:0 0 25px rgba(255,255,255,.025), inset 0 1px 0 rgba(255,255,255,.07);
}
.musicGlow{
  position:absolute;
  width:170px;
  height:170px;
  right:-75px;
  top:-85px;
  border-radius:50%;
  background:rgba(255,255,255,.045);
  filter:blur(50px);
  pointer-events:none;
}
.musicHeader{
  position:relative;
  z-index:2;
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:14px;
}
.musicBrand{
  display:flex;
  align-items:center;
  gap:9px;
  color:#fff;
  font:bold 15px Arial,sans-serif;
  letter-spacing:1px;
  text-shadow:0 2px 5px rgba(0,0,0,.7);
}
.musicBrandIcon{
  width:30px;
  height:30px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:10px;
  background:#fff;
  color:#000;
  font:bold 13px Arial,sans-serif;
  box-shadow:0 4px 12px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.9);
}
.musicLive{
  padding:5px 9px;
  border:1px solid rgba(255,255,255,.22);
  border-radius:9px;
  background:#0d0d0f;
  color:#ddd;
  font:bold 8px monospace;
  letter-spacing:1.2px;
}
.musicMain{
  position:relative;
  z-index:2;
  display:flex;
  align-items:center;
  gap:15px;
  padding:14px;
  border:1px solid rgba(255,255,255,.09);
  border-radius:16px;
  background:linear-gradient(145deg,#151517,#0d0d0f);
  box-shadow:0 5px 14px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.045);
}
.musicCover{
  position:relative;
  flex:none;
  width:78px;
  height:78px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:18px;
  background:#070708;
  border:2px solid #eee;
  box-shadow:0 0 17px rgba(255,255,255,.10), inset 0 0 20px rgba(255,255,255,.035);
  overflow:hidden;
}
.musicVinyl{
  position:relative;
  width:61px;
  height:61px;
  border-radius:50%;
  background:repeating-radial-gradient(circle at center,#080808 0px,#101010 2px,#070707 4px,#141414 6px);
  border:1px solid #444;
  box-shadow:0 0 13px rgba(255,255,255,.10), inset 0 0 8px rgba(255,255,255,.08);
  transform:rotate(0deg);
}
.musicVinyl::before{
  content:'';
  position:absolute;
  inset:5px;
  border-radius:50%;
  background:repeating-radial-gradient(circle at center,transparent 0px,transparent 4px,rgba(255,255,255,.06) 5px,transparent 6px);
}
.musicVinyl::after{
  content:'';
  position:absolute;
  left:50%;
  top:50%;
  width:19px;
  height:19px;
  transform:translate(-50%,-50%);
  border-radius:50%;
  background:radial-gradient(circle,#fff 0 12%,#777 13% 28%,#202020 29% 65%,#aaa 66% 72%,#111 73% 100%);
  border:1px solid #ddd;
  box-shadow:0 0 8px rgba(255,255,255,.25);
}
.musicVinyl.playing{ animation:vinylRotate 2.4s linear infinite; }
@keyframes vinylRotate{ from{ transform:rotate(0deg); } to{ transform:rotate(360deg); } }
.musicDetails{ min-width:0; flex:1; }
.musicTitle{ color:#fff; font:bold 17px Arial,sans-serif; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.musicSubtitle{ margin-top:5px; color:#777; font:10px monospace; letter-spacing:.3px; }
.visualizer{ height:27px; display:flex; align-items:center; gap:3px; margin-top:9px; }
.visualizer span{ width:3px; height:4px; border-radius:4px; background:#ddd; opacity:.85; }
.visualizer.playing span{ animation:musicBars .75s ease-in-out infinite alternate; }
.visualizer span:nth-child(1){ animation-delay:-.70s; }
.visualizer span:nth-child(2){ animation-delay:-.50s; }
.visualizer span:nth-child(3){ animation-delay:-.20s; }
.visualizer span:nth-child(4){ animation-delay:-.60s; }
.visualizer span:nth-child(5){ animation-delay:-.30s; }
.visualizer span:nth-child(6){ animation-delay:-.80s; }
.visualizer span:nth-child(7){ animation-delay:-.40s; }
.visualizer span:nth-child(8){ animation-delay:-.10s; }
.visualizer span:nth-child(9){ animation-delay:-.55s; }
.visualizer span:nth-child(10){ animation-delay:-.25s; }
.visualizer span:nth-child(11){ animation-delay:-.65s; }
.visualizer span:nth-child(12){ animation-delay:-.35s; }
@keyframes musicBars{ 0%{ height:4px; } 50%{ height:13px; } 100%{ height:25px; } }
.musicProgressArea{ position:relative; z-index:2; margin-top:16px; }
.musicProgress{ position:relative; width:100%; height:7px; border-radius:8px; background:#222225; border:1px solid rgba(255,255,255,.09); overflow:visible; }
.musicProgressBar{ position:absolute; left:0; top:-1px; width:0%; height:7px; border-radius:8px; background:#eee; box-shadow:0 0 8px rgba(255,255,255,.25); }
.musicProgressDot{ position:absolute; left:0%; top:50%; width:14px; height:14px; transform:translate(-50%,-50%); border-radius:50%; background:#fff; border:2px solid #888; box-shadow:0 0 8px rgba(255,255,255,.25); }
.musicTime{ display:flex; align-items:center; justify-content:space-between; margin-top:8px; color:#777; font:9px monospace; }
.musicControls{ position:relative; z-index:2; display:flex; align-items:center; gap:13px; margin-top:15px; }
.musicButton{ width:91px; height:50px; display:flex; align-items:center; justify-content:center; border:1px solid #fff; border-radius:16px; background:#fff; color:#000; font:bold 11px Arial,sans-serif; letter-spacing:1.5px; box-shadow:0 5px 12px rgba(0,0,0,.45),0 0 12px rgba(255,255,255,.08); transition:transform .12s ease, background .12s ease; }
.musicButton:active{ transform:scale(.94); background:#d8d8d8; }
.musicVolumeBox{ flex:1; height:50px; display:flex; align-items:center; gap:10px; padding:0 13px; border:1px solid rgba(255,255,255,.09); border-radius:16px; background:#111113; box-shadow:inset 0 1px 0 rgba(255,255,255,.035); }
.musicVolumeLabel{ width:32px; color:#aaa; font:bold 8px monospace; letter-spacing:.8px; }
.musicVolume{ width:100%; height:4px; accent-color:#fff; }
.musicStatus{ position:relative; z-index:2; margin-top:13px; text-align:center; color:#ddd; font:bold 9px monospace; letter-spacing:1.8px; }
.musicLine{ position:relative; z-index:2; height:1px; margin-top:12px; background:linear-gradient(90deg,transparent,#555,transparent); opacity:.6; }
.musicFooter{ position:relative; z-index:2; display:flex; align-items:center; justify-content:center; margin-top:10px; color:#505055; font:8px monospace; letter-spacing:.5px; }
</style>
<div class="musicWrap">
  <div class="musicFrame">
    <div class="musicGlow"></div>
    <div class="musicHeader">
      <div class="musicBrand">
        <div class="musicBrandIcon">LC</div>
        LevviCode MUSIC
      </div>
      <div class="musicLive">MP3</div>
    </div>

    <div class="musicMain">
      <div class="musicCover">
        <div class="musicVinyl" id="musicVinyl"></div>
      </div>
      <div class="musicDetails">
        <div class="musicTitle">Menu Music</div>
        <div class="musicSubtitle">LEVVICODE • MP3</div>
        <div class="visualizer" id="visualizer">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>
    </div>

    <div class="musicProgressArea">
      <div class="musicProgress" id="musicProgress">
        <div class="musicProgressBar" id="musicProgressBar"></div>
        <div class="musicProgressDot" id="musicProgressDot"></div>
      </div>
      <div class="musicTime">
        <span id="musicCurrent">0:00</span>
        <span id="musicDuration">0:00</span>
      </div>
    </div>

    <div class="musicControls">
      <button class="musicButton" id="musicPlay">PLAY</button>
      <div class="musicVolumeBox">
        <div class="musicVolumeLabel">VOL</div>
        <input class="musicVolume" id="musicVolume" type="range" min="0" max="1" step=".01" value=".8">
      </div>
    </div>

    <div class="musicStatus" id="musicStatus">READY TO PLAY</div>
    <div class="musicLine"></div>
    <div class="musicFooter">TAP PLAY TO START • LEVVICODE PLAYER</div>
  </div>
</div>

<audio id="localMusic" preload="auto" src="${audioSrc}"></audio>
<script>
(function(){
  const audio = document.getElementById('localMusic');
  const play = document.getElementById('musicPlay');
  const volume = document.getElementById('musicVolume');
  const progress = document.getElementById('musicProgress');
  const progressBar = document.getElementById('musicProgressBar');
  const progressDot = document.getElementById('musicProgressDot');
  const current = document.getElementById('musicCurrent');
  const duration = document.getElementById('musicDuration');
  const status = document.getElementById('musicStatus');
  const visualizer = document.getElementById('visualizer');
  const vinyl = document.getElementById('musicVinyl');

  audio.volume = .8;

  function formatTime(sec){
    if(!Number.isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2,'0');
  }

  function updateProgress(){
    if(!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const percent = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = percent + '%';
    progressDot.style.left = percent + '%';
    current.textContent = formatTime(audio.currentTime);
  }

  function setPlaying(){
    play.textContent = 'PAUSE';
    status.textContent = 'NOW PLAYING';
    visualizer.classList.add('playing');
    vinyl.classList.add('playing');
  }

  function setPaused(){
    play.textContent = 'PLAY';
    status.textContent = 'PAUSED';
    visualizer.classList.remove('playing');
    vinyl.classList.remove('playing');
  }

  play.addEventListener('click', async function(){
    try {
      if(audio.paused){
        await audio.play();
        setPlaying();
      } else {
        audio.pause();
        setPaused();
      }
    } catch (error) {
      status.textContent = 'PLAY ERROR';
      visualizer.classList.remove('playing');
      vinyl.classList.remove('playing');
    }
  });

  volume.addEventListener('input', function(){
    audio.volume = Number(volume.value);
  });

  progress.addEventListener('pointerdown', function(e){
    if(!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const rect = progress.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    audio.currentTime = (x / rect.width) * audio.duration;
    updateProgress();
  });

  audio.addEventListener('loadedmetadata', function(){
    duration.textContent = formatTime(audio.duration);
  });

  audio.addEventListener('timeupdate', function(){
    updateProgress();
  });

  audio.addEventListener('play', function(){
    setPlaying();
  });

  audio.addEventListener('pause', function(){
    if(!audio.ended){
      setPaused();
    }
  });

  audio.addEventListener('ended', function(){
    play.textContent = 'PLAY';
    status.textContent = 'PLAYBACK COMPLETE';
    visualizer.classList.remove('playing');
    vinyl.classList.remove('playing');
    progressBar.style.width = '0%';
    progressDot.style.left = '0%';
    current.textContent = '0:00';
  });
})();
</script>`;

  const payload = {
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
          submessages: [{ messageType: 2, messageText: titleText }],
          unifiedResponse: {
            data: Buffer.from(JSON.stringify({
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
            })).toString('base64')
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: {
              botJid: '867051314767696@bot'
            },
            forwardOrigin: 4
          }
        }
      }
    }
  };

  return { jid, content: payload };
}

const radioCommand = async (sock, chatId, msg, args = []) => {
  const ctx = createCtx(sock, chatId, msg, { args });
  const target = ctx.chatId || chatId || msg?.key?.remoteJid;

  if (!sock || !target) {
    throw new Error('Chat context is required');
  }

  try {
    const payload = await buildRadioPayload(target, 'LevviCode Music Player');
    await sock.relayMessage(payload.jid, payload.content, {});
    return true;
  } catch (error) {
    console.error('[radio] relay failed:', error?.message || error);

    try {
      await sock.sendMessage(target, {
        text: '🎵 Radio player failed to load. Please retry.'
      }, { quoted: ctx.msg });
      return true;
    } catch (sendErr) {
      console.error('[radio] fallback failed:', sendErr?.message || sendErr);
      return false;
    }
  }
};

radioCommand.name = 'radio';
radioCommand.aliases = ['music', 'player', 'ushauri', 'audio'];
radioCommand.category = 'fun';
radioCommand.description = '🎧 Rich HTML radio/music player using local lib MP3 when available';

module.exports = radioCommand;

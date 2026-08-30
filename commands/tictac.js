const { createCtx } = require('../lib/messageBuilder');

// HTML ya Tic-Tac-Toe Game
const tictacHtml = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tic-Tac-Toe</title>
<style>
:root {
  --bg: transparent;
  --card: transparent;
  --card-2: #2a3942;
  --ink: #e9edef;
  --ink-soft: #aebac1;
  --muted: #8696a0;
  --accent: #00a884;
  --accent-2: #008069;
  --line: #2a3942;
  --line-strong: #374248;
  --cell-bg: #111b21;
  --o: #00a884;
  --x: #e9edef;
  --sys: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{
  background:transparent;
  color:var(--ink);
  font-family:var(--sys);
  min-height:100vh;
  overflow-x:hidden;
  -webkit-font-smoothing:antialiased;
}
.stage{
  min-height:100vh;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  padding:24px 16px;
}
.card{
  width:100%;
  max-width:360px;
}
.header{
  display:flex;
  align-items:baseline;
  justify-content:space-between;
  margin-bottom:14px;
  padding-bottom:12px;
  border-bottom:1px solid var(--line);
  gap:8px;
}
.header__title{
  font-size:17px;
  font-weight:600;
  color:var(--ink);
  letter-spacing:-.005em;
}
.header__sub{
  font-size:12px;
  color:var(--muted)
}
.status{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:14px;
  font-size:13px;
  gap:8px;
}
.status__turn{
  display:flex;
  align-items:center;
  gap:8px;
  color:var(--ink-soft)
}
.status__indicator{
  width:9px;
  height:9px;
  border-radius:50%;
  background:var(--x);
  position:relative;
  flex-shrink:0;
  transition:background .2s ease;
}
.status__indicator.is-o{background:var(--o)}
.status__indicator.is-thinking::after{
  content:'';
  position:absolute;
  inset:-3px;
  border-radius:50%;
  border:1.5px solid var(--o);
  animation:ring 1.1s ease-out infinite;
}
@keyframes ring{
  0%{transform:scale(.7);opacity:1}
  100%{transform:scale(2.2);opacity:0}
}
.status__score{
  display:flex;
  gap:12px;
  font-variant-numeric:tabular-nums;
  color:var(--muted);
  font-size:12px;
}
.status__score b{
  color:var(--ink);
  font-weight:600;
  margin-left:3px;
}
.board{
  width:100%;
  aspect-ratio:1;
  position:relative;
  display:grid;
  grid-template-columns:1fr 1fr 1fr;
  grid-template-rows:1fr 1fr 1fr;
  background:var(--cell-bg);
  border-radius:8px;
  overflow:hidden;
  border:1px solid var(--line);
}
.cell{
  position:relative;
  background:transparent;
  border:none;
  cursor:pointer;
  padding:0;
  font-family:inherit;
  color:inherit;
}
.cell:disabled{cursor:default}
.cell:focus-visible{outline:2px solid var(--accent);outline-offset:-3px}
.cell::before{
  content:'';
  position:absolute;
  right:0;
  top:6%;
  bottom:6%;
  width:1px;
  background:var(--line-strong);
}
.cell:nth-child(3n)::before{display:none}
.cell::after{
  content:'';
  position:absolute;
  bottom:0;
  left:6%;
  right:6%;
  height:1px;
  background:var(--line-strong);
}
.cell:nth-last-child(-n+3)::after{display:none}
.cell.is-winning{background:rgba(0,168,132,0.14)}
.cell.is-winning-x{background:rgba(233,237,239,0.07)}
.mark{
  position:absolute;
  inset:22%;
  pointer-events:none;
}
.mark__svg{
  width:100%;
  height:100%;
  overflow:visible;
}
.mark__svg path,.mark__svg circle{
  fill:none;
  stroke:var(--x);
  stroke-width:9;
  stroke-linecap:round;
}
.mark--o .mark__svg path,.mark--o .mark__svg circle{stroke:var(--o)}
.mark__svg path{
  stroke-dasharray:120;
  stroke-dashoffset:120;
  animation:draw .3s ease-out forwards;
}
.mark__svg path:nth-child(2){animation-delay:.12s}
.mark__svg circle{
  stroke-dasharray:220;
  stroke-dashoffset:220;
  animation:draw .4s ease-out forwards;
}
@keyframes draw{to{stroke-dashoffset:0}}
.winning-line{
  position:absolute;
  height:4px;
  background:var(--o);
  transform-origin:left center;
  z-index:5;
  pointer-events:none;
  border-radius:2px;
}
.winning-line.is-x{background:var(--x)}
.levels{margin-top:14px}
.levels__label{
  font-size:11px;
  color:var(--muted);
  margin-bottom:8px;
}
.levels__list{
  display:flex;
  flex-wrap:nowrap;
  gap:8px;
  overflow-x:auto;
  overflow-y:hidden;
  -webkit-overflow-scrolling:touch;
  scrollbar-width:none;
  -ms-overflow-style:none;
  padding:2px 2px 6px;
  margin:0 -2px;
}
.levels__list::-webkit-scrollbar{display:none}
.level{
  background:transparent;
  border:1px solid var(--line-strong);
  border-radius:20px;
  padding:10px 18px;
  font-size:13px;
  font-weight:500;
  color:var(--ink-soft);
  cursor:pointer;
  font-family:inherit;
  transition:color .15s ease,border-color .15s ease,background .15s ease;
  white-space:nowrap;
  flex-shrink:0;
}
.level:hover{color:var(--ink);border-color:var(--ink-soft)}
.level.is-active{
  background:var(--accent);
  border-color:var(--accent);
  color:#0b141a;
}
.level:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.footer{margin-top:12px;display:flex;justify-content:center}
.footer__reset{
  background:none;
  border:none;
  color:var(--accent);
  font-family:inherit;
  font-size:13px;
  font-weight:500;
  cursor:pointer;
  padding:8px 16px;
  transition:color .15s ease;
}
.footer__reset:hover{color:var(--ink)}
.footer__reset:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.modal{
  position:fixed;
  inset:0;
  z-index:50;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
  opacity:0;
  pointer-events:none;
  transition:opacity .3s ease;
}
.modal.is-open{opacity:1;pointer-events:auto}
.modal__backdrop{
  position:absolute;
  inset:0;
  background:transparent;
}
.modal__card{
  position:relative;
  background:var(--card-2);
  border-radius:12px;
  padding:24px 24px 0;
  text-align:center;
  max-width:320px;
  width:100%;
  box-shadow:0 24px 50px -12px rgba(0,0,0,0.6);
  transform:translateY(8px) scale(.96);
  transition:transform .35s cubic-bezier(.34,1.56,.64,1);
  overflow:hidden;
}
.modal.is-open .modal__card{transform:translateY(0) scale(1)}
.modal__title{
  font-size:20px;
  font-weight:700;
  letter-spacing:-.015em;
  color:var(--ink);
  margin-bottom:8px;
  line-height:1.25;
}
.modal__title.is-o{color:var(--o)}
.modal__sub{
  font-size:14px;
  color:var(--muted);
  margin-bottom:20px;
  line-height:1.4;
}
.modal__retry{
  background:transparent;
  border:none;
  color:var(--accent);
  font-family:inherit;
  font-size:16px;
  font-weight:600;
  letter-spacing:-.005em;
  cursor:pointer;
  padding:14px 24px;
  width:100%;
  border-top:1px solid var(--line-strong);
  transition:color .15s ease;
}
.modal__retry:hover{color:var(--ink)}
.modal__retry:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
@media (max-width:380px){
  .stage{padding:16px 12px}
  .level{padding:9px 16px;font-size:12px}
  .modal__title{font-size:18px}
}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{
    animation-duration:.01ms!important;
    animation-iteration-count:1!important;
    transition-duration:.01ms!important;
  }
}
</style>
</head>
<body>
<main class="stage">
  <div class="card">
    <div class="header">
      <div class="header__title">🎮 Tic-Tac-Toe</div>
      <div class="header__sub">Melawan AI</div>
    </div>
    <div class="status" aria-live="polite">
      <div class="status__turn">
        <span class="status__indicator" id="indicator"></span>
        <span id="status-text">Giliranmu</span>
      </div>
      <div class="status__score">
        <span>Kamu<b id="score-x">0</b></span>
        <span>Seri<b id="score-d">0</b></span>
        <span>AI<b id="score-o">0</b></span>
      </div>
    </div>
    <div class="board" id="board" role="grid" aria-label="Papan permainan tiga kali tiga"></div>
    <div class="levels">
      <div class="levels__label">🎯 Tingkat lawan</div>
      <div class="levels__list" id="levels-list" role="radiogroup" aria-label="Tingkat kesulitan"></div>
    </div>
    <div class="footer">
      <button class="footer__reset" id="reset">🔄 Ulang papan</button>
    </div>
  </div>
</main>

<div class="modal" id="modal" hidden>
  <div class="modal__backdrop" id="modal-backdrop"></div>
  <div class="modal__card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <h2 class="modal__title" id="modal-title">Kamu menang</h2>
    <p class="modal__sub" id="modal-sub">Bagus sekali. Mau coba lagi?</p>
    <button class="modal__retry" id="modal-retry">🔄 Coba lagi</button>
  </div>
</div>

<script>
let audioCtx=null;
function getAudio(){
  if(!audioCtx){
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  }
  if(audioCtx.state==='suspended')audioCtx.resume();
  return audioCtx;
}
function playTone(freq,duration=0.3,type='sine'){
  const ctx=getAudio();
  const osc=ctx.createOscillator();
  const gain=ctx.createGain();
  osc.type=type;
  osc.frequency.setValueAtTime(freq,ctx.currentTime);
  gain.gain.setValueAtTime(0.0001,ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.35,ctx.currentTime+0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime+duration+0.05);
}

const state={
  board:Array(9).fill(null),
  human:'X',
  ai:'O',
  turn:'X',
  over:false,
  winner:null,
  line:null,
  thinking:false,
  level:2,
  scores:{X:0,O:0,D:0}
};

const LEVELS=[
  {name:'🟢 Pemula'},
  {name:'🟡 Terlatih'},
  {name:'🟠 Taktisi'},
  {name:'🔴 Master'}
];

const WIN_LINES=[
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

const $=id=>document.getElementById(id);
const boardEl=$('board'),statusText=$('status-text'),indicator=$('indicator');
const levelsList=$('levels-list');
const scoreX=$('score-x'),scoreO=$('score-o'),scoreD=$('score-d');
const modal=$('modal');

function buildBoard(){
  boardEl.innerHTML='';
  for(let i=0;i<9;i++){
    const c=document.createElement('button');
    c.className='cell';
    c.setAttribute('role','gridcell');
    c.setAttribute('aria-label',\`Kotak \${i+1}\`);
    c.dataset.idx=i;
    c.addEventListener('click',()=>onCell(i));
    boardEl.appendChild(c);
  }
}

function buildLevels(){
  levelsList.innerHTML='';
  LEVELS.forEach((lvl,i)=>{
    const b=document.createElement('button');
    b.className='level'+(i===state.level?' is-active':'');
    b.setAttribute('role','radio');
    b.setAttribute('aria-checked',i===state.level?'true':'false');
    b.textContent=lvl.name;
    b.addEventListener('click',()=>setLevel(i));
    levelsList.appendChild(b);
  });
}

function setLevel(i){
  state.level=i;
  document.querySelectorAll('.level').forEach((el,idx)=>{
    const on=idx===i;
    el.classList.toggle('is-active',on);
    el.setAttribute('aria-checked',on?'true':'false');
  });
  resetBoard();
}

function markSVG(v){
  if(v==='X'){
    return \`<svg class="mark__svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><path d="M 22 22 L 78 78"/><path d="M 78 22 L 22 78"/></svg>\`;
  }
  return \`<svg class="mark__svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><circle cx="50" cy="50" r="30"/></svg>\`;
}

function renderCell(i){
  const cell=boardEl.children[i];
  const v=state.board[i];
  const existing=cell.querySelector('.mark');
  if(v){
    if(!existing){
      const m=document.createElement('div');
      m.className='mark mark--'+v.toLowerCase();
      m.innerHTML=markSVG(v);
      cell.appendChild(m);
    }
    cell.disabled=true;
  } else {
    if(existing) existing.remove();
    cell.disabled=state.over||state.thinking||state.turn!==state.human;
  }
  const isWin=!!(state.line&&state.line.includes(i));
  cell.classList.toggle('is-winning',isWin);
  cell.classList.toggle('is-winning-x',isWin&&state.winner==='X');
}

function render(){
  for(let i=0;i<9;i++) renderCell(i);
  if(state.over){
    if(state.winner==='X'){statusText.textContent='🎉 Kamu menang';indicator.className='status__indicator';}
    else if(state.winner==='O'){statusText.textContent='🤖 AI menang';indicator.className='status__indicator is-o';}
    else {statusText.textContent='🤝 Seri';indicator.className='status__indicator';}
  } else if(state.thinking){
    statusText.textContent='🤔 AI berpikir…';
    indicator.className='status__indicator is-o is-thinking';
  } else {
    statusText.textContent=state.turn===state.human?'👤 Giliranmu':'🤖 Giliran AI';
    indicator.className='status__indicator'+(state.turn===state.ai?' is-o':'');
  }
  scoreX.textContent=state.scores.X;
  scoreO.textContent=state.scores.O;
  scoreD.textContent=state.scores.D;
}

function onCell(i){
  if(state.over||state.thinking) return;
  if(state.board[i]!==null) return;
  if(state.turn!==state.human) return;
  state.board[i]=state.human;
  playTone(600,0.1,"sine");
  renderCell(i);
  const r=checkWinner(state.board);
  if(r){endGame(r);return;}
  state.turn=state.ai;
  state.thinking=true;
  render();
  setTimeout(aiMove,380+Math.random()*340);
}

function aiMove(){
  if(!state.thinking) return;
  const m=chooseAIMove();
  if(m===null){state.thinking=false;render();return;}
  state.board[m]=state.ai;
  playTone(300,0.1,"sine");
  renderCell(m);
  state.thinking=false;
  const r=checkWinner(state.board);
  if(r){endGame(r);}
  else {state.turn=state.human;render();}
}

function chooseAIMove(){
  const empty=state.board.map((v,i)=>v===null?i:-1).filter(i=>i>=0);
  if(!empty.length) return null;
  const L=state.level;
  if(L===0) return empty[Math.floor(Math.random()*empty.length)];
  if(L===1){
    const win=findImmediate(state.board,state.ai);
    if(win!==null) return win;
    if(Math.random()>0.15){
      const block=findImmediate(state.board,state.human);
      if(block!==null) return block;
    }
    if(state.board[4]===null) return 4;
    if(Math.random()>0.2){
      const corners=[0,2,6,8].filter(i=>state.board[i]===null);
      if(corners.length) return corners[Math.floor(Math.random()*corners.length)];
    }
    return empty[Math.floor(Math.random()*empty.length)];
  }
  if(L===2){
    if(Math.random()<0.10) return empty[Math.floor(Math.random()*empty.length)];
    return minimaxMove(state.board,state.ai,4);
  }
  return minimaxMove(state.board,state.ai,9);
}

function findImmediate(board,player){
  for(const line of WIN_LINES){
    const cells=[board[line[0]],board[line[1]],board[line[2]]];
    const c=cells.filter(v=>v===player).length;
    const e=cells.filter(v=>v===null).length;
    if(c===2&&e===1) return line[cells.indexOf(null)];
  }
  return null;
}

function minimaxMove(board,player,maxDepth){
  let best=-Infinity,moves=[];
  for(let i=0;i<9;i++){
    if(board[i]!==null) continue;
    board[i]=player;
    const s=minimax(board,player==='O'?'X':'O',0,maxDepth,-Infinity,Infinity);
    board[i]=null;
    if(s>best){best=s;moves=[i];}
    else if(s===best){moves.push(i);}
  }
  return moves[Math.floor(Math.random()*moves.length)];
}

function minimax(board,current,depth,maxDepth,alpha,beta){
  const r=checkWinner(board);
  if(r){
    if(r.winner==='O') return 10-depth;
    if(r.winner==='X') return depth-10;
    return 0;
  }
  if(depth>=maxDepth) return 0;
  const isMax=current==='O';
  let best=isMax?-Infinity:Infinity;
  for(let i=0;i<9;i++){
    if(board[i]!==null) continue;
    board[i]=current;
    const s=minimax(board,current==='O'?'X':'O',depth+1,maxDepth,alpha,beta);
    board[i]=null;
    if(isMax){best=Math.max(best,s);alpha=Math.max(alpha,s);}
    else {best=Math.min(best,s);beta=Math.min(beta,s);}
    if(beta<=alpha) break;
  }
  return best;
}

function checkWinner(board){
  for(const line of WIN_LINES){
    const [a,b,c]=line;
    if(board[a]&&board[a]===board[b]&&board[a]===board[c]){
      return {winner:board[a],line};
    }
  }
  if(board.every(v=>v!==null)) return {winner:'D',line:null};
  return null;
}

function endGame(r){
  if(r.winner==='X'){
    setTimeout(()=>playTone(880,0.4,'sine'),100);
    setTimeout(()=>playTone(1100,0.4,'sine'),300);
  } else if(r.winner==='O'){
    setTimeout(()=>playTone(200,0.5,'sawtooth'),100);
  } else {
    setTimeout(()=>playTone(300,0.3,'square'),100);
  }
  state.over=true;
  state.winner=r.winner;
  state.line=r.line;
  if(r.winner==='X') state.scores.X++;
  else if(r.winner==='O') state.scores.O++;
  else state.scores.D++;
  render();
  if(r.line){
    setTimeout(()=>drawWinningLine(r.line,r.winner),220);
    setTimeout(()=>showModal(r.winner),950);
  } else {
    setTimeout(()=>showModal(r.winner),400);
  }
}

function showModal(winner){
  const title=$('modal-title');
  const sub=$('modal-sub');
  if(winner==='X'){
    title.textContent='🎉 Kamu menang!';
    title.className='modal__title';
    sub.textContent='Bagus sekali. Mau coba lagi?';
  } else if(winner==='O'){
    title.textContent='🤖 AI menang!';
    title.className='modal__title is-o';
    sub.textContent='Kali ini lawan lebih baik. Ulangi?';
  } else {
    title.textContent='🤝 Seri!';
    title.className='modal__title';
    sub.textContent='Imbang. Main sekali lagi?';
  }
  modal.hidden=false;
  void modal.offsetWidth;
  modal.classList.add('is-open');
  setTimeout(()=>$('modal-retry').focus(),80);
}

function hideModal(){
  modal.classList.remove('is-open');
  setTimeout(()=>{modal.hidden=true;},350);
}

function drawWinningLine(line,winner){
  const rect=boardEl.getBoundingClientRect();
  const s=boardEl.children[line[0]].getBoundingClientRect();
  const e=boardEl.children[line[2]].getBoundingClientRect();
  const x1=s.left+s.width/2-rect.left;
  const y1=s.top+s.height/2-rect.top;
  const x2=e.left+e.width/2-rect.left;
  const y2=e.top+e.height/2-rect.top;
  const len=Math.hypot(x2-x1,y2-y1);
  const ang=Math.atan2(y2-y1,x2-x1);
  const el=document.createElement('div');
  el.className='winning-line'+(winner==='X'?' is-x':'');
  el.style.left=x1+'px';
  el.style.top=y1+'px';
  el.style.width=len+'px';
  el.style.transform=\`translateY(-50%) rotate(\${ang}rad) scaleX(0)\`;
  el.style.transition='transform .55s cubic-bezier(0.65,0,0.35,1)';
  boardEl.appendChild(el);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    el.style.transform=\`translateY(-50%) rotate(\${ang}rad) scaleX(1)\`;
  }));
}

function resetBoard(){
  hideModal();
  state.board=Array(9).fill(null);
  state.turn=state.human;
  state.over=false;state.winner=null;state.line=null;
  state.thinking=false;
  const wl=boardEl.querySelector('.winning-line');
  if(wl) wl.remove();
  render();
}

$('reset').addEventListener('click',resetBoard);
$('modal-retry').addEventListener('click',resetBoard);
$('modal-backdrop').addEventListener('click',resetBoard);
document.addEventListener('keydown',(e)=>{
  if(!modal.classList.contains('is-open')) return;
  if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();resetBoard();}
});

buildBoard();
buildLevels();
render();
</script>
</body>
</html>`;

function buildTictacPayload(jid, resultText = 'Tic-Tac-Toe Premium') {
    const responseId = `tictac-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const payload = {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {
                messageDisclaimerText: "",
                botResponseId: responseId
            }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: "AI_RICH_RESPONSE_TYPE_STANDARD",
                    submessages: [
                        {
                            messageType: "AI_RICH_RESPONSE_TEXT",
                            messageText: resultText
                        }
                    ],
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify({
                            response_id: responseId,
                            sections: [
                                {
                                    view_model: {
                                        primitive: {
                                            __typename: "GenAIaeacdsnwHtmlPrimitive",
                                            payload: tictacHtml,
                                            trusted_sources: ["pastebin.com"]
                                        },
                                        __typename: "GenAISingleLayoutViewModel"
                                    }
                                }
                            ]
                        })).toString('base64')
                    },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: {
                            botJid: "867051314767696@bot"
                        },
                        forwardOrigin: "META_AI"
                    }
                }
            }
        }
    };

    return { jid, content: payload };
}

const tictacCommand = async (sock, chatId, msg, args = []) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;

    if (!sock || !target) {
        throw new Error('Chat context is required');
    }

    // Random game result text (for fallback)
    const outcomes = [
        '🎮 Tic-Tac-Toe • Kamu VS AI',
        '❌ Tic-Tac-Toe • Main sekarang!',
        '⭕ Tic-Tac-Toe • Siapa menang?'
    ];
    const resultText = outcomes[Math.floor(Math.random() * outcomes.length)];

    try {
        const payload = buildTictacPayload(target, resultText);
        await sock.relayMessage(payload.jid, payload.content, {});
        return true;
    } catch (error) {
        console.error('[tictac] relay failed:', error?.message || error);

        // Fallback - send plain text
        try {
            await sock.sendMessage(target, {
                text: `🎮 TIC-TAC-TOE\n━━━━━━━━━━━━━━━━━━━\n❌ Kamu (X) vs 🤖 AI (O)\n━━━━━━━━━━━━━━━━━━━\nKetik .tictac ku untuk main!\n━━━━━━━━━━━━━━━━━━━\n🎯 Pilih tingkat: Pemula | Terlatih | Taktisi | Master`
            }, { quoted: ctx.msg });
            return true;
        } catch (sendErr) {
            console.error('[tictac] fallback failed:', sendErr?.message || sendErr);
            return false;
        }
    }
};

tictacCommand.name = 'tictac';
tictacCommand.aliases = ['tictactoe', 'ttt', 'xoxo'];
tictacCommand.category = 'fun';
tictacCommand.description = 'Tic-Tac-Toe game with AI opponent + interactive HTML';

module.exports = tictacCommand;
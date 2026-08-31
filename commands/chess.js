const { createCtx } = require('../lib/messageBuilder');
const { randomUUID } = require('crypto');

// HTML ya Chess Game
function buildChessHTML() {
    return `
<!DOCTYPE html>
<html lang="sw">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>♟️ Chess</title>
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

body {
  background: transparent;
  font-family: Arial, Helvetica, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 10px;
}

.container {
  width: 100%;
  max-width: 420px;
  margin: auto;
  padding: 16px;
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 20px 60px rgba(0,0,0,0.8);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
}

.header-title {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #ffd93d, #ff6b6b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-status {
  font-size: 12px;
  color: #aaa;
}

.header-status .turn {
  color: #fff;
  font-weight: 600;
}

#board {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  aspect-ratio: 1;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid rgba(255,255,255,0.1);
  background: #2a2a4a;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(28px, 6vw, 44px);
  cursor: pointer;
  position: relative;
  aspect-ratio: 1;
  transition: all 0.15s ease;
}

.cell.light {
  background: #f0d9b5;
}

.cell.dark {
  background: #b58863;
}

.cell.selected {
  background: #7fc97f !important;
  box-shadow: inset 0 0 20px rgba(255,255,255,0.3);
}

.cell.valid-move::after {
  content: '';
  position: absolute;
  width: 30%;
  height: 30%;
  background: rgba(0,0,0,0.2);
  border-radius: 50%;
  pointer-events: none;
}

.cell.valid-capture {
  box-shadow: inset 0 0 0 4px rgba(0,0,0,0.3);
}

.cell.last-move {
  background: #cdd26a !important;
}

.cell:active {
  transform: scale(0.92);
}

.cell .piece {
  pointer-events: none;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  transition: transform 0.2s ease;
}

.cell .piece.white {
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.cell .piece.black {
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
}

.controls {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.controls button {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
}

.controls button:active {
  transform: scale(0.95);
}

.btn-restart {
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  color: #fff;
}

.btn-restart:hover {
  opacity: 0.9;
}

.btn-undo {
  background: rgba(255,255,255,0.1);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
}

.btn-undo:hover {
  background: rgba(255,255,255,0.2);
}

.status-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.05);
  font-size: 12px;
  color: #aaa;
  min-height: 36px;
}

.status-bar .check {
  color: #ff6b6b;
  font-weight: 700;
}

.status-bar .checkmate {
  color: #ffd93d;
  font-weight: 700;
}

.status-bar .stalemate {
  color: #ffd93d;
  font-weight: 700;
}

.captured-pieces {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding: 4px 8px;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  min-height: 28px;
  font-size: 18px;
  border: 1px solid rgba(255,255,255,0.05);
}

.captured-pieces .captured-white {
  color: #fff;
}

.captured-pieces .captured-black {
  color: #888;
}

@media (max-width: 400px) {
  .cell { font-size: clamp(22px, 5vw, 32px); }
  .container { padding: 10px; }
  .header-title { font-size: 15px; }
}
</style>
</head>
<body>

<div class="container">
  <div class="header">
    <div class="header-title">♟️ CHESS</div>
    <div class="header-status">
      <span id="turnIndicator">🎯 <span class="turn" id="turnText">White</span></span>
    </div>
  </div>

  <div id="board"></div>

  <div class="captured-pieces">
    <span class="captured-white" id="capturedWhite"></span>
    <span class="captured-black" id="capturedBlack"></span>
  </div>

  <div class="controls">
    <button class="btn-undo" id="undoBtn">↩️ Undo</button>
    <button class="btn-restart" id="restartBtn">🔄 Restart</button>
  </div>

  <div class="status-bar" id="statusBar">♟️ White's turn</div>
</div>

<script>
(function() {
  // ===== PIECES =====
  const PIECES = {
    KING: 'K', QUEEN: 'Q', ROOK: 'R', BISHOP: 'B', KNIGHT: 'N', PAWN: 'P'
  };

  const COLORS = { WHITE: 'white', BLACK: 'black' };

  const PIECE_SYMBOLS = {
    'white_K': '♔', 'white_Q': '♕', 'white_R': '♖', 'white_B': '♗', 'white_N': '♘', 'white_P': '♙',
    'black_K': '♚', 'black_Q': '♛', 'black_R': '♜', 'black_B': '♝', 'black_N': '♞', 'black_P': '♟'
  };

  // ===== GAME STATE =====
  let board = [];
  let turn = 'white';
  let selected = null;
  let validMoves = [];
  let moveHistory = [];
  let capturedWhite = [];
  let capturedBlack = [];
  let gameOver = false;
  let isAIThinking = false;

  // Board element
  const boardEl = document.getElementById('board');
  const statusBar = document.getElementById('statusBar');
  const turnText = document.getElementById('turnText');
  const turnIndicator = document.getElementById('turnIndicator');
  const capturedWhiteEl = document.getElementById('capturedWhite');
  const capturedBlackEl = document.getElementById('capturedBlack');

  // ===== INITIAL BOARD =====
  function initBoard() {
    const b = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Black pieces
    b[0][0] = { type: 'R', color: 'black' };
    b[0][1] = { type: 'N', color: 'black' };
    b[0][2] = { type: 'B', color: 'black' };
    b[0][3] = { type: 'Q', color: 'black' };
    b[0][4] = { type: 'K', color: 'black' };
    b[0][5] = { type: 'B', color: 'black' };
    b[0][6] = { type: 'N', color: 'black' };
    b[0][7] = { type: 'R', color: 'black' };
    for (let i = 0; i < 8; i++) b[1][i] = { type: 'P', color: 'black' };

    // White pieces
    b[7][0] = { type: 'R', color: 'white' };
    b[7][1] = { type: 'N', color: 'white' };
    b[7][2] = { type: 'B', color: 'white' };
    b[7][3] = { type: 'Q', color: 'white' };
    b[7][4] = { type: 'K', color: 'white' };
    b[7][5] = { type: 'B', color: 'white' };
    b[7][6] = { type: 'N', color: 'white' };
    b[7][7] = { type: 'R', color: 'white' };
    for (let i = 0; i < 8; i++) b[6][i] = { type: 'P', color: 'white' };

    return b;
  }

  function resetGame() {
    board = initBoard();
    turn = 'white';
    selected = null;
    validMoves = [];
    moveHistory = [];
    capturedWhite = [];
    capturedBlack = [];
    gameOver = false;
    isAIThinking = false;
    render();
    updateStatus();
  }

  // ===== PIECE HELPERS =====
  function getPieceSymbol(piece) {
    if (!piece) return '';
    return PIECE_SYMBOLS[piece.color + '_' + piece.type] || '';
  }

  function isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  function getPiece(row, col) {
    if (!isInBounds(row, col)) return null;
    return board[row][col];
  }

  function isSameColor(piece1, piece2) {
    if (!piece1 || !piece2) return false;
    return piece1.color === piece2.color;
  }

  function findKing(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'K' && p.color === color) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  function isInCheck(color) {
    const king = findKing(color);
    if (!king) return true;
    const enemy = color === 'white' ? 'black' : 'white';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.color === enemy) {
          const moves = getPseudoLegalMoves(r, c);
          for (const m of moves) {
            if (m.row === king.row && m.col === king.col) return true;
          }
        }
      }
    }
    return false;
  }

  function simulateMove(fromRow, fromCol, toRow, toCol) {
    const captured = board[toRow][toCol];
    const moved = board[fromRow][fromCol];
    board[toRow][toCol] = moved;
    board[fromRow][fromCol] = null;
    return captured;
  }

  function undoSimulate(fromRow, fromCol, toRow, toCol, captured) {
    board[fromRow][fromCol] = board[toRow][toCol];
    board[toRow][toCol] = captured;
  }

  function isValidMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    if (!piece) return false;
    if (board[toRow][toCol] && board[toRow][toCol].color === piece.color) return false;

    const moves = getLegalMoves(fromRow, fromCol);
    return moves.some(m => m.row === toRow && m.col === toCol);
  }

  // ===== MOVE GENERATION =====
  function getPseudoLegalMoves(row, col) {
    const piece = board[row][col];
    if (!piece) return [];
    const moves = [];
    const { type, color } = piece;
    const dir = color === 'white' ? -1 : 1;
    const enemy = color === 'white' ? 'black' : 'white';

    const addMove = (r, c) => {
      if (isInBounds(r, c)) {
        const target = board[r][c];
        if (!target || target.color !== color) {
          moves.push({ row: r, col: c });
        }
      }
    };

    const addSliding = (dr, dc) => {
      let r = row + dr, c = col + dc;
      while (isInBounds(r, c)) {
        const target = board[r][c];
        if (target) {
          if (target.color !== color) moves.push({ row: r, col: c });
          break;
        }
        moves.push({ row: r, col: c });
        r += dr;
        c += dc;
      }
    };

    switch (type) {
      case 'P': {
        // Forward
        const nr = row + dir;
        if (isInBounds(nr, col) && !board[nr][col]) {
          moves.push({ row: nr, col });
          // Double move
          const startRow = color === 'white' ? 6 : 1;
          if (row === startRow) {
            const nr2 = row + 2 * dir;
            if (!board[nr2][col]) moves.push({ row: nr2, col });
          }
        }
        // Captures
        for (const dc of [-1, 1]) {
          const nc = col + dc;
          if (isInBounds(nr, nc)) {
            const target = board[nr][nc];
            if (target && target.color === enemy) {
              moves.push({ row: nr, col: nc });
            }
          }
        }
        break;
      }
      case 'N': {
        const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const [dr, dc] of knightMoves) addMove(row + dr, col + dc);
        break;
      }
      case 'B': {
        addSliding(-1,-1); addSliding(-1,1); addSliding(1,-1); addSliding(1,1);
        break;
      }
      case 'R': {
        addSliding(-1,0); addSliding(1,0); addSliding(0,-1); addSliding(0,1);
        break;
      }
      case 'Q': {
        addSliding(-1,-1); addSliding(-1,1); addSliding(1,-1); addSliding(1,1);
        addSliding(-1,0); addSliding(1,0); addSliding(0,-1); addSliding(0,1);
        break;
      }
      case 'K': {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            addMove(row + dr, col + dc);
          }
        }
        break;
      }
    }
    return moves;
  }

  function getLegalMoves(row, col) {
    const piece = board[row][col];
    if (!piece) return [];
    const pseudo = getPseudoLegalMoves(row, col);
    const legal = [];
    for (const move of pseudo) {
      const captured = simulateMove(row, col, move.row, move.col);
      const inCheck = isInCheck(piece.color);
      undoSimulate(row, col, move.row, move.col, captured);
      if (!inCheck) legal.push(move);
    }
    return legal;
  }

  function getAllLegalMoves(color) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.color === color) {
          const m = getLegalMoves(r, c);
          for (const move of m) {
            moves.push({ fromRow: r, fromCol: c, toRow: move.row, toCol: move.col });
          }
        }
      }
    }
    return moves;
  }

  // ===== AI =====
  function evaluateBoard() {
    const values = {
      P: 100, N: 320, B: 330, R: 500, Q: 900, K: 10000
    };
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) {
          const val = values[p.type] || 0;
          score += p.color === 'white' ? val : -val;
        }
      }
    }
    return score;
  }

  function minimax(depth, alpha, beta, isMaximizing) {
    const color = isMaximizing ? 'white' : 'black';
    const moves = getAllLegalMoves(color);

    if (moves.length === 0) {
      if (isInCheck(color)) {
        return isMaximizing ? -99999 + depth : 99999 - depth;
      }
      return 0; // stalemate
    }

    if (depth === 0) {
      return evaluateBoard();
    }

    let bestMove = moves[0];

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const captured = simulateMove(move.fromRow, move.fromCol, move.toRow, move.toCol);
        const eval_ = minimax(depth - 1, alpha, beta, false);
        undoSimulate(move.fromRow, move.fromCol, move.toRow, move.toCol, captured);
        if (eval_ > maxEval) {
          maxEval = eval_;
          bestMove = move;
        }
        alpha = Math.max(alpha, eval_);
        if (beta <= alpha) break;
      }
      return depth === 3 ? bestMove : maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const captured = simulateMove(move.fromRow, move.fromCol, move.toRow, move.toCol);
        const eval_ = minimax(depth - 1, alpha, beta, true);
        undoSimulate(move.fromRow, move.fromCol, move.toRow, move.toCol, captured);
        if (eval_ < minEval) {
          minEval = eval_;
          bestMove = move;
        }
        beta = Math.min(beta, eval_);
        if (beta <= alpha) break;
      }
      return depth === 3 ? bestMove : minEval;
    }
  }

  function getAIMove() {
    const moves = getAllLegalMoves('black');
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    // Use minimax with depth 3
    const result = minimax(3, -Infinity, Infinity, false);
    return result;
  }

  // ===== GAME LOGIC =====
  function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const captured = board[toRow][toCol];

    // Save to history for undo
    moveHistory.push({
      fromRow, fromCol, toRow, toCol,
      piece: piece,
      captured: captured
    });

    // Move piece
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;

    // Track captured pieces
    if (captured) {
      if (captured.color === 'white') capturedWhite.push(captured);
      else capturedBlack.push(captured);
    }

    // Pawn promotion
    if (piece.type === 'P') {
      if (toRow === 0 || toRow === 7) {
        board[toRow][toCol] = { type: 'Q', color: piece.color };
      }
    }

    return captured;
  }

  function undoLastMove() {
    if (moveHistory.length === 0) return false;
    const last = moveHistory.pop();
    board[last.fromRow][last.fromCol] = last.piece;
    board[last.toRow][last.toCol] = last.captured;
    if (last.captured) {
      if (last.captured.color === 'white') capturedWhite.pop();
      else capturedBlack.pop();
    }
    return true;
  }

  function handleMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    if (!piece) return false;

    // Check if move is valid
    const moves = getLegalMoves(fromRow, fromCol);
    if (!moves.some(m => m.row === toRow && m.col === toCol)) return false;

    // Make move
    makeMove(fromRow, fromCol, toRow, toCol);

    // Switch turn
    turn = turn === 'white' ? 'black' : 'white';

    // Check game state
    checkGameState();

    render();
    updateStatus();

    // AI move
    if (!gameOver && turn === 'black' && !isAIThinking) {
      setTimeout(doAIMove, 300);
    }

    return true;
  }

  function doAIMove() {
    if (isAIThinking || gameOver || turn !== 'black') return;
    isAIThinking = true;
    statusBar.textContent = '🤔 AI is thinking...';
    statusBar.className = 'status-bar';

    setTimeout(() => {
      const move = getAIMove();
      isAIThinking = false;

      if (!move) {
        checkGameState();
        render();
        updateStatus();
        return;
      }

      makeMove(move.fromRow, move.fromCol, move.toRow, move.toCol);
      turn = 'white';

      checkGameState();
      render();
      updateStatus();

      // Update UI
      if (!gameOver) {
        statusBar.textContent = '♟️ Your turn (White)';
        statusBar.className = 'status-bar';
      }
    }, 200);
  }

  function checkGameState() {
    const moves = getAllLegalMoves(turn);
    if (moves.length === 0) {
      gameOver = true;
      if (isInCheck(turn)) {
        const winner = turn === 'white' ? 'Black' : 'White';
        statusBar.textContent = `♚ Checkmate! ${winner} wins!`;
        statusBar.className = 'status-bar checkmate';
      } else {
        statusBar.textContent = '🤝 Stalemate! Draw!';
        statusBar.className = 'status-bar stalemate';
      }
      return true;
    }

    if (isInCheck(turn)) {
      statusBar.textContent = `⚠️ ${turn === 'white' ? 'White' : 'Black'} is in check!`;
      statusBar.className = 'status-bar check';
      return true;
    }

    return false;
  }

  function updateStatus() {
    if (gameOver) return;
    const turnName = turn === 'white' ? 'Your' : 'AI';
    const turnColor = turn === 'white' ? '♔' : '♚';
    statusBar.textContent = `♟️ ${turnName} turn (${turn === 'white' ? 'White' : 'Black'})`;
    statusBar.className = 'status-bar';
    turnText.textContent = turn === 'white' ? 'Your turn' : 'AI thinking...';
    turnText.style.color = turn === 'white' ? '#fff' : '#ffd93d';

    // Update indicator
    turnIndicator.innerHTML = turn === 'white' ? '♔' : '♚';
  }

  // ===== RENDER =====
  function render() {
    boardEl.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = document.createElement('div');
        const isLight = (r + c) % 2 === 0;
        cell.className = `cell ${isLight ? 'light' : 'dark'}`;
        cell.dataset.row = r;
        cell.dataset.col = c;

        // Check if selected
        if (selected && selected.row === r && selected.col === c) {
          cell.classList.add('selected');
        }

        // Check if valid move
        if (validMoves.some(m => m.row === r && m.col === c)) {
          cell.classList.add('valid-move');
        }

        // Check if valid capture
        if (validMoves.some(m => m.row === r && m.col === c && board[r][c])) {
          cell.classList.add('valid-capture');
        }

        // Last move
        if (moveHistory.length > 0) {
          const last = moveHistory[moveHistory.length - 1];
          if ((last.fromRow === r && last.fromCol === c) || (last.toRow === r && last.toCol === c)) {
            cell.classList.add('last-move');
          }
        }

        // Piece
        const piece = board[r][c];
        if (piece) {
          const span = document.createElement('span');
          span.className = `piece ${piece.color}`;
          span.textContent = getPieceSymbol(piece);
          cell.appendChild(span);
        }

        cell.addEventListener('click', () => onCellClick(r, c));
        boardEl.appendChild(cell);
      }
    }

    // Update captured pieces
    capturedWhiteEl.textContent = capturedWhite.map(p => getPieceSymbol(p)).join('');
    capturedBlackEl.textContent = capturedBlack.map(p => getPieceSymbol(p)).join('');
  }

  // ===== UI EVENTS =====
  function onCellClick(row, col) {
    if (gameOver || isAIThinking || turn !== 'white') return;

    const piece = board[row][col];

    // If clicking on own piece, select it
    if (piece && piece.color === 'white') {
      selected = { row, col };
      validMoves = getLegalMoves(row, col);
      render();
      return;
    }

    // If clicking on a valid move target
    if (selected && validMoves.some(m => m.row === row && m.col === col)) {
      handleMove(selected.row, selected.col, row, col);
      selected = null;
      validMoves = [];
      return;
    }

    // Deselect
    selected = null;
    validMoves = [];
    render();
  }

  // ===== CONTROLS =====
  document.getElementById('restartBtn').addEventListener('click', () => {
    resetGame();
    if (turn === 'black' && !gameOver) {
      setTimeout(doAIMove, 500);
    }
  });

  document.getElementById('undoBtn').addEventListener('click', () => {
    if (isAIThinking || gameOver) return;
    // Undo two moves (player + AI)
    for (let i = 0; i < 2; i++) {
      if (!undoLastMove()) break;
    }
    turn = 'white';
    selected = null;
    validMoves = [];
    gameOver = false;
    render();
    updateStatus();
    statusBar.textContent = '♟️ Undo successful';
    statusBar.className = 'status-bar';
  });

  // ===== INIT =====
  resetGame();
  // Start with AI if black goes first (AI plays black)
  if (turn === 'black') {
    setTimeout(doAIMove, 500);
  }

})();
</script>
</body>
</html>
`;
}

function buildChessPayload(jid, resultText = '♟️ CHESS GAME') {
    const responseId = `chess-${Date.now()}-${randomUUID().substr(0, 6)}`;

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
                    messageType: 1,
                    submessages: [
                        {
                            messageType: 2,
                            messageText: "♟️ Chess vs AI"
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
                                            payload: buildChessHTML(),
                                            trusted_sources: ["cylic.dev"]
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
                        forwardOrigin: 4
                    }
                }
            }
        }
    };

    return { jid, content: payload };
}

const chessCommand = async (sock, chatId, msg, args = []) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;

    if (!sock || !target) {
        throw new Error('Chat context is required');
    }

    try {
        const payload = buildChessPayload(target, '♟️ CHESS GAME');
        await sock.relayMessage(payload.jid, payload.content, {});
        return true;
    } catch (error) {
        console.error('[chess] relay failed:', error?.message || error);

        try {
            await sock.sendMessage(target, {
                text: `♟️ CHESS GAME\n━━━━━━━━━━━━━━━━━━━\n🎯 Play against AI!\n━━━━━━━━━━━━━━━━━━━\n♔ You: White\n♚ AI: Black\n━━━━━━━━━━━━━━━━━━━\nType .chess to play!`
            }, { quoted: ctx.msg });
            return true;
        } catch (sendErr) {
            console.error('[chess] fallback failed:', sendErr?.message || sendErr);
            return false;
        }
    }
};

chessCommand.name = 'chess';
chessCommand.aliases = ['chessgame', '♟️'];
chessCommand.category = 'fun';
chessCommand.description = '♟️ Chess Game vs AI';

module.exports = chessCommand;
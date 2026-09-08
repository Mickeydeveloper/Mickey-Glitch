const http = require('http')
const path = require('path')
const { WebSocketServer } = require('ws')

// Ensure the runtime cwd is the project folder so relative requires resolve correctly.
process.chdir(path.join(__dirname, '..'))

const url = require('url');
const { addTransaction, updateTransaction, findTransaction } = require('../lib/paymentStore');

const socketRooms = new Map();

function ensureRoom(room) {
  if (!socketRooms.has(room)) {
    socketRooms.set(room, {
      members: new Map(),
      history: []
    });
  }
  return socketRooms.get(room);
}

function broadcastRoom(room, payload) {
  const roomState = ensureRoom(room);
  const clients = [...roomState.members.values()];
  for (const client of clients) {
    try {
      if (client.readyState === 1) client.send(JSON.stringify(payload));
    } catch (err) {
      console.error('[ws] broadcast failed:', err.message || err);
    }
  }
}

function registerSocketConnection(ws, req) {
  const urlData = new URL(req.url || '/', 'http://localhost');
  const room = (urlData.searchParams.get('room') || 'general').trim() || 'general';
  const name = (urlData.searchParams.get('name') || 'User').trim() || 'User';
  const sid = urlData.searchParams.get('sid') || `sock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  ws.sid = sid;
  ws.room = room;
  ws.name = name;

  const roomState = ensureRoom(room);
  roomState.members.set(ws, { sid, name, joinedAt: Date.now() });

  const welcome = {
    type: 'chat:welcome',
    room,
    sid,
    members: [...roomState.members.values()].map(m => ({ sid: m.sid, name: m.name })),
    history: roomState.history.slice(-20)
  };
  ws.send(JSON.stringify(welcome));

  broadcastRoom(room, {
    type: 'chat:system',
    room,
    text: `${name} ameingia kwenye room`,
    ts: Date.now()
  });

  ws.on('message', (msg) => {
    let data = null;
    try {
      data = JSON.parse(msg.toString());
    } catch (err) {
      return;
    }

    if (!data || typeof data !== 'object') return;

    if (data.type === 'chat:join') {
      const nextName = (data.name || ws.name || 'User').trim() || 'User';
      const nextRoom = (data.room || room || 'general').trim() || 'general';
      ws.name = nextName;
      ws.room = nextRoom;

      const nextRoomState = ensureRoom(nextRoom);
      if (ws.room !== room) {
        const oldRoomState = ensureRoom(room);
        oldRoomState.members.delete(ws);
      }
      nextRoomState.members.set(ws, { sid: ws.sid, name: nextName, joinedAt: Date.now() });

      const updatedMembers = [...nextRoomState.members.values()].map(m => ({ sid: m.sid, name: m.name }));
      broadcastRoom(nextRoom, {
        type: 'chat:system',
        room: nextRoom,
        text: `${nextName} ameingia kwenye room`,
        ts: Date.now()
      });
      broadcastRoom(nextRoom, {
        type: 'chat:welcome',
        room: nextRoom,
        sid: ws.sid,
        members: updatedMembers,
        history: nextRoomState.history.slice(-20)
      });
      return;
    }

    if (data.type === 'chat:msg') {
      const text = String(data.text || '').trim();
      if (!text) return;
      const packet = {
        type: 'chat:msg',
        room: ws.room,
        sid: ws.sid,
        name: ws.name,
        text,
        ts: Date.now()
      };
      const activeRoom = ensureRoom(ws.room);
      activeRoom.history.push(packet);
      if (activeRoom.history.length > 50) activeRoom.history.shift();
      broadcastRoom(ws.room, packet);
      return;
    }
  });

  ws.on('close', () => {
    const currentRoom = ensureRoom(ws.room || room);
    currentRoom.members.delete(ws);

    const leftover = [...currentRoom.members.values()];
    if (leftover.length > 0) {
      broadcastRoom(ws.room || room, {
        type: 'chat:system',
        room: ws.room || room,
        text: `${ws.name} amesitoka kwenye room`,
        ts: Date.now()
      });
    }
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname || '';

  if (req.method === 'GET' && pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  if (req.method === 'POST' && pathname === '/api/payment/checkout') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const orderId = payload.orderId || `DON-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const paymentUrl = `https://example-payment-gateway.com/checkout/${encodeURIComponent(orderId)}`;

        const response = {
          success: true,
          message: 'Payment initialized',
          data: {
            paymentUrl,
            provider: payload.paymentMethod || 'palmpesa',
            transactionId: payload.transactionId || `TXN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
            reference: payload.reference || orderId,
          }
        };

        addTransaction({
          orderId,
          userId: payload.metadata?.userId || '',
          amount: payload.amount || 0,
          currency: payload.currency || 'TZS',
          provider: payload.paymentMethod || 'palmpesa',
          paymentUrl,
          transactionId: response.data.transactionId,
          reference: response.data.reference,
          status: 'pending',
          createdAt: new Date().toISOString(),
          metadata: payload.metadata || {},
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Invalid request payload' }));
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/payment/webhook') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const orderId = payload.order_id || payload.reference || payload.metadata?.transactionId || '';
        if (!orderId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Missing order identifier' }));
          return;
        }

        const transaction = findTransaction(orderId);
        if (!transaction) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Transaction not found' }));
          return;
        }

        if (payload.status?.toLowerCase() === 'completed') {
          updateTransaction(orderId, 'confirmed', {
            completedAt: new Date().toISOString(),
            gatewayPayload: payload,
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Transaction confirmed' }));
          return;
        }

        updateTransaction(orderId, payload.status || 'pending', { gatewayPayload: payload });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Transaction updated' }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Invalid webhook data' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

const port = process.env.PORT || 3000
const wsUrl = `ws://localhost:${port}/ws`
globalThis.__MICKY_BOT_WS_URL__ = wsUrl
globalThis.__BOT_WS_URL__ = wsUrl

const wss = new WebSocketServer({
  server,
  path: '/ws'
})

wss.on('connection', (ws, req) => {
  registerSocketConnection(ws, req)
})

wss.on('error', (err) => {
  console.error('[ws] websocket server error:', err.message || err)
})

server.listen(port, () => console.log(`✅ Server listening on port ${port}`))
console.log(`✅ Real bot WebSocket active at ${wsUrl}`)

// Start the bot after the HTTP server is listening so platforms like Heroku see a bound port
try {
  const indexPath = path.join(__dirname, '..', 'index.js')
  if (!require('fs').existsSync(indexPath)) {
    throw new Error(`Missing entry file: ${indexPath}`)
  }
  require(indexPath)
} catch (err) {
  console.error('Failed to start bot from server.js:', err)
}

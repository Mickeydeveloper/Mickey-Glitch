const http = require('http')
const path = require('path')

// Ensure the runtime cwd is the project folder so relative requires resolve correctly.
process.chdir(path.join(__dirname, '..'))

const url = require('url');
const { addTransaction, updateTransaction, findTransaction } = require('../lib/paymentStore');

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
server.listen(port, () => console.log(`✅ Server listening on port ${port}`))

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

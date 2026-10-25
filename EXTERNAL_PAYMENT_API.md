# External PalmPesa Payment API

This API lets a merchant backend create PalmPesa payment links through the server. PalmPesa credentials stay on the server. The merchant API key belongs only to the merchant backend and must never be included in browser JavaScript or a public mobile app.

Base URL: `https://mickey-pterodacty.vercel.app/api/integration/payments`

## 1. Configure the server

Set these server-side environment variables:

- `PALMPESA_API_TOKEN`: PalmPesa API token.
- `PALMPESA_USER_ID`: PalmPesa user ID.
- `PALMPESA_VENDOR`: PalmPesa vendor/Till identifier.
- `PALMPESA_WEBHOOK_URL`: `https://mickey-pterodacty.vercel.app/api/payment/webhook`.
- `PALMPESA_WEBHOOK_SECRET`: secret used to validate PalmPesa callbacks.
- `APP_URL`: `https://mickey-pterodacty.vercel.app`.
- `EXTERNAL_PAYMENT_WEBHOOK_URL`: the merchant's HTTPS callback endpoint.
- `PAYMENT_CREDENTIAL_ENCRYPTION_KEY`: a strong random key used to encrypt the stored external webhook secret.
- `EXTERNAL_PAYMENT_MAX_TZS`: optional maximum order amount. The default is `50000000`.

The API key used by the WhatsApp bot is hard-coded in `config.js` as `PAYMENT_CONFIG.externalApiKey`. Keep `config.js` private and do not expose the key through browser code or public endpoints.

Redeploy after changing server configuration for the first time. Credentials stored in MongoDB are loaded at runtime, so ordinary credential rotation should not require an application redeploy.

## 2. Rotate merchant credentials

Generate the API key and webhook secret together in **Admin > Payment API**. The server:

1. Generates 256-bit cryptographically random values.
2. Stores only a SHA-256 hash of the API key.
3. Encrypts the webhook secret with AES-256-GCM.
4. Activates the new credentials immediately.
5. Records only an API key prefix and rotation metadata in audit logs.

The generated values are shown once. Store the API key in the merchant backend and the webhook secret in both sides. Generating a second pair deactivates the old API key and webhook secret immediately. Rotate during a maintenance window or update the merchant backend first.

When rotating the key, update `PAYMENT_CONFIG.externalApiKey` in `config.js`, then restart or redeploy the WhatsApp application.

## 3. Create a payment

Call the endpoint from the merchant backend:

```http
POST /api/integration/payments/checkout
Authorization: Bearer YOUR_EXTERNAL_PAYMENT_API_KEY
Content-Type: application/json
```

```json
{
  "orderId": "ORDER-2026-001",
  "amount": 15000,
  "customerName": "Customer Name",
  "customerEmail": "customer@example.com",
  "customerPhone": "255712345678",
  "description": "Order 2026-001"
}
```

`amount` is an integer in TZS. `orderId` must be unique per merchant. Never reuse an order ID for a new payment.

A successful response can contain:

```json
{
  "data": {
    "paymentUrl": "https://provider.example/payment/123",
    "paymentMessage": "Payment prompt sent"
  }
}
```

- If `paymentUrl` is present, redirect the customer to it.
- If PalmPesa sends a mobile-money prompt instead, show `paymentMessage` and poll the status endpoint from the merchant backend.
- Do not submit the merchant API key from a browser.

## 4. Check payment status

```http
GET /api/integration/payments/ORDER-2026-001
Authorization: Bearer YOUR_EXTERNAL_PAYMENT_API_KEY
```

Possible statuses are `pending`, `completed`, and `failed`. Only `completed` is proof of payment. Do not treat a browser redirect or an API response that merely created a checkout as payment confirmation.

Polling should use a bounded interval and stop after a maximum lifetime. A completed status can be confirmed once and then persisted in the merchant system.

## 5. Merchant webhook

The provider callback is handled automatically at `/api/payment/webhook`. The server validates the PalmPesa signature and amount, then forwards a signed event to `EXTERNAL_PAYMENT_WEBHOOK_URL`.

Your callback receives a JSON body such as:

```json
{
  "event": "payment.completed",
  "data": {
    "orderId": "ORDER-2026-001",
    "paymentId": "...",
    "amount": 15000,
    "currency": "TZS",
    "status": "completed",
    "completedAt": "2026-10-25T12:00:00.000Z"
  }
}
```

Verify `X-Payment-Signature` using the exact raw request body:

1. Build `sha256=` plus the lowercase hexadecimal HMAC-SHA256 of the exact raw body.
2. Use the generated external webhook secret as the HMAC key.
3. Compare the complete string with timing-safe comparison.
4. Reject missing or invalid signatures before processing the event.
5. Use `X-Payment-Event-Id` to deduplicate events.
6. Validate `orderId`, `amount`, and `currency` against the merchant order.
7. Return a `2xx` response only after the event is accepted for processing.

Example Node.js handler:

```javascript
const crypto = require('crypto');
const express = require('express');

const app = express();
app.post('/payment/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const expected = 'sha256=' + crypto
        .createHmac('sha256', process.env.EXTERNAL_PAYMENT_WEBHOOK_SECRET)
        .update(req.body)
        .digest('hex');
    const provided = req.get('X-Payment-Signature') || '';

    if (provided.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
        return res.sendStatus(401);
    }

    const event = JSON.parse(req.body.toString('utf8'));
    // Persist event.id/ X-Payment-Event-Id first to make delivery deduplicated.
    // Validate event.data against the local order, then mark it completed.
    return res.sendStatus(204);
});
```

`EXTERNAL_PAYMENT_WEBHOOK_SECRET` in this example is the secret shown by credential rotation. It must be kept in the merchant backend and must not be exposed to the browser.

## 6. WhatsApp `requestpay` command

The `.requestpay` command sends a checkout request from the server and then delivers the payment link or message to the specified customer.

```text
.requestpay 255712345678
.requestpay 1000
.requestpay info
```

- The phone argument must use Tanzania's `255` format.
- Changing the amount requires owner or sudo authorization.
- The amount is stored in `data/requestpay.json`.
- `PAYMENT_CONFIG.maxTzs` controls the maximum amount accepted by the command.
- `PAYMENT_CONFIG.externalApiKey` contains the external merchant API key.

If the command reports that `EXTERNAL_PAYMENT_API_KEY` is missing, add the key to `PAYMENT_CONFIG.externalApiKey` in `config.js`, then restart or redeploy the application. When rotating a key, replace the value in `config.js` and retain no old key in repository history.

## 7. Browser integration

The merchant browser submits an order to the merchant backend. The backend calls the external payment API, and the backend returns only the safe `paymentUrl` to the browser:

```text
Browser -> merchant backend -> payment API
Browser <- merchant backend (paymentUrl only)
```

Never return or expose:

- `EXTERNAL_PAYMENT_API_KEY`
- `PALMPESA_API_TOKEN`
- `PALMPESA_USER_ID`
- `PALMPESA_WEBHOOK_SECRET`
- `PAYMENT_CREDENTIAL_ENCRYPTION_KEY`

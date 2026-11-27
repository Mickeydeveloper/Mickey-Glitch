/**
 * @project: MICKEY GLITCH V3.0.5
 * @command: sms
 * @description: Full self-contained SMS command via SMSTAPSA API with 30-credit system & owner credit top-up.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const settings = require('../settings');

let isOwnerOrSudo = null;
try {
    isOwnerOrSudo = require('../lib/isOwner');
} catch (_) {
    try {
        isOwnerOrSudo = require('./isOwner');
    } catch (_) {}
}

let getSudoList = null;
try {
    ({ getSudoList } = require('../lib/index'));
} catch (_) {}

try {
    require('dotenv').config({ path: path.join(process.cwd(), '.env') });
} catch (_) {}

// ─── ──────────────────────────────────────────────────────────────────────
// 1. CONSTANTS, KEYS & STORAGE
// ─── ──────────────────────────────────────────────────────────────────────

const SMS_COST_CREDITS = 30;
const DEFAULT_SENDER_ID = 'MICKEY';
const API_BASE_URL = (process.env.SMSTAPSA_BASE_URL || 'https://api.smstapsa.my.id').replace(/\/+$/, '');

const DATA_DIR = path.join(process.cwd(), 'data');
const CREDITS_FILE = path.join(DATA_DIR, 'sms_credits.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadCreditsStore() {
    try {
        if (!fs.existsSync(CREDITS_FILE)) {
            fs.writeFileSync(CREDITS_FILE, JSON.stringify({ users: {} }, null, 2), 'utf8');
            return { users: {} };
        }
        const raw = fs.readFileSync(CREDITS_FILE, 'utf8');
        const parsed = JSON.parse(raw || '{}');
        if (!parsed.users || typeof parsed.users !== 'object') parsed.users = {};
        return parsed;
    } catch (err) {
        console.error('[SMS] Failed to load credits store:', err?.message || err);
        return { users: {} };
    }
}

function saveCreditsStore(store) {
    fs.writeFileSync(CREDITS_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function normalizePhone(raw) {
    if (!raw) return '';
    return String(raw)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');
}

function formatTzNumber(raw) {
    const digits = normalizePhone(raw);
    if (!digits) return '';
    if (digits.startsWith('255') && digits.length >= 12) return digits;
    if (digits.startsWith('0') && digits.length === 10) return '255' + digits.slice(1);
    if ((digits.startsWith('7') || digits.startsWith('6')) && digits.length === 9) return '255' + digits;
    return digits;
}

function getUserCredits(userKey) {
    const cleanKey = normalizePhone(userKey);
    if (!cleanKey) return 0;
    const store = loadCreditsStore();
    const val = Number(store.users[cleanKey] ?? 0);
    return Number.isFinite(val) ? Math.max(0, Math.floor(val)) : 0;
}

function setUserCredits(userKey, amount) {
    const cleanKey = normalizePhone(userKey);
    if (!cleanKey) throw new Error('Namba ya mtumiaji si sahihi.');
    const safeAmount = Math.max(0, Math.floor(Number(amount)));
    const store = loadCreditsStore();
    store.users[cleanKey] = safeAmount;
    saveCreditsStore(store);
    return safeAmount;
}

function addUserCredits(userKey, delta) {
    const current = getUserCredits(userKey);
    const next = Math.max(0, current + Math.floor(Number(delta)));
    return setUserCredits(userKey, next);
}

function deductUserCredits(userKey, amount) {
    const current = getUserCredits(userKey);
    const cost = Math.floor(Number(amount));
    if (current < cost) {
        return { ok: false, remaining: current };
    }
    const next = current - cost;
    setUserCredits(userKey, next);
    return { ok: true, remaining: next };
}

// ─── ──────────────────────────────────────────────────────────────────────
// 2. OWNER & Sudo CHECK
// ─── ──────────────────────────────────────────────────────────────────────

async function checkIsOwnerOrSudo(sock, chatId, senderId, message) {
    if (message?.key?.fromMe) return true;

    const candidates = new Set();
    const addCandidate = (v) => {
        const n = normalizePhone(v);
        if (n) candidates.add(n);
    };

    addCandidate(senderId);
    addCandidate(message?.key?.participant);
    addCandidate(message?.key?.remoteJid);
    addCandidate(message?.key?.participantAlt);
    addCandidate(message?.key?.remoteJidAlt);
    addCandidate(message?.participant);
    addCandidate(message?.sender);

    if (typeof sock?.signalRepository?.lidMapping?.getPNForLID === 'function') {
        for (const rawId of [senderId, message?.key?.participant, message?.key?.remoteJid].filter(Boolean)) {
            if (String(rawId).endsWith('@lid')) {
                try {
                    const pn = await sock.signalRepository.lidMapping.getPNForLID(rawId);
                    addCandidate(pn);
                } catch (_) {}
            }
        }
    }

    const ownerList = [
        process.env.OWNER_NUMBER,
        process.env.BOT_NUMBER,
        settings?.ownerNumber,
        settings?.botNumber,
        global?.ownerNumber,
        global?.botNumber,
    ];
    ownerList.forEach(addCandidate);

    if (typeof getSudoList === 'function') {
        try {
            const sudoArr = await getSudoList();
            if (Array.isArray(sudoArr)) sudoArr.forEach(addCandidate);
        } catch (_) {}
    }

    for (const num of candidates) {
        if (ownerList.some((o) => normalizePhone(o) && normalizePhone(o) === num)) {
            return true;
        }
    }

    if (typeof isOwnerOrSudo === 'function') {
        try {
            const res = await isOwnerOrSudo(senderId, sock, chatId);
            if (res) return true;
        } catch (_) {}
    }

    return false;
}

async function resolveSenderPhone(sock, senderId, message) {
    const rawIds = [
        senderId,
        message?.key?.participant,
        message?.key?.remoteJid,
        message?.key?.participantAlt,
        message?.key?.remoteJidAlt,
        message?.participant,
        message?.sender,
    ].filter((v) => typeof v === 'string' && v.trim());

    for (const id of rawIds) {
        if (!id.endsWith('@lid') && !id.endsWith('@g.us')) {
            const num = normalizePhone(id);
            if (num) return num;
        }
    }

    if (typeof sock?.signalRepository?.lidMapping?.getPNForLID === 'function') {
        for (const id of rawIds) {
            if (id.endsWith('@lid')) {
                try {
                    const pn = await sock.signalRepository.lidMapping.getPNForLID(id);
                    const num = normalizePhone(pn);
                    if (num) return num;
                } catch (_) {}
            }
        }
    }

    return normalizePhone(rawIds[0] || '');
}

function extractTargetUserKey(rawTarget, message) {
    const mentioned = message?.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (Array.isArray(mentioned) && mentioned.length > 0) {
        return normalizePhone(mentioned[0]);
    }
    const quotedParticipant = message?.message?.extendedTextMessage?.contextInfo?.participant;
    if (!rawTarget && quotedParticipant) {
        return normalizePhone(quotedParticipant);
    }
    return normalizePhone(rawTarget);
}

// ─── ──────────────────────────────────────────────────────────────────────
// 3. SMSTAPSA API CLIENT
// ─── ──────────────────────────────────────────────────────────────────────

function getTapsaConfig() {
    const apiKey = (
        process.env.SMSTAPSA_API_KEY ||
        process.env.TAPSA_API_KEY ||
        settings?.smstapsaApiKey ||
        ''
    ).trim();

    const senderId = (
        process.env.SMSTAPSA_SENDER_ID ||
        process.env.SENDER_ID ||
        process.env.TAPSA_SENDER_ID ||
        settings?.senderId ||
        DEFAULT_SENDER_ID
    ).trim();

    return { apiKey, senderId };
}

async function sendTapsaSms({ phoneNumber, smsText, senderId, apiKey }) {
    if (!apiKey) {
        throw new Error('SMSTAPSA_API_KEY haijapatikana.');
    }

    const bodyPayload = {
        phoneNumbers: [phoneNumber],
        message: smsText,
    };
    if (senderId) {
        bodyPayload.senderId = senderId;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    try {
        const res = await fetch(`${API_BASE_URL}/v1/sms/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
            },
            body: JSON.stringify(bodyPayload),
            signal: controller.signal,
        });

        let data = {};
        try {
            data = await res.json();
        } catch (_) {
            data = {};
        }

        if (!res.ok || data?.success === false) {
            const msg = data?.message || `HTTP ${res.status} - Imeshindwa kutuma SMS.`;
            const err = new Error(msg);
            err.statusCode = res.status;
            err.apiResponse = data;
            throw err;
        }

        return data;
    } finally {
        clearTimeout(timer);
    }
}

async function fetchTapsaBalance(apiKey) {
    if (!apiKey) throw new Error('SMSTAPSA_API_KEY haijapatikana.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
        const res = await fetch(`${API_BASE_URL}/v1/account/balance`, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
            },
            signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.success === false) {
            throw new Error(data?.message || `HTTP ${res.status}`);
        }
        return data;
    } finally {
        clearTimeout(timer);
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 4. MAIN COMMAND HANDLER
// ─── ──────────────────────────────────────────────────────────────────────

function extractMessageText(message, textArg) {
    if (typeof textArg === 'string' && textArg.trim()) return textArg.trim();
    if (Array.isArray(textArg) && textArg.length > 0) return textArg.join(' ').trim();
    const m = message?.message || {};
    return (
        m.conversation ||
        m.extendedTextMessage?.text ||
        m.imageMessage?.caption ||
        m.videoMessage?.caption ||
        ''
    ).trim();
}

async function smsCommand(sock, chatId, senderId, text, message, extraArgs) {
    // Support ikiwa bot inapitisha (sock, chatId, message, args)
    if (chatId && typeof chatId === 'object' && chatId.key && !message) {
        const actualMsg = chatId;
        const actualSock = sock;
        const actualChatId = actualMsg.key.remoteJid;
        const actualSender = actualMsg.key.participant || actualMsg.key.remoteJid;
        const actualText = Array.isArray(senderId)
            ? ['.sms', ...senderId].join(' ')
            : (typeof senderId === 'string' ? senderId : extractMessageText(actualMsg));
        return smsCommand(actualSock, actualChatId, actualSender, actualText, actualMsg);
    }

    // Standard command loader: (sock, chatId, message, args, options)
    if (senderId && typeof senderId === 'object' && senderId.key) {
        const actualMsg = senderId;
        const options = message && typeof message === 'object' && !message.key ? message : {};
        const actualArgs = Array.isArray(text)
            ? text
            : (typeof text === 'string' ? text.trim().split(/\s+/).filter(Boolean) : []);
        const actualSender = options.senderId || actualMsg.key.participant || actualMsg.key.remoteJid || '';
        return smsCommand(
            sock,
            chatId || actualMsg.key.remoteJid,
            actualSender,
            actualArgs,
            actualMsg
        );
    }

    const effectiveMsg = message || (senderId && typeof senderId === 'object' && senderId.key ? senderId : null);
    const effectiveSender = typeof senderId === 'string'
        ? senderId
        : (effectiveMsg?.key?.participant || effectiveMsg?.key?.remoteJid || '');

    let combinedText = extractMessageText(effectiveMsg, text);
    if (Array.isArray(extraArgs) && extraArgs.length > 0) {
        combinedText = `${combinedText} ${extraArgs.join(' ')}`.trim();
    }

    const reply = (txt) => {
        if (!sock || !chatId) return Promise.resolve();
        return sock.sendMessage(chatId, { text: txt }, effectiveMsg ? { quoted: effectiveMsg } : {});
    };

    try {
        console.log('[SMS] Triggered:', { chatId, sender: effectiveSender, raw: combinedText });

        const cleanBody = String(combinedText || '').replace(/^\.?sms\b/i, '').trim();
        const senderPhone = await resolveSenderPhone(sock, effectiveSender, effectiveMsg);
        const isOwner = await checkIsOwnerOrSudo(sock, chatId, effectiveSender, effectiveMsg);
        const { apiKey, senderId: envSenderId } = getTapsaConfig();

        if (!cleanBody || /^(help|\?)$/i.test(cleanBody)) {
            const currentBal = getUserCredits(senderPhone);
            return reply(
                `📩 *MICKEY GLITCH SMS (SMSTAPSA)*\n\n` +
                `• *Gharama:* *${SMS_COST_CREDITS} credits* kwa SMS 1\n` +
                `• *Credits zako:* *${currentBal}* (${Math.floor(currentBal / SMS_COST_CREDITS)} SMS)\n` +
                `• *Sender ID:* *${envSenderId || 'MICKEY'}*\n\n` +
                `*Matumizi:*\n` +
                `• *.sms <namba> <ujumbe>*\n` +
                `  Mfano: _.sms 255612130873 Habari yako_\n` +
                `• *.sms balance* — Angalia credits zako\n` +
                (isOwner
                    ? `\n*Amri za Owner / Bot Number:*\n` +
                      `• *.sms addcredit <namba|@tag> <credits>* — Ongeza credits\n` +
                      `• *.sms setcredit <namba|@tag> <credits>* — Weka kiasi maalum cha credits\n` +
                      `• *.sms apibal* — Angalia salio la akaunti ya SMSTAPSA`
                    : '')
            );
        }

        if (/^(bal|balance|credit|credits)$/i.test(cleanBody)) {
            const bal = getUserCredits(senderPhone);
            return reply(
                `💳 *SALIO LA CREDITS*\n\n` +
                `• *Akaunti:* ${senderPhone || 'Haijatambulika'}\n` +
                `• *Credits ulizonazo:* *${bal}*\n` +
                `• *Uwezo wa kutuma:* *${Math.floor(bal / SMS_COST_CREDITS)} SMS* (${SMS_COST_CREDITS} credits / SMS)`
            );
        }

        if (/^apibal$/i.test(cleanBody)) {
            if (!isOwner) {
                return reply('❌ Amri hii ni ya *Bot Owner / Sudo* pekee.');
            }
            const balData = await fetchTapsaBalance(apiKey);
            return reply(
                `🏦 *SMSTAPSA API BALANCE*\n\n` +
                `• *Balance:* ${balData.balance ?? 0} ${balData.currency || 'TZS'}\n` +
                `• *Plan:* ${balData.planId || '-'}\n` +
                `• *Rate:* ${balData.smsRate ?? '-'} ${balData.currency || 'TZS'}/SMS`
            );
        }

        const addMatch = cleanBody.match(/^addcredit\s+(\S+)\s+(-?\d+)$/i);
        if (addMatch) {
            if (!isOwner) {
                return reply('❌ *Bot Owner / Bot Number* pekee ndiye anayeweza kuongeza credits.');
            }
            const targetKey = extractTargetUserKey(addMatch[1], effectiveMsg);
            const delta = parseInt(addMatch[2], 10);
            if (!targetKey) {
                return reply('❌ Namba ya mlengwa haieleweki. Mfano: *.sms addcredit 255612130873 300*');
            }
            if (!Number.isInteger(delta) || delta === 0) {
                return reply('❌ Kiasi cha credits lazima kiwe namba kamili isiyo sifuri.');
            }
            const newBalance = addUserCredits(targetKey, delta);
            return reply(
                `✅ *CREDITS ZIMESASISHWA*\n\n` +
                `• *Mtumiaji:* ${targetKey}\n` +
                `• *Mabadiliko:* ${delta > 0 ? `+${delta}` : delta} credits\n` +
                `• *Salio jipya:* *${newBalance} credits* (${Math.floor(newBalance / SMS_COST_CREDITS)} SMS)`
            );
        }

        const setMatch = cleanBody.match(/^setcredit\s+(\S+)\s+(\d+)$/i);
        if (setMatch) {
            if (!isOwner) {
                return reply('❌ *Bot Owner / Bot Number* pekee ndiye anayeweza kuweka credits.');
            }
            const targetKey = extractTargetUserKey(setMatch[1], effectiveMsg);
            const amount = parseInt(setMatch[2], 10);
            if (!targetKey || !Number.isInteger(amount) || amount < 0) {
                return reply('❌ Mfano sahihi: *.sms setcredit 255612130873 300*');
            }
            const saved = setUserCredits(targetKey, amount);
            return reply(
                `✅ *SALIO LIMEWEKWA*\n\n` +
                `• *Mtumiaji:* ${targetKey}\n` +
                `• *Credits mpya:* *${saved} credits* (${Math.floor(saved / SMS_COST_CREDITS)} SMS)`
            );
        }

        const parts = cleanBody.match(/^(\+?\d[\d\s\-]{6,16})\s+([\s\S]+)$/);
        if (!parts) {
            return reply(
                `❌ Muundo si sahihi.\n` +
                `Tumia: *.sms 255612130873 Habari yako*\n` +
                `Au andika *.sms help* kuona maelekezo yote.`
            );
        }

        const recipientFormatted = formatTzNumber(parts[1]);
        const smsMessage = parts[2].trim();

        if (!recipientFormatted || recipientFormatted.length < 9) {
            return reply('❌ Namba ya simu si sahihi. Tumia mfumo kama *255612130873* au *0712345678*.');
        }
        if (!smsMessage) {
            return reply('❌ Tafadhali weka ujumbe wa kutuma kwenye SMS.');
        }
        if (smsMessage.length > 160) {
            return reply(
                `❌ Ujumbe ni mrefu sana (*${smsMessage.length}/160* herufi). Urefu wa juu wa SMS moja ni *160* herufi.`
            );
        }

        const creditAccountKey = senderPhone || normalizePhone(effectiveSender);
        const currentCredits = getUserCredits(creditAccountKey);

        if (currentCredits < SMS_COST_CREDITS) {
            return reply(
                `❌ *CREDITS HAZITOSHI*\n\n` +
                `• *Inahitajika:* *${SMS_COST_CREDITS} credits* kwa SMS 1\n` +
                `• *Ulizonazo:* *${currentCredits} credits*\n\n` +
                `Wasiliana na *Bot Owner* akuongezee credits (mfano: _.sms addcredit ${creditAccountKey || 'namba'} 300_).`
            );
        }

        try {
            await sock.sendPresenceUpdate('composing', chatId);
            if (effectiveMsg?.key) {
                await sock.sendMessage(chatId, { react: { text: '⏳', key: effectiveMsg.key } });
            }
        } catch (_) {}

        const apiResult = await sendTapsaSms({
            phoneNumber: recipientFormatted,
            smsText: smsMessage,
            senderId: envSenderId,
            apiKey,
        });

        const firstRecipient = Array.isArray(apiResult?.recipients) ? apiResult.recipients[0] : null;
        const deliveryStatus = firstRecipient?.status || apiResult?.status || 'Success';
        const isDelivered = !firstRecipient || /success|delivered|queued|pending|sent|accepted/i.test(String(deliveryStatus));

        if (!isDelivered) {
            return reply(
                `⚠️ SMS haikutumwa kwa *+${recipientFormatted}* (Status: *${deliveryStatus}*).\n` +
                `Credits zako (*${currentCredits}*) hazijakatwa.`
            );
        }

        const deduction = deductUserCredits(creditAccountKey, SMS_COST_CREDITS);
        const msgId = firstRecipient?.messageId ? `\n• *Message ID:* \`${firstRecipient.messageId}\`` : '';
        const usedSender = apiResult?.senderId || envSenderId || 'MICKEY';

        try {
            if (effectiveMsg?.key) {
                await sock.sendMessage(chatId, { react: { text: '✅', key: effectiveMsg.key } });
            }
        } catch (_) {}

        return reply(
            `✅ *SMS IMEKUBALIWA NA API*\n\n` +
            `• *Kwa:* +${recipientFormatted}\n` +
            `• *Status:* ${deliveryStatus}\n` +
            `• *Sender ID:* ${usedSender}\n` +
            `• *Ujumbe:* ${smsMessage}\n` +
            `• *Credits zilizokatwa:* -${SMS_COST_CREDITS} credits\n` +
            `• *Credits zilizobaki:* *${deduction.remaining} credits*${msgId}`
        );
    } catch (error) {
        console.error('[SMS COMMAND ERROR]:', error?.stack || error);
        try {
            if (effectiveMsg?.key) {
                await sock.sendMessage(chatId, { react: { text: '❌', key: effectiveMsg.key } });
            }
        } catch (_) {}

        const statusInfo = error?.statusCode ? ` (HTTP ${error.statusCode})` : '';
        return reply(
            `❌ *Imeshindikana kutuma SMS${statusInfo}*\n` +
            `📝 *Sababu:* ${error?.message || error}`
        );
    }
}

module.exports = {
    name: 'sms',
    command: ['sms', 'sendsms', 'text'],
    aliases: ['sendsms', 'text'],
    category: 'TOOLS',
    description: 'Tuma SMS kupitia SMSTAPSA kwa mfumo wa credits (30 credits / SMS)',
    code: async (ctx) => smsCommand(
        ctx.sock,
        ctx.chatId,
        ctx.senderId,
        ctx.args,
        ctx.msg
    ),
};

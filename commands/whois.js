/**
 * truecaller.js - Fixed & Stylish Version
 */

const fs = require('fs');
const path = require('path');
const truecallerjs = require('truecallerjs');

const dataDir = path.join(__dirname, '../data');
const truecallerFile = path.join(dataDir, 'truecaller.json');

let installationId = null;
const setupState = new Map();

// Load Installation ID
if (fs.existsSync(truecallerFile)) {
    try {
        const data = JSON.parse(fs.readFileSync(truecallerFile, 'utf8'));
        installationId = data.installationId;
    } catch (e) {
        console.error("Failed to load Truecaller config:", e);
    }
}

// ==================== SETUP COMMAND ====================
async function setupTruecallerId(sock, chatId, message) {
    const userId = message.key.participant || message.key.remoteJid;
    setupState.set(userId, { step: "WAITING_NUMBER" });

    await sock.sendMessage(chatId, {
        text: `╭━━━〔 *TRUECALLER SETUP* 〕━━━┈⊷\n┃\n┃ 📱 *Tuma namba yako ya simu*\n┃ 💡 *Format:* \`+255712345678\`\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷`
    }, { quoted: message });
}

// ==================== WHOIS / SEARCH COMMAND ====================
async function whoisCommand(sock, chatId, message, args) {
    if (!installationId) {
        return sock.sendMessage(chatId, {
            text: '❌ *Truecaller bado haijawekwa.*\nTumia `.setuptruecaller` kwanza!'
        }, { quoted: message });
    }

    const query = typeof args === 'string' ? args.trim() : "";
    if (!query) {
        return sock.sendMessage(chatId, { text: '⚠️ *Usage:* `.whois +255712345678`' }, { quoted: message });
    }

    let phone = query.replace(/[^0-9+]/g, '');
    if (!phone.startsWith('+')) phone = '+' + phone;

    await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } }).catch(() => {});

    try {
        const searchData = {
            number: phone,
            installationId: installationId
        };

        // Kwenye library mpya, tunatumia search.bulkSearch au search.searchNumber
        const response = await truecallerjs.search(searchData);
        
        // Fix: Truecallerjs wakati mwingine inarudisha data tofauti
        const info = response.json ? response.json() : response;

        // Ikiwa ni array au imefeli
        const user = Array.isArray(info) ? info[0] : (info.data ? info.data[0] : info);

        if (!user || (!user.name && !user.phoneNumber)) {
            return sock.sendMessage(chatId, { text: `❌ *Hakuna taarifa za namba:* \`${phone}\`` }, { quoted: message });
        }

        const resultText = 
            `╭━━━━〔 *TRUECALLER* 〕━━━━┈⊷\n` +
            `┃\n` +
            `┃ 👤 *Name:* \`${user.name || 'Unknown'}\`\n` +
            `┃ 📱 *Number:* \`${user.phoneNumber || phone}\`\n` +
            `┃ 🏙️ *City:* \`${user.city || 'Private'}\`\n` +
            `┃ 🏢 *Carrier:* \`${user.carrier || 'Unknown'}\`\n` +
            `┃ ✉️ *Email:* \`${user.email || 'None'}\`\n` +
            `┃ 📌 *Spam:* \`${user.spamScore || 0}\`\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

        await sock.sendMessage(chatId, { text: resultText }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (error) {
        console.error('Truecaller Error:', error);
        await sock.sendMessage(chatId, { text: `❌ *Error:* \`${error.message}\`` }, { quoted: message });
    }
}

// ==================== SETUP MESSAGE HANDLER ====================
async function handleTruecallerSetup(sock, chatId, message) {
    const userId = message.key.participant || message.key.remoteJid;
    const text = (message.message?.conversation || 
                  message.message?.extendedTextMessage?.text || "").trim();

    const state = setupState.get(userId);
    if (!state) return false;

    try {
        if (state.step === "WAITING_NUMBER") {
            let phone = text.replace(/[^0-9+]/g, '');
            if (!phone.startsWith('+')) phone = '+' + phone;

            state.phone = phone;
            state.step = "WAITING_OTP";

            await sock.sendMessage(chatId, { text: `🔄 *Inatuma OTP kwa:* \`${phone}\`...` });
            
            const loginRes = await truecallerjs.login(phone);
            // Kwenye library baadhi inatumia requestId, nyingine token
            state.requestId = loginRes.requestId || loginRes.token;

            await sock.sendMessage(chatId, { text: `📨 *OTP imetumwa!*\nTuma namba za OTP hapa sasa.` });
            return true;
        }

        if (state.step === "WAITING_OTP") {
            const otp = text.replace(/[^0-9]/g, '');
            await sock.sendMessage(chatId, { text: "🔄 *Inathibitisha...*" });

            const verifyRes = await truecallerjs.verifyOtp(state.phone, otp, state.requestId);

            if (verifyRes?.installationId) {
                installationId = verifyRes.installationId;
                if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
                fs.writeFileSync(truecallerFile, JSON.stringify({ installationId }, null, 2));

                await sock.sendMessage(chatId, { text: "🎉 *SUCCESS!*\nTruecaller sasa ipo tayari.\nTumia: `.whois [namba]`" });
                setupState.delete(userId);
            } else {
                throw new Error("Invalid OTP");
            }
            return true;
        }
    } catch (e) {
        await sock.sendMessage(chatId, { text: `❌ *Fails:* ${e.message}` });
        setupState.delete(userId);
        return true;
    }
    return false;
}

module.exports = { setupTruecallerId, whoisCommand, handleTruecallerSetup };

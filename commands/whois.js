/**
 * truecaller.js
 * Truecaller integration - Search phone number details
 */

const fs = require('fs');
const path = require('path');
const truecallerjs = require('truecallerjs');

const dataDir = path.join(__dirname, '../data');
const truecallerFile = path.join(dataDir, 'truecaller.json');

let installationId = null;
const setupState = new Map(); // userId → setup data

// Load Installation ID
if (fs.existsSync(truecallerFile)) {
    try {
        const data = JSON.parse(fs.readFileSync(truecallerFile, 'utf8'));
        installationId = data.installationId;
        console.log("✅ Truecaller Installation ID imepakiwa successfully.");
    } catch (e) {
        console.error("Failed to load Truecaller config:", e);
    }
}

// ==================== SETUP COMMAND ====================
async function setupTruecallerId(sock, chatId, message) {
    const userId = message.key.participant || message.key.remoteJid;

    setupState.set(userId, { step: "WAITING_NUMBER" });

    await sock.sendMessage(chatId, {
        text: `🔄 *TRUECALLER SETUP*\n\n` +
              `Tuma namba yako ya simu kwa format ya kimataifa:\n\n` +
              `Mfano: *+255712345678*`
    }, { quoted: message });
}

// ==================== WHOIS / SEARCH COMMAND ====================
async function whoisCommand(sock, chatId, message, args) {
    if (!installationId) {
        return sock.sendMessage(chatId, {
            text: '*_❌ Truecaller bado haijawekwa.\nTumia .setuptruecaller kwanza!_*'
        }, { quoted: message });
    }

    const query = args.trim();
    if (!query) {
        return sock.sendMessage(chatId, {
            text: '*_⚠️ Tumia: .whois +255712345678_*'
        }, { quoted: message });
    }

    // Clean number
    let phone = query.replace(/[^0-9+]/g, '');
    if (!phone.startsWith('+')) phone = '+' + phone;

    if (phone.length < 10) {
        return sock.sendMessage(chatId, { text: '*_❌ Namba si sahihi._*' }, { quoted: message });
    }

    await sock.sendMessage(chatId, { text: `🔍 *Inatafuta taarifa za namba...*\n${phone}` }, { quoted: message });

    try {
        const searchData = {
            number: phone,
            countryCode: "TZ",           // Badilisha kama unataka nchi nyingine (KE, UG, etc)
            installationId: installationId
        };

        const response = await truecallerjs.search(searchData);

        if (!response || !response.json) {
            throw new Error("Hakuna response kutoka Truecaller");
        }

        const data = response.json();

        if (!data || data.length === 0) {
            return sock.sendMessage(chatId, {
                text: `❌ Hakuna taarifa zilizopatikana kwa namba *${phone}*`
            }, { quoted: message });
        }

        const info = data[0]; // First result

        let resultText = `✅ *TRUECALLER RESULTS*\n\n`;
        resultText += `📱 *Namba:* ${info.phoneNumber || phone}\n`;
        resultText += `👤 *Jina:* ${info.name || 'Hakuna'}\n`;
        resultText += `🏙️ *Mji:* ${info.city || 'Hakuna'}\n`;
        resultText += `🌍 *Nchi:* ${info.countryCode || 'TZ'}\n`;
        resultText += `🏢 *Carrier:* ${info.carrier || 'Hakuna'}\n`;
        resultText += `📌 *Spam Score:* ${info.spamScore || 0}\n`;

        if (info.email) resultText += `✉️ *Email:* ${info.email}\n`;
        if (info.jobTitle) resultText += `💼 *Kazi:* ${info.jobTitle}\n`;

        resultText += `\n⏰ *Iliyopatikana:* ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam' })}`;

        await sock.sendMessage(chatId, { text: resultText }, { quoted: message });

    } catch (error) {
        console.error('Truecaller search error:', error);
        await sock.sendMessage(chatId, {
            text: `❌ *Imeshindwa kupata taarifa*\n\nSababu: ${error.message || 'Jaribu tena baadaye.'}`
        }, { quoted: message });
    }
}

// ==================== SETUP MESSAGE HANDLER ====================
async function handleTruecallerSetup(sock, chatId, message) {
    const userId = message.key.participant || message.key.remoteJid;
    const text = (message.message?.conversation || 
                  message.message?.extendedTextMessage?.text || "").trim();

    const state = setupState.get(userId);
    if (!state) return false;

    if (state.step === "WAITING_NUMBER") {
        let phone = text.replace(/[^0-9+]/g, '');
        if (!phone.startsWith('+')) phone = '+' + phone;

        if (phone.length < 11) {
            await sock.sendMessage(chatId, { 
                text: "❌ Namba si sahihi. Tuma namba kamili (e.g +255712345678)" 
            });
            return true;
        }

        state.phone = phone;
        state.step = "WAITING_OTP";

        await sock.sendMessage(chatId, { 
            text: `✅ *Namba imepokelewa:* ${phone}\n\nInatuma OTP... Subiri kidogo.` 
        });

        try {
            const loginResponse = await truecallerjs.login(phone);
            state.requestId = loginResponse.requestId || loginResponse.token;

            await sock.sendMessage(chatId, {
                text: `📨 *OTP imetumwa kwa ${phone}*\n\nBaada ya kuipokea, tuma OTP hapa (nambari 4-6 tu)`
            });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(chatId, { text: "❌ Imeshindwa kutuma OTP. Jaribu tena." });
            setupState.delete(userId);
        }
        return true;
    }

    else if (state.step === "WAITING_OTP") {
        const otp = text.replace(/[^0-9]/g, '');

        if (otp.length < 4) {
            await sock.sendMessage(chatId, { text: "❌ OTP inapaswa kuwa nambari tu." });
            return true;
        }

        await sock.sendMessage(chatId, { text: "🔄 *Inathibitisha OTP...*" });

        try {
            const verifyResponse = await truecallerjs.verifyOtp(state.phone, otp, state.requestId);

            if (verifyResponse?.installationId) {
                installationId = verifyResponse.installationId;

                if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
                fs.writeFileSync(truecallerFile, JSON.stringify({ installationId }, null, 2));

                await sock.sendMessage(chatId, {
                    text: `🎉 *IMEFANIKIWA KABISA!*\n\nTruecaller Installation ID imewekwa.\n\nSasa unaweza kutumia:\n*.whois +255712345678*`
                });

                setupState.delete(userId);
            } else {
                await sock.sendMessage(chatId, { text: "❌ OTP si sahihi au imekwisha muda. Jaribu tena." });
            }
        } catch (err) {
            console.error("Verify OTP Error:", err);
            await sock.sendMessage(chatId, { text: "❌ Hitilafu wakati wa kuthibitisha OTP. Jaribu tena." });
            setupState.delete(userId);
        }
        return true;
    }

    return false;
}

module.exports = {
    setupTruecallerId,
    whoisCommand,
    handleTruecallerSetup
};
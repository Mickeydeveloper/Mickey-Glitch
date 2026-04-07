const truecallerjs = require('truecallerjs');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const truecallerFile = path.join(dataDir, 'truecaller.json');

let installationId = null;
let setupState = new Map(); // Hifadhi state ya kila user (phoneNumber, step)

// Load saved ID
if (fs.existsSync(truecallerFile)) {
    try {
        const data = JSON.parse(fs.readFileSync(truecallerFile, 'utf8'));
        installationId = data.installationId;
        console.log("✅ Truecaller Installation ID imepakiwa");
    } catch (e) {}
}

// ==================== SETUP COMMAND ====================
async function setupTruecallerId(sock, chatId, message) {
    const userId = message.key.participant || message.key.remoteJid;

    setupState.set(userId, { step: "WAITING_NUMBER" });

    await sock.sendMessage(chatId, {
        text: `🔄 *TRUECALLER SETUP INAANZA*\n\nTafadhali tuma namba yako ya simu kwa international format:\n\nMfano: *+255712345678*`
    }, { quoted: message });
}

// ==================== WHOIS COMMAND ====================
async function whoisCommand(sock, chatId, message, args) {
    // ... (nitaweka code iliyoboreshwa ya whois kama hapo awali)
    // (Nitakupa full whois baadaye, sasa nazingatia setup)
}

// ==================== MAIN MESSAGE HANDLER (IMPORTANT) ====================
// Weka hii function kwenye main bot file yako (handler wa messages)
async function handleTruecallerSetup(sock, chatId, message) {
    const userId = message.key.participant || message.key.remoteJid;
    const text = (message.message?.conversation || message.message?.extendedTextMessage?.text || "").trim();
    const state = setupState.get(userId);

    if (!state) return false; // Sio katika setup mode

    if (state.step === "WAITING_NUMBER") {
        let phone = text.replace(/[^0-9+]/g, '');
        if (!phone.startsWith('+')) phone = '+' + phone;

        if (phone.length < 10) {
            return sock.sendMessage(chatId, { text: "❌ Namba si sahihi. Jaribu tena (e.g +255712345678)" });
        }

        state.phone = phone;
        state.step = "WAITING_OTP";

        await sock.sendMessage(chatId, { text: `✅ *Namba imepokelewa:* ${phone}\n\nInatuma OTP... Subiri kidogo.` });

        try {
            const loginResponse = await truecallerjs.login(phone);
            state.requestId = loginResponse.requestId; // Au kulingana na response

            await sock.sendMessage(chatId, {
                text: `📨 *OTP imetumwa kwa namba ${phone}*\n\nBaada ya kuipokea, tuma hapa OTP (nambari 6 au 4 tu)`
            });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(chatId, { text: "❌ Imeshindwa kutuma OTP. Jaribu tena baadaye." });
            setupState.delete(userId);
        }

        return true;
    }

    else if (state.step === "WAITING_OTP") {
        const otp = text.replace(/[^0-9]/g, '');

        if (otp.length < 4) {
            return sock.sendMessage(chatId, { text: "❌ OTP inapaswa kuwa nambari. Jaribu tena." });
        }

        await sock.sendMessage(chatId, { text: "🔄 *Inathibitisha OTP...*" });

        try {
            // Hii ndio sehemu muhimu - verify OTP
            const verifyResponse = await truecallerjs.verifyOtp(state.phone, otp, state.requestId); // Kulingana na library

            if (verifyResponse?.installationId) {
                installationId = verifyResponse.installationId;

                if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
                fs.writeFileSync(truecallerFile, JSON.stringify({ installationId }, null, 2));

                await sock.sendMessage(chatId, {
                    text: `🎉 *IMEFANIKIWA!*\n\nTruecaller Installation ID imewekwa na kuhifadhiwa.\n\nSasa unaweza kutumia *.whois*`
                });

                setupState.delete(userId);
            } else {
                await sock.sendMessage(chatId, { text: "❌ OTP si sahihi au imekwisha. Jaribu tena." });
            }
        } catch (err) {
            console.error("Verify OTP Error:", err);
            await sock.sendMessage(chatId, { text: "❌ Hitilafu wakati wa kuthibitisha OTP." });
            setupState.delete(userId);
        }

        return true;
    }

    return false;
}

module.exports = { whoisCommand, setupTruecallerId, handleTruecallerSetup };
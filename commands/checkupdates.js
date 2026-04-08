/**
 * COMMAND: .repo
 * DESIGN: Loft-Quantum Style with Interactive Buttons
 * SPEED: Ultra-Fast Response
 */

const axios = require('axios');
const { sendButtons } = require('gifted-btns'); // Hakikisha library hii ipo

async function repoCommand(sock, chatId, message) {
    try {
        // 1. Quick reaction
        await sock.sendMessage(chatId, { react: { text: '📦', key: message.key } });

        // 2. Repo Information (Kama ilivyo kwenye picha)
        const repoText = `Hello *Mickey Dady*,
This is *LOFT-QUANTUM v4.9.9*, A Whatsapp Bot Built by *MR LOFT*, Enhanced with Amazing Features to Make Your Whatsapp Communication and Interaction Experience Amazing

[❏] *NAME:* LOFT-QUANTUM
[❏] *STARS:* 28
[❏] *FORKS:* 72
[❏] *CREATED ON:* 12/3/2025
[❏] *LAST UPDATED:* 3/30/2026

| *POWERED BY LOFT*`;

        // 3. Professional Buttons (Muundo wa picha)
        const repoButtons = [
            { id: '.copyrepo', text: '📋 Copy Link' },
            { id: '.visitrepo', text: '🔗 Visit Repo' },
            { id: '.downloadzip', text: '📥 Download Zip' }
        ];

        // 4. Send Message with Image & Buttons
        await sendButtons(sock, chatId, {
            title: 'LOFT-QUANTUM REPO',
            text: repoText,
            footer: 'Mickey Glitch Tech',
            image: { url: "https://i.ibb.co/vzVv8Yp/mickey.jpg" }, // Weka link ya picha yako
            buttons: repoButtons
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("Repo Error:", err.message);
        await sock.sendMessage(chatId, { text: "❌ *Error loading repo:* Try again." });
    }
}

module.exports = repoCommand;

const fs = require('fs');
const path = require('path');
const { writeJsonDebounced } = require('../lib/safeWrite');
const { sendButtons } = require('gifted-btns'); // Hakikisha library hii ipo

const ANTICALL_PATH = './data/anticall.json';
const REPORTS_PATH = './data/call_reports.json';

// --- Helper Functions ---
function readState() {
    try {
        if (!fs.existsSync(ANTICALL_PATH)) return { enabled: false };
        const raw = fs.readFileSync(ANTICALL_PATH, 'utf8');
        return JSON.parse(raw || '{"enabled": false}');
    } catch { return { enabled: false }; }
}

function writeState(enabled) {
    if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
    writeJsonDebounced(ANTICALL_PATH, { enabled: !!enabled }, 1000);
}

// Inatunza ripoti ya nani amepiga
async function saveCallReport(callerId) {
    try {
        let reports = {};
        if (fs.existsSync(REPORTS_PATH)) {
            reports = JSON.parse(fs.readFileSync(REPORTS_PATH, 'utf8'));
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString() + ' ' + now.toLocaleDateString();
        
        if (!reports[callerId]) {
            reports[callerId] = { count: 0, history: [] };
        }

        reports[callerId].count += 1;
        reports[callerId].history.push(timeStr);

        fs.writeFileSync(REPORTS_PATH, JSON.stringify(reports, null, 2));
        return reports[callerId].count;
    } catch (err) {
        console.error('Report Error:', err.message);
        return 1;
    }
}

// --- Main Commands ---
async function anticallCommand(sock, chatId, message, args) {
    const state = readState();
    const sub = (args || '').trim().toLowerCase();

    if (sub === 'status') {
        return await sock.sendMessage(chatId, { text: `Anticall status: *${state.enabled ? 'ON ✅' : 'OFF ❌'}*` }, { quoted: message });
    }

    if (sub === 'on' || sub === 'off') {
        const enable = sub === 'on';
        writeState(enable);
        return await sock.sendMessage(chatId, { text: `Anticall is now *${enable ? 'ENABLED ✅' : 'DISABLED ❌'}*` }, { quoted: message });
    }

    // Default help message
    await sock.sendMessage(chatId, { 
        text: '*ANTICALL SETTINGS*\n\n.anticall on (Washa)\n.anticall off (Zima)\n.anticall status (Hali)' 
    }, { quoted: message });
}

// --- Handle Incoming Calls ---
async function handleAnticall(sock, update) {
    const state = readState();
    if (!state.enabled) return;

    try {
        const call = update[0] || update.call?.[0]; // Support variations in Baileys updates
        if (!call || call.status !== 'offer') return;

        const callerId = call.from;
        
        // 1. Kata Simu (Reject)
        await sock.rejectCall(call.id, callerId);
        
        // 2. Tunza Kumbukumbu (Save Report)
        const callCount = await saveCallReport(callerId);

        // 3. Tuma Ujumbe wa Button
        const msgText = `Habari @${callerId.split('@')[0]},\n\n` +
                        `Samahani, sipokei simu kwa sasa (Sorry, I can't take calls right now).\n` +
                        `Your call has been automatically rejected by my system.`;

        await sendButtons(sock, callerId, {
            title: '📵 CALL REJECTED',
            text: msgText,
            footer: 'Mickey Glitch Technology',
            buttons: [
                { 
                    id: 'dummy_id', 
                    text: `📌 Umepiga mara: ${callCount}` 
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📞 Other Number",
                        url: "https://wa.me/255615944741?text=Hello, I called you but the bot rejected it.",
                    })
                }
            ]
        });

        console.log(`📵 Call auto-rejected & reported for: ${callerId}`);
    } catch (err) {
        console.log(`Anticall error: ${err.message}`);
    }
}

module.exports = { anticallCommand, readState, handleAnticall };

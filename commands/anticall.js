const fs = require('fs');
const { writeJsonDebounced } = require('../lib/safeWrite')

const ANTICALL_PATH = './data/anticall.json';

function readState() {
    try {
        if (!fs.existsSync(ANTICALL_PATH)) return { enabled: false };
        const raw = fs.readFileSync(ANTICALL_PATH, 'utf8');
        const data = JSON.parse(raw || '{}');
        return { enabled: !!data.enabled };
    } catch {
        return { enabled: false };
    }
}

function writeState(enabled) {
    try {
        if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
        writeJsonDebounced(ANTICALL_PATH, { enabled: !!enabled }, 1000)
    } catch {}
}

async function anticallCommand(sock, chatId, message, args) {
    const state = readState();
    const sub = (args || '').trim().toLowerCase();

    if (!sub || (sub !== 'on' && sub !== 'off' && sub !== 'status')) {
        await sock.sendMessage(chatId, { text: '*ANTICALL*\n\n.anticall on  - Enable auto-block on incoming calls\n.anticall off - Disable anticall\n.anticall status - Show current status' }, { quoted: message });
        return;
    }

    if (sub === 'status') {
        await sock.sendMessage(chatId, { text: `Anticall is currently *${state.enabled ? 'ON ✅' : 'OFF ❌'}*.` }, { quoted: message });
        return;
    }

    const enable = sub === 'on';
    writeState(enable);
    await sock.sendMessage(chatId, { text: `Anticall is now *${enable ? 'ENABLED ✅' : 'DISABLED ❌'}*.` }, { quoted: message });
}

// Handle incoming calls
async function handleAnticall(sock, update) {
    const state = readState();
    if (!state.enabled) return;

    try {
        const call = update.call;
        if (!call) return;

        const callerId = call[0]?.from;
        if (!callerId) return;

        // Reject the call
        await sock.rejectCall(call[0].id, callerId);
        console.log(`📵 Call rejected from: ${callerId}`);
    } catch (err) {
        console.log(`Anticall error: ${err.message}`);
    }
}

module.exports = { anticallCommand, readState, handleAnticall };



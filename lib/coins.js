const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(process.cwd(), 'data', 'coins.json');

function ensureFile() {
    if (!fs.existsSync(path.dirname(DATA_FILE))) {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}), 'utf8');
}

function readAll() {
    ensureFile();
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '{}');
    } catch (e) {
        return {};
    }
}

function writeAll(data) {
    ensureFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getKey(chatId) {
    return String(chatId || '').trim();
}

function getUserKey(userId) {
    return String(userId || '').trim();
}

function getCoins(chatId, userId) {
    const all = readAll();
    const c = all[getKey(chatId)] || {};
    return Number(c[getUserKey(userId)] || 0);
}

function setCoins(chatId, userId, amount) {
    const all = readAll();
    const k = getKey(chatId);
    all[k] = all[k] || {};
    all[k][getUserKey(userId)] = Number(amount || 0);
    writeAll(all);
}

function changeCoins(chatId, userId, delta) {
    const current = getCoins(chatId, userId);
    const next = current + Number(delta || 0);
    setCoins(chatId, userId, next);
    return next;
}

function consumeForCommand(chatId, userId, cost = 10) {
    const current = getCoins(chatId, userId);
    if (current < cost) return false;
    changeCoins(chatId, userId, -cost);
    return true;
}


function isEnabled() {
    const all = readAll();
    return Boolean(all._enabled === true);
}

function setEnabled(val) {
    const all = readAll();
    all._enabled = !!val;
    writeAll(all);
    return all._enabled;
}

function isEnabled() {
    const all = readAll();
    return Boolean(all._enabled);
}

function setEnabled(val) {
    const all = readAll();
    all._enabled = !!val;
    writeAll(all);
    return all._enabled;
}

module.exports = {
    getCoins,
    setCoins,
    changeCoins,
    consumeForCommand,
    readAll,
    writeAll,
    isEnabled,
    setEnabled,
};

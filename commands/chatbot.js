const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

// ===== CONFIG =====
const BOT_NAME = "Mickey";
const OWNER_NUMBERS = ["255612130873"];

const DATA_DIR = path.join(__dirname, 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'memory.json');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

const cooldown = new Map();
const messageCache = new Set();

// ===== HELPERS =====
function isOwner(id) {
    return OWNER_NUMBERS.includes(id);
}

function cleanName(name = "") {
    return name
        .replace(/[^\w\s]/gi, '')
        .trim() || "Mshkaji";
}

function extractText(m) {
    const msg = m.message || {};

    return (
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        msg.imageMessage?.caption ||
        msg.videoMessage?.caption ||
        msg.documentMessage?.caption ||
        msg.buttonsResponseMessage?.selectedDisplayText ||
        msg.listResponseMessage?.title ||
        ""
    );
}

function getSender(m) {
    return (
        m.key.participant?.split('@')[0] ||
        m.key.remoteJid?.split('@')[0] ||
        ''
    );
}

// ===== FILE SYSTEM =====
async function loadJSON(file, defaultData = {}) {
    try {
        const data = await fs.readFile(file, 'utf8');
        return JSON.parse(data);
    } catch {
        return defaultData;
    }
}

async function saveJSON(file, data) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// ===== COOLDOWN =====
function isCooldown(user) {
    const now = Date.now();

    if (cooldown.has(user)) {
        const diff = now - cooldown.get(user);

        if (diff < 4000) {
            return true;
        }
    }

    cooldown.set(user, now);
    return false;
}

// ===== SMART FALLBACK =====
function smartReply(text) {
    const t = text.toLowerCase();

    if (/mambo|niaje|vipi|sema/.test(t))
        return "Poa mazee 😎";

    if (/habari/.test(t))
        return "Nzuri mkuu, wewe je?";

    if (/asante|thanks/.test(t))
        return "Karibu sana 🤝";

    if (/joke|utani/.test(t))
        return "Kwa nini simu ilienda shule? Ili kuongeza smartness 😂";

    if (/saa/.test(t))
        return `Sasa ni ${new Date().toLocaleTimeString('sw-TZ')}`;

    return null;
}

// ===== AI =====
async function askAI(prompt) {

    const apis = [
        `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(prompt)}`,
        `https://vihangayt.me/tools/gpt4?q=${encodeURIComponent(prompt)}`
    ];

    for (const url of apis) {

        try {

            const response = await fetch(url, {
                timeout: 10000
            });

            const data = await response.json();

            const reply =
                data.result ||
                data.response ||
                data.message ||
                data.reply;

            if (reply) {
                return reply;
            }

        } catch (e) {
            console.log("API FAIL:", e.message);
        }
    }

    return null;
}

// ===== MAIN CHATBOT =====
async function chatbot(sock, m) {

    try {

        if (!m.message) return;

        const chatId = m.key.remoteJid;

        if (messageCache.has(m.key.id)) return;

        messageCache.add(m.key.id);

        setTimeout(() => {
            messageCache.delete(m.key.id);
        }, 60000);

        const text = extractText(m);

        if (!text) return;

        const sender = getSender(m);

        const userName = cleanName(m.pushName);

        if (m.key.fromMe) return;

        // ===== LOAD STATE =====
        const state = await loadJSON(STATE_FILE, {
            groups: {},
            private: true
        });

        const isGroup = chatId.endsWith('@g.us');

        let enabled = false;

        if (isGroup) {
            enabled = state.groups[chatId];
        } else {
            enabled = state.private;
        }

        // ===== COMMANDS =====
        if (text.startsWith(".")) {

            const args = text.trim().split(/\s+/);

            const cmd = args[0].slice(1).toLowerCase();

            // chatbot on/off
            if (cmd === "chatbot") {

                if (!isOwner(sender)) {
                    return sock.sendMessage(chatId, {
                        text: "❌ Wewe sio owner"
                    });
                }

                const action = args[1];

                if (action === "on") {

                    if (isGroup) {
                        state.groups[chatId] = true;
                    } else {
                        state.private = true;
                    }

                    await saveJSON(STATE_FILE, state);

                    return sock.sendMessage(chatId, {
                        text: "✅ Chatbot ON"
                    });
                }

                if (action === "off") {

                    if (isGroup) {
                        state.groups[chatId] = false;
                    } else {
                        state.private = false;
                    }

                    await saveJSON(STATE_FILE, state);

                    return sock.sendMessage(chatId, {
                        text: "❌ Chatbot OFF"
                    });
                }
            }

            if (cmd === "ping") {
                return sock.sendMessage(chatId, {
                    text: "🏓 Pong!"
                });
            }

            if (cmd === "alive") {
                return sock.sendMessage(chatId, {
                    text: `✅ ${BOT_NAME} yupo active`
                });
            }

            if (cmd === "owner") {
                return sock.sendMessage(chatId, {
                    text: `👑 Owner: ${OWNER_NUMBERS[0]}`
                });
            }

            return;
        }

        if (!enabled) return;

        // ===== COOLDOWN =====
        if (isCooldown(sender)) {
            return sock.sendMessage(chatId, {
                text: "⏳ Tulia kidogo mazee..."
            });
        }

        // ===== TYPING =====
        await sock.sendPresenceUpdate('composing', chatId);

        // ===== MEMORY =====
        const memory = await loadJSON(MEMORY_FILE, {});

        if (!memory[chatId]) {
            memory[chatId] = [];
        }

        memory[chatId].push({
            role: "user",
            name: userName,
            text
        });

        memory[chatId] =
            memory[chatId].slice(-8);

        const history = memory[chatId]
            .map(v =>
                `${v.role === "user" ? v.name : BOT_NAME}: ${v.text}`
            )
            .join("\n");

        // ===== AI PROMPT =====
        const prompt = `
Wewe ni ${BOT_NAME} kutoka Tanzania.

RULES:
- Ongea kiswahili cha kawaida
- Kuwa rafiki
- Usiseme wewe ni AI
- Jibu short
- Tumia slang kidogo

History:
${history}

${userName}: ${text}

${BOT_NAME}:
`;

        // ===== AI RESPONSE =====
        let reply = await askAI(prompt);

        // ===== FALLBACK =====
        if (!reply) {
            reply = smartReply(text);

            if (!reply) {
                reply = "Sijui mazee 😅";
            }
        }

        // ===== CLEAN RESPONSE =====
        reply = reply
            .replace(/AI|robot|chatbot|bot/gi, BOT_NAME)
            .slice(0, 400);

        // ===== SAVE MEMORY =====
        memory[chatId].push({
            role: "assistant",
            text: reply
        });

        await saveJSON(MEMORY_FILE, memory);

        // ===== SEND =====
        await sock.sendMessage(chatId, {
            text: reply
        }, {
            quoted: m
        });

    } catch (err) {

        console.log(err);

        try {

            await sock.sendMessage(
                m.key.remoteJid,
                {
                    text: "⚠️ Kuna tatizo kidogo mazee..."
                }
            );

        } catch {}
    }
}

module.exports = chatbot;
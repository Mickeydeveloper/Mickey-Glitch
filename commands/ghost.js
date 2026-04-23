const fs = require('fs');
const path = require('path');

// @description Track "ghost" activity and provide reports for the last 7 days
// The command logs three types of events:
//  - message: when someone sends any message
//  - reply: when a message quotes/replies to another message
//  - reaction: when a reaction message is received (WhatsApp reaction event)
// Data is stored per-group and pruned automatically so that only the
// most recent 7 days of information are kept.  The .ghost command then
// analyses the log to produce "silent" members (fewest messages) and
// "ignored" members (fewest replies+reactions).

const GHOST_FILE = path.join(__dirname, '..', 'data', 'ghostStats.json');

function loadGhostData() {
    try {
        if (fs.existsSync(GHOST_FILE)) {
            return JSON.parse(fs.readFileSync(GHOST_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Failed to load ghost data:', e);
    }
    return {};
}

function saveGhostData(data) {
    try {
        fs.writeFileSync(GHOST_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Failed to save ghost data:', e);
    }
}

/**
 * Record activity for the incoming message.  This should be called from
 * main.js whenever a new message arrives (and isn't from the bot itself). 
 */
function logGhostActivity(chatId, message) {
    const data = loadGhostData();
    if (!data[chatId]) {
        data[chatId] = { messages: [], replies: [], reactions: [] };
    }

    const now = Date.now();
    const chatLog = data[chatId];

    // sender can be either participant (group) or remoteJid in private chats
    const sender = message.key.participant || message.key.remoteJid;
    if (sender) {
        chatLog.messages.push({ user: sender, timestamp: now });
    }

    // reply detection: when a message quotes another
    const quoted =
        message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const repliedTo =
        message.message?.extendedTextMessage?.contextInfo?.participant;
    if (quoted && repliedTo) {
        chatLog.replies.push({ from: sender, to: repliedTo, timestamp: now });
    }

    // reaction detection (WhatsApp reaction message)
    if (message.message?.reactionMessage) {
        const reactedKey = message.message.reactionMessage.key || {};
        const reactedTo = reactedKey.participant || reactedKey.remoteJid;
        if (reactedTo) {
            chatLog.reactions.push({ from: sender, to: reactedTo, timestamp: now });
        }
    }

    // prune old entries more than 7 days old to keep file size reasonable
    const cutoff = now - 7 * 24 * 60 * 60 * 1000;
    ['messages', 'replies', 'reactions'].forEach(category => {
        chatLog[category] = chatLog[category].filter(ev => ev.timestamp >= cutoff);
    });

    saveGhostData(data);
}

/**
 * Generates and sends the ghost report to the chat.  Only works in groups.
 */
async function ghostCommand(sock, chatId, isGroup) {
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: 'This command is only available in group chats.' });
        return;
    }

    const data = loadGhostData();
    const groupLog = data[chatId] || { messages: [], replies: [], reactions: [] };
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // helper to tally counts in the window
    const msgCounts = {};
    groupLog.messages.forEach(ev => {
        if (ev.timestamp >= cutoff) {
            msgCounts[ev.user] = (msgCounts[ev.user] || 0) + 1;
        }
    });

    const replyCounts = {};
    groupLog.replies.forEach(ev => {
        if (ev.timestamp >= cutoff) {
            replyCounts[ev.to] = (replyCounts[ev.to] || 0) + 1;
        }
    });

    const reactionCounts = {};
    groupLog.reactions.forEach(ev => {
        if (ev.timestamp >= cutoff) {
            reactionCounts[ev.to] = (reactionCounts[ev.to] || 0) + 1;
        }
    });

    // get current participant list to include users who haven't messaged at all
    let participants = [];
    try {
        const meta = await sock.groupMetadata(chatId);
        participants = meta.participants.map(p => p.id);
    } catch (e) {
        // if we fail to fetch metadata, fall back to those we have logged
        participants = Array.from(
            new Set([
                ...Object.keys(msgCounts),
                ...Object.keys(replyCounts),
                ...Object.keys(reactionCounts)
            ])
        );
    }

    // silent members: lowest message counts
    const silentList = participants
        .map(id => ({ id, count: msgCounts[id] || 0 }))
        .sort((a, b) => a.count - b.count)
        .slice(0, 5);

    // ignored users: least replies+reactions received
    const ignoredList = participants
        .map(id => ({
            id,
            count: (replyCounts[id] || 0) + (reactionCounts[id] || 0)
        }))
        .sort((a, b) => a.count - b.count)
        .slice(0, 5);

    let response = '👻 Silent Members (last 7 days):\n';
    silentList.forEach((u, i) => {
        response += `${i + 1}. @${u.id.split('@')[0]} (${u.count} msgs)\n`;
    });
    response += '\n😶 Most Ignored Users (least replies/reactions):\n';
    ignoredList.forEach((u, i) => {
        response += `${i + 1}. @${u.id.split('@')[0]} (${u.count} interactions)\n`;
    });

    const mentions = [...silentList, ...ignoredList].map(u => u.id);
    await sock.sendMessage(chatId, { text: response, mentions });
}

module.exports = { logGhostActivity, ghostCommand };
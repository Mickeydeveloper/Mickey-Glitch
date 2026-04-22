const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { checkAdminPermissions } = require('../lib/adminCheck');

// Mfumo wa usalama na ukaguzi wa admin
async function ensureGroupAndAdmin(sock, chatId, message, requireSenderAdmin = true) {
    const isGroup = chatId.endsWith('@g.us');
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: 'Amri hii ni kwa ajili ya magroup tu (Groups only).' });
        return { ok: false };
    }

    try {
        const adminStatus = await checkAdminPermissions(sock, chatId, message);
        
        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, { text: '⚠️ Tafadhali nifanye bot kuwa admin kwanza.' });
            return { ok: false };
        }

        // Kama command inahitaji sender awe admin (mfano: setgdesc)
        if (requireSenderAdmin && !adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '❌ Admins tu ndio wanaweza kutumia hii.' });
            return { ok: false };
        }

        return { ok: true, adminStatus };
    } catch (e) {
        console.error(e);
        return { ok: false };
    }
}

// 1. TAGALL (Free - Kila mtu anaweza kutag wote)
async function tagAll(sock, chatId, message, text) {
    const check = await ensureGroupAndAdmin(sock, chatId, message, false); // false = free
    if (!check.ok) return;

    const groupMetadata = await sock.groupMetadata(chatId);
    const participants = groupMetadata.participants;
    const msgText = text ? text.split(' ').slice(1).join(' ') : 'No message';
    
    let tagMsg = `*『 TAG ALL MEMBERS 』*\n\n*Message:* ${msgText}\n\n`;
    for (let mem of participants) {
        tagMsg += ` @${mem.id.split('@')[0]}\n`;
    }

    await sock.sendMessage(chatId, { 
        text: tagMsg, 
        mentions: participants.map(a => a.id) 
    }, { quoted: message });
}

// 2. GET LINK (Free - Kila mtu anaweza kupata link)
async function getGroupLink(sock, chatId, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, message, false); // false = free
    if (!check.ok) return;

    try {
        const code = await sock.groupInviteCode(chatId);
        await sock.sendMessage(chatId, { text: `https://chat.whatsapp.com/${code}` }, { quoted: message });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '❌ Imeshindikana kupata link.' });
    }
}

// 3. RESET LINK (Admin Only)
async function resetGroupLink(sock, chatId, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, message, true); // true = admin only
    if (!check.ok) return;

    try {
        await sock.groupRevokeInvite(chatId);
        await sock.sendMessage(chatId, { text: '✅ Group link imebadilishwa (Reset successfully).' }, { quoted: message });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '❌ Imeshindikana kureset link.' });
    }
}

// 4. WARN (Admin Only)
async function warnUser(sock, chatId, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, message, true);
    if (!check.ok) return;

    const quoted = message.message?.extendedTextMessage?.contextInfo?.participant;
    const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const userToWarn = mentioned || quoted;

    if (!userToWarn) {
        return await sock.sendMessage(chatId, { text: 'M-tag au reply mtu unayetaka kumpa onyo (Warn).' });
    }

    const warningMsg = `*『 GROUP WARNING 』*\n\n⚠️ User: @${userToWarn.split('@')[0]}\nOnyo hili ni rasmi. Tafadhali fuata sheria za group!`;
    await sock.sendMessage(chatId, { text: warningMsg, mentions: [userToWarn] }, { quoted: message });
}

// FUNCTIONS ZA ZAMANI (Nimezi-update zitumie mfumo mpya)
async function setGroupDescription(sock, chatId, senderId, text, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, message, true);
    if (!check.ok) return;
    const desc = (text || '').split(' ').slice(1).join(' ').trim();
    if (!desc) return await sock.sendMessage(chatId, { text: 'Usage: .setgdesc <description>' });
    try {
        await sock.groupUpdateDescription(chatId, desc);
        await sock.sendMessage(chatId, { text: '✅ Group description updated.' });
    } catch (e) { await sock.sendMessage(chatId, { text: '❌ Failed.' }); }
}

async function setGroupName(sock, chatId, senderId, text, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, message, true);
    if (!check.ok) return;
    const name = (text || '').split(' ').slice(1).join(' ').trim();
    if (!name) return await sock.sendMessage(chatId, { text: 'Usage: .setgname <name>' });
    try {
        await sock.groupUpdateSubject(chatId, name);
        await sock.sendMessage(chatId, { text: '✅ Name updated.' });
    } catch (e) { await sock.sendMessage(chatId, { text: '❌ Failed.' }); }
}

async function setGroupPhoto(sock, chatId, senderId, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, message, true);
    if (!check.ok) return;
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imageMessage = quoted?.imageMessage;
    if (!imageMessage) return await sock.sendMessage(chatId, { text: 'Reply to an image with .setgpp' });
    try {
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        await sock.updateProfilePicture(chatId, buffer);
        await sock.sendMessage(chatId, { text: '✅ Photo updated.' });
    } catch (e) { await sock.sendMessage(chatId, { text: '❌ Failed.' }); }
}

module.exports = {
    setGroupDescription,
    setGroupName,
    setGroupPhoto,
    tagAll,
    getGroupLink,
    resetGroupLink,
    warnUser
};

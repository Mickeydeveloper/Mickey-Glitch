const FOOTER = '© Mickey Glith ™';

function normalizeJid(value, fallback = '') {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) return trimmed;
    } else if (typeof value === 'number' || typeof value === 'bigint') {
        return String(value);
    } else if (Array.isArray(value) && value.length > 0) {
        return normalizeJid(value[0], fallback);
    } else if (value && typeof value === 'object') {
        const candidate = value.jid || value.id || value.userJid || value.participant || value.remoteJid || value.sender;
        if (candidate) return normalizeJid(candidate, fallback);
    }

    return typeof fallback === 'string' ? fallback.trim() : '';
}

function toWhatsAppJid(value, fallback = '') {
    const normalized = normalizeJid(value, fallback);
    if (!normalized) return '';

    if (normalized.includes('@')) return normalized;

    const digitsOnly = normalized.replace(/\D/g, '');
    if (digitsOnly.length >= 10) return `${digitsOnly}@s.whatsapp.net`;

    return normalized;
}

async function getppCommand(sock, chatId, senderId, message, args) {
    try {
        const normalizedSenderJid = toWhatsAppJid(senderId, '');
        let targetJid = normalizedSenderJid; // Default ni mtumaji

        // 1. Angalia kama kuna aliye-tagiwa au namba iliyoandikwa
        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentionedJids.length > 0) {
            targetJid = toWhatsAppJid(mentionedJids[0], normalizedSenderJid);
        } else if (args.length > 0) {
            const rawArg = normalizeJid(args[0], '');
            const num = rawArg.replace(/[^0-9]/g, '');
            if (num.length >= 10) targetJid = `${num}@s.whatsapp.net`;
        }

        // 2. Tafuta Jina la Muhusika
        const normalizedTargetJid = targetJid || normalizedSenderJid;
        let displayName = normalizedTargetJid ? normalizedTargetJid.split('@')[0] : 'Muhusika'; // Fallback ya namba
        if (global.store && global.store.contacts[normalizedTargetJid]) {
            displayName = global.store.contacts[normalizedTargetJid].name || global.store.contacts[normalizedTargetJid].notify || displayName;
        } else if (message.pushName && normalizedTargetJid === normalizedSenderJid) {
            displayName = message.pushName;
        }

        // 3. Pakua Picha ya Profaili
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(normalizedTargetJid, 'image');
        } catch (err) {
            return sock.sendMessage(chatId, { text: `❌ Muhusika *@${displayName}* hana picha ya profaili.` }, { quoted: message });
        }

        // 4. Maandalizi ya Card ya Picha (Image from Ad Style)
        const media = await prepareWAMessageMedia({ image: { url: ppUrl } }, { upload: sock.waUploadToServer });

        const cardMessage = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        header: {
                            title: `👤 PROFILE: ${displayName.toUpperCase()}`,
                            hasMediaAttachment: true,
                            imageMessage: media.imageMessage
                        },
                        body: {
                            text: `✨ *Picha ya Profaili Imepatikana!*\n\n📋 *Jina:* ${displayName}\n🆔 *ID:* ${normalizedTargetJid.split('@')[0]}\n\n_Gusa picha hapo juu ili kuona kubwa au kuipakua kwenye simu yako._`
                        },
                        footer: { text: FOOTER },
                        nativeFlowMessage: {
                            buttons: [
                                {
                                    name: "cta_url",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "💬 Chat nae",
                                        url: `https://wa.me/${normalizedTargetJid.split('@')[0]}`
                                    })
                                }
                            ],
                            version: 3
                        }
                    }
                }
            }
        };

        const msg = generateWAMessageFromContent(chatId, cardMessage, { quoted: message });
        return await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });

    } catch (err) {
        console.error('GetPP Card Error:', err);
        await sock.sendMessage(chatId, { text: `❌ Imeshindwa kupata kadi ya picha: ${err.message}` });
    }
}

module.exports = getppCommand;

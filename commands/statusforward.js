// ────────────────────────────────────────────────
// FORWARD STATUS FUNCTION - Improved version
async function forwardStatus(sock, msg) {
    if (!msg?.message || !msg.key?.id) return;
    if (!TARGET_JID) {
        const botId = sock.user?.id;
        if (botId) {
            BOT_NUMBER = botId.split(':')[0];
            TARGET_JID = `${BOT_NUMBER}@s.whatsapp.net`;
        } else {
            return;
        }
    }

    const msgId = msg.key.id;
    if (processedStatusIds.has(msgId)) return;
    processedStatusIds.add(msgId);
    if (processedStatusIds.size > 1500) processedStatusIds.clear();

    // Tunaangalia tu media zenye picha au video
    const isImage = msg.message?.imageMessage;
    const isVideo = msg.message?.videoMessage;

    if (!isImage && !isVideo) {
        // Tuna-skip text-only statuses (unaweza ku-comment hii ikiwa unataka pia text)
        return;
    }

    const phone = extractPhoneNumber(msg.key);
    const timeStr = new Date().toLocaleString('sw-TZ', {
        timeZone: 'Africa/Dar_es_Salaam',
        dateStyle: 'medium',
        timeStyle: 'short'
    });

    let senderName = phone;
    
    // Jaribu kupata jina la mtu (ikiwezekana)
    try {
        const contact = await sock.getContactById(msg.key.participant || msg.key.remoteJid);
        if (contact?.notify || contact?.verifiedName || contact?.name) {
            senderName = contact.notify || contact.verifiedName || contact.name;
        }
    } catch (e) {}

    console.log(`📸 Forwarding status → ${senderName} • ${timeStr}`);

    // ──── Caption ya kuvutia ────
    const captionLines = [];

    captionLines.push(`✨ *Status Mpya* ✨`);
    captionLines.push(`👤 ${senderName}`);
    captionLines.push(`📅 ${timeStr}`);
    
    if (msg.message?.imageMessage?.caption) {
        captionLines.push(`\n💬 *Caption:*`);
        captionLines.push(msg.message.imageMessage.caption.trim());
    }
    else if (msg.message?.videoMessage?.caption) {
        captionLines.push(`\n💬 *Caption:*`);
        captionLines.push(msg.message.videoMessage.caption.trim());
    }

    captionLines.push(`\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`);
    captionLines.push(`Forwarded from status`);

    const finalCaption = captionLines.join('\n');

    // ──── Media handling ────
    const mediaType = isImage ? 'image' : 'video';
    const mimeType = isImage 
        ? (msg.message.imageMessage.mimetype || 'image/jpeg')
        : (msg.message.videoMessage.mimetype || 'video/mp4');

    try {
        const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
            logger: console,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!buffer || buffer.length < 500) {
            throw new Error('Media buffer ni ndogo sana au imeharibika');
        }

        // Tunatuma media + caption nzuri
        await sock.sendMessage(TARGET_JID, {
            [mediaType]: buffer,
            mimetype: mimeType,
            caption: finalCaption,
            fileName: `status_\( {Date.now()}. \){isImage ? 'jpg' : 'mp4'}`,
            // Hatutumii viewOnce ili isiingiliane na experience ya asili
            // viewOnce: msg.message?.[mediaType + 'Message']?.viewOnce || false
        });

        console.log(`→ Forward success: ${mediaType} from ${senderName}`);

        // Delay kidogo ili isiwe kama bot inatuma mara moja
        await new Promise(r => setTimeout(r, randomMs(1200, 2800)));

    } catch (err) {
        console.error('[Status Forward Error]', err.message || err);

        // Tunaweka ujumbe wa error kwa mtindo mzuri
        await sock.sendMessage(TARGET_JID, {
            text: `⚠️ *Tatizo la kufoward status*\n` +
                  `Mtumaji: ${senderName}\n` +
                  `Muda: ${timeStr}\n` +
                  `Aina: ${mediaType}\n` +
                  `Sababu: ${err.message.slice(0, 120)}`
        });
    }
}
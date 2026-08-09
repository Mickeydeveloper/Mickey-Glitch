/**
 * uploadstatus.js - Upload Media to WhatsApp Status
 * Using @whiskeysockets/baileys
 */

// ─── REQUIRE MODULES ──────────────────────────────────────────────────
const { 
    prepareWAMessageMedia, 
    generateWAMessageFromContent,
    proto 
} = require('@whiskeysockets/baileys');

// ─── CONFIGURATION ─────────────────────────────────────────────────────
const COLORS = [
    0xFFF44336, 0xFFE91E63, 0xFF9C27B0, 0xFF673AB7, 0xFF3F51B5,
    0xFF2196F3, 0xFF03A9F4, 0xFF00BCD4, 0xFF009688, 0xFF4CAF50,
    0xFF8BC34A, 0xFFCDDC39, 0xFFFFEB3B, 0xFFFFC107, 0xFFFF9800, 0xFFFF5722
];

// ─── MAIN HANDLER ──────────────────────────────────────────────────────
let handler = async (m, { conn, text, command }) => {
    try {
        // ─── GET QUOTED MEDIA ────────────────────────────────────────────
        let q = m.quoted;
        let mime = q ? ((q.msg || q).mimetype || '') : '';
        let isImage = mime.includes('image');
        let isVideo = mime.includes('video');
        let isAudio = mime.includes('audio');
        let isVoice = mime.includes('audio/ogg') || q?.msg?.audioMessage?.ptt;

        // ─── CHECK IF THERE'S MEDIA ──────────────────────────────────────
        if (!isImage && !isVideo && !isAudio && !isVoice) {
            return m.reply(
                `📤 *UPLOAD STATUS*\n\n` +
                `Jibu picha, video, au audio na command hii:\n` +
                `• .uploadstatus - Weka kwenye status\n` +
                `• .status - Weka kwenye status\n\n` +
                `✏️ *Mfano:*\n` +
                `Jibu picha + .uploadstatus`
            );
        }

        // ─── GET CAPTION ──────────────────────────────────────────────────
        let caption = text || '';
        let colorIndex = -1;
        
        // Check if there's a color number
        if (caption) {
            let parts = caption.split(' ');
            let potentialColor = parseInt(parts[0]);
            if (!isNaN(potentialColor) && potentialColor >= 0 && potentialColor <= 15) {
                colorIndex = potentialColor;
                caption = parts.slice(1).join(' ');
            }
        }

        // ─── SELECT COLOR ─────────────────────────────────────────────────
        const finalColor = (colorIndex >= 0 && colorIndex < COLORS.length)
            ? COLORS[colorIndex]
            : COLORS[Math.floor(Math.random() * COLORS.length)];

        // ─── DOWNLOAD MEDIA ──────────────────────────────────────────────
        await m.reply('⏳ *Inapakua media...*');
        let media = await q.download();

        // ─── DETERMINE MEDIA TYPE ────────────────────────────────────────
        let mediaType = isImage ? 'image' : isVideo ? 'video' : 'audio';
        let mediaOptions = { [mediaType]: media };
        
        if (isVoice) {
            mediaOptions = { 
                audio: media, 
                mimetype: 'audio/ogg; codecs=opus', 
                ptt: false 
            };
        }

        // ─── PREPARE MEDIA FOR UPLOAD ────────────────────────────────────
        await m.reply('📤 *Inatayarisha media...*');
        let prepared = await prepareWAMessageMedia(mediaOptions, { 
            upload: conn.waUploadToServer 
        });

        // ─── GET MESSAGE KEY ──────────────────────────────────────────────
        let messageKey = isImage ? 'imageMessage' : isVideo ? 'videoMessage' : 'audioMessage';

        // ─── CREATE STATUS MESSAGE ───────────────────────────────────────
        const contentMsg = {
            [messageKey]: {
                ...prepared[messageKey],
                caption: caption || '',
                contextInfo: {
                    isGroupStatus: true,
                    pairedMediaType: 'NOT_PAIRED_MEDIA',
                    statusAudienceMetadata: {
                        audienceType: 1, // 0=Public, 1=Custom, 2=Close Friends
                        listEmoji: '📤',
                        listName: 'Status Upload'
                    }
                }
            }
        };

        // ─── GENERATE MESSAGE ─────────────────────────────────────────────
        const webMsg = proto.Message.fromObject(contentMsg);
        const waMsg = generateWAMessageFromContent(m.chat, webMsg, { 
            userJid: conn.user.jid, 
            quoted: m 
        });

        // ─── SEND STATUS ──────────────────────────────────────────────────
        await m.reply('⏳ *Inatuma status...*');
        await conn.relayMessage(m.chat, waMsg.message, { 
            messageId: waMsg.key.id 
        });

        // ─── SUCCESS RESPONSE ─────────────────────────────────────────────
        await m.react('✅');
        await m.reply(
            `✅ *Status Imetumwa!*\n\n` +
            `📤 *Media:* ${isImage ? 'Picha' : isVideo ? 'Video' : 'Audio'}\n` +
            `📝 *Caption:* ${caption || 'Hakuna'}\n` +
            `🎨 *Color:* ${colorIndex >= 0 ? colorIndex : 'Random'}\n\n` +
            `_Status imewekwa kwenye WhatsApp Status!_`
        );

    } catch (error) {
        console.error('[UPLOAD STATUS ERROR]', error);
        await m.react('❌');
        await m.reply(`❌ *Error:* ${error.message || 'Imeshindwa kuweka status'}`);
    }
};

// ─── COMMAND PROPERTIES ──────────────────────────────────────────────
handler.help = ['uploadstatus'];
handler.tags = ['tools'];
handler.command = /^(uploadstatus|status|upload-status)$/i;
handler.group = false;
handler.admin = false;

// ─── EXPORTS ──────────────────────────────────────────────────────────
export default handler;
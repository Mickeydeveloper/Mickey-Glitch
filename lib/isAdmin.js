const { getGroupMetadataWithCache } = require('./groupMetadataCache'); 

// Namba za ma-admin wa kudumu (Hardcoded admin numbers)
const SUDO_NUMBERS = [
    '255612130873@s.whatsapp.net',
    '255615944741@s.whatsapp.net'
];

/**
 * Extract numeric part from WhatsApp ID in any format
 * Handles: "255612130873", "255612130873@s.whatsapp.net", "255612130873:5@s.whatsapp.net"
 */
function extractNumericId(id) {
    if (!id) return null;
    // Remove everything except digits at the start
    const match = id.match(/^(\d+)/);
    return match ? match[1] : null;
}

/**
 * Format ID to standard WhatsApp format: "NUMBER@s.whatsapp.net"
 */
function formatToWhatsAppId(id) {
    const numeric = extractNumericId(id);
    if (!numeric) return null;
    return `${numeric}@s.whatsapp.net`;
}

/**
 * Check kama ID mbili ni za mtu mmoja
 * Linganisha by numeric value kwa flexibility
 */
function isSameId(id1, id2) {
    if (!id1 || !id2) return false;
    const num1 = extractNumericId(id1);
    const num2 = extractNumericId(id2);
    return num1 && num2 && num1 === num2;
}

async function isAdmin(sock, chatId, senderId, forceRefresh = false) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) return { isGroup: false, isSenderAdmin: false, isBotAdmin: false };

        const groupMetadata = await getGroupMetadataWithCache(
            sock.groupMetadata.bind(sock), 
            chatId, 
            forceRefresh 
        );

        if (!groupMetadata) return { isGroup: true, isSenderAdmin: false, isBotAdmin: false };

        const participants = groupMetadata.participants || [];

        // Format IDs properly - extract numeric part
        const senderNumeric = extractNumericId(senderId);
        const cleanSenderId = formatToWhatsAppId(senderId);
        
        // Get bot ID - TRY DIFFERENT WAYS TO GET IT
        let cleanBotId = null;
        if (sock.user?.id) {
            cleanBotId = formatToWhatsAppId(sock.user.id);
        }
        
        // If we couldn't get bot ID, try extracting from first participant that looks like bot
        // (This is a fallback in case sock.user.id is not available)
        if (!cleanBotId && participants.length > 0) {
            console.warn('[isAdmin] Could not get bot ID from sock.user.id, checking participants');
        }

        if (!senderNumeric) {
            console.error('[isAdmin] Failed to extract senderId from:', senderId);
            return { isGroup: true, isSenderAdmin: false, isBotAdmin: false };
        }

        // Pata list ya admin wa group (Get group admins)
        const admins = participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => p.id);

        // Log admins kwa debugging
        console.log(`[isAdmin] Group: ${chatId}, Admins: ${admins.join(', ')}`);
        console.log(`[isAdmin] Checking sender: ${cleanSenderId} (numeric: ${senderNumeric})`);
        console.log(`[isAdmin] Checking bot: ${cleanBotId}`);

        // Angalia kama sender ni admin - COMPARE BY NUMERIC ID FOR FLEXIBILITY
        let isSenderAdmin = false;
        for (const adminId of admins) {
            if (isSameId(adminId, cleanSenderId)) {
                isSenderAdmin = true;
                break;
            }
        }
        
        // Also check sudo list
        if (!isSenderAdmin && SUDO_NUMBERS.some(sudoId => isSameId(sudoId, cleanSenderId))) {
            isSenderAdmin = true;
        }

        // Angalia kama bot ni admin - COMPARE BY NUMERIC ID
        let isBotAdmin = false;
        if (cleanBotId) {
            for (const adminId of admins) {
                if (isSameId(adminId, cleanBotId)) {
                    isBotAdmin = true;
                    break;
                }
            }
        }

        console.log(`[isAdmin] Result - isSenderAdmin: ${isSenderAdmin}, isBotAdmin: ${isBotAdmin}`);

        return {
            isGroup: true,
            isSenderAdmin: isSenderAdmin,
            isBotAdmin: isBotAdmin
        };
    } catch (e) {
        console.error('[isAdmin] Error:', e);
        return { isGroup: true, isSenderAdmin: false, isBotAdmin: false };
    }
}

module.exports = { isAdmin };

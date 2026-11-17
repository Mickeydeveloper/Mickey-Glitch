const settings = require('../settings');
const { isSudo } = require('./index');

async function isOwnerOrSudo(senderId, sock = null, chatId = null, sudoAlreadyChecked = false) {
    try {
        // Validate inputs
        if (!senderId || typeof senderId !== 'string') {
            return false;
        }

        const ownerNumber = settings.ownerNumber || '';
        if (!ownerNumber) {
            console.debug('⚠️ Owner number not configured');
            return false;
        }

        const ownerJid = ownerNumber + "@s.whatsapp.net";
        const ownerNumberClean = ownerNumber.split(':')[0].split('@')[0].replace(/\D/g, '');
        const senderNumber = senderId.split(':')[0].split('@')[0].replace(/\D/g, '');
        
        // Direct JID match
        if (senderId === ownerJid) {
            return true;
        }
        
        // Extract sender's numeric parts
        const senderLidNumeric = senderId.includes('@lid') ? senderId.split('@')[0].split(':')[0] : '';
        
        // Check if sender's phone number matches owner number
        if (senderNumber === ownerNumberClean) {
            return true;
        }
        
        const botLid = sock?.user?.lid || '';
        const botLidNumeric = botLid.split(':')[0].split('@')[0];
        if (senderLidNumeric && botLidNumeric && senderLidNumeric === botLidNumeric) {
            return true;
        }

        if (senderId.endsWith('@lid') && typeof sock?.signalRepository?.lidMapping?.getPNForLID === 'function') {
            try {
                const phoneJid = await sock.signalRepository.lidMapping.getPNForLID(senderId);
                const mappedNumber = phoneJid?.split(':')[0].split('@')[0].replace(/\D/g, '');
                if (mappedNumber && mappedNumber === ownerNumberClean) {
                    return true;
                }
            } catch {
                // LID mappings may not be available yet; don't fetch group metadata as a fallback.
            }
        }
        
        // Check if sender ID contains owner number (fallback)
        if (ownerNumberClean && senderNumber === ownerNumberClean) {
            return true;
        }
        
        // Check sudo status
        if (sudoAlreadyChecked) return false;
        try {
            return await isSudo(senderId);
        } catch (e) {
            console.debug('[isOwner] Sudo check error:', e?.message);
            return false;
        }
    } catch (e) {
        console.error('[isOwnerOrSudo] Fatal error:', e?.message);
        return false;
    }
}

module.exports = isOwnerOrSudo;
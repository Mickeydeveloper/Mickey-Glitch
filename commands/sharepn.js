const settings = require('../settings');
const { getSudoList } = require('../lib/index');

const MAX_MESSAGES = 3;
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 10000;

async function sharePhoneNumberCommand(sock, chatId, message, args = []) {
    const messageKey = message?.key || {};
    const reply = (text) => sock.sendMessage(chatId, { text }, { quoted: message });
    const normalizeNumber = (value) => String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');
    
    const authorizedNumbers = new Set([
        normalizeNumber(settings.ownerNumber),
        ...(await getSudoList()).map(normalizeNumber),
    ].filter(Boolean));
    
    const senderIds = [
        messageKey.participant,
        messageKey.remoteJid,
        messageKey.participantAlt,
        messageKey.remoteJidAlt,
        message?.participant,
        message?.sender,
    ].filter((value) => typeof value === 'string' && value);

    if (typeof sock?.signalRepository?.lidMapping?.getPNForLID === 'function') {
        for (const senderId of senderIds.filter((value) => value.endsWith('@lid'))) {
            try {
                const phoneJid = await sock.signalRepository.lidMapping.getPNForLID(senderId);
                if (phoneJid) senderIds.push(phoneJid);
            } catch (error) {
                console.debug('[sharepn] Could not resolve sender LID:', error?.message || error);
            }
        }
    }

    const isAuthorized = senderIds.some((senderId) => {
        if (senderId.endsWith('@lid')) return false;
        return authorizedNumbers.has(normalizeNumber(senderId));
    });

    if (!isAuthorized) {
        return reply('❌ (Owner) Owner au sudo pekee anaweza kutumia command hii.'); // (Only the owner or sudo can use this command.)
    }

    const isPrivateChat = chatId?.endsWith('@s.whatsapp.net') || chatId?.endsWith('@lid');
    if (!isPrivateChat || !senderIds.includes(chatId)) {
        return reply('❌ (Private chat only) Command hii inafanya kazi kwenye DM yako binafsi pekee.'); // (This command only works in your personal DM.)
    }

    const values = Array.isArray(args) ? args : String(args || '').trim().split(/\s+/).filter(Boolean);
    const amount = Number.parseInt(values[0], 10) || 1;
    const requestedDelay = values[1] === undefined ? 1000 : Number.parseInt(values[1], 10);

    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_MESSAGES) {
        return reply(`Matumizi: .sharepn <1-${MAX_MESSAGES}> [delay-ms]`); // (Usage: .sharepn <1-3> [delay-ms])
    }

    if (!Number.isInteger(requestedDelay) || requestedDelay < 0) {
        return reply('❌ (Invalid delay) Delay lazima iwe namba isiyo hasi.'); // (Delay must be a non-negative number.)
    }

    const delay = Math.min(Math.max(requestedDelay, MIN_DELAY_MS), MAX_DELAY_MS);
    let sent = 0;

    // Chagua namba ya owner au namba ya sasa ya bot kujituma kama Contact Card
    const ownerNum = normalizeNumber(settings.ownerNumber) || '255612130873';
    const ownerFormatted = ownerNum.startsWith('+') ? ownerNum : `+${ownerNum}`;

    try {
        for (let index = 0; index < amount; index++) {
            // Tumia vCard ya namba halisi ambayo inaleta contact card inayoweza kuguswa na kuhifadhiwa au kushirikiwa
            await sock.sendMessage(chatId, {
                contacts: {
                    displayName: global.ownername || settings.botOwner || "Mickey Glitch Owner",
                    contacts: [
                        {
                            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${global.ownername || "Mickey Glitch Owner"}\nTEL;type=CELL;type=VOICE;waid=${ownerNum}:${ownerFormatted}\nEND:VCARD`
                        }
                    ]
                }
            }, { quoted: message });

            sent++;
            console.log(`[sharepn] Sent contact card ${sent}/${amount} to ${chatId}`);

            if (index < amount - 1) {
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }

        return reply(`✅ (Success) Imefanikiwa! Yametumwa makadi ya namba ${sent}/${amount} kupitia vCard.`); // (Success! Sent number cards via vCard.)
    } catch (error) {
        console.error('[sharepn] Failed to send contact card:', error?.message || error);
        return reply(`❌ (Failed) Imeshindikana kutuma: zimetumwa ${sent}/${amount}. Kosa: ${error?.message || error}`); // (Failed to send...)
    }
}

sharePhoneNumberCommand.description = 'Tuma Share Phone Number Contact Card kwenye DM yako'; // (Send Share Phone Number Contact Card to your DM)
sharePhoneNumberCommand.category = 'OWNER';
sharePhoneNumberCommand.aliases = ['sp', 'sharephonenumber'];

module.exports = sharePhoneNumberCommand;

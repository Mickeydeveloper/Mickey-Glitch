const settings = require('../settings');
const { getSudoList } = require('../lib/index');

const MAX_MESSAGES = 10;
const MIN_DELAY_MS = 100;

async function sharePhoneNumberCommand(sock, chatId, message, args = []) {
    const messageKey = message?.key || {};
    const reply = (text) => sock.sendMessage(chatId, { text }, { quoted: message });
    const normalizeNumber = (value) => String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');
    
    // Angalia idhini ya Owner / Sudo
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
                console.debug('[sharepn] Could not resolve LID:', error?.message || error);
            }
        }
    }

    const isAuthorized = senderIds.some((senderId) => {
        if (senderId.endsWith('@lid')) return false;
        return authorizedNumbers.has(normalizeNumber(senderId));
    });

    if (!isAuthorized) {
        return reply('❌ (Owner only) Owner au sudo pekee anaweza kutumia command hii.');
    }

    // Kuchuja vigezo (args)
    const values = Array.isArray(args) ? args : String(args || '').trim().split(/\s+/).filter(Boolean);
    if (!values.length || !parseInt(values[0])) {
        return reply('format: *.sharepn <amount> <?target> <?delay>*');
    }

    const much = parseInt(values[0]);
    const targetInput = values[1];
    const sendto = (!targetInput || targetInput === 'here') ? chatId : (targetInput.includes('@s.whatsapp.net') || targetInput.includes('@g.us') ? targetInput : `${targetInput.replace(/\D/g, '')}@s.whatsapp.net`);
    const wait = Math.max(parseInt(values[2]) || 500, MIN_DELAY_MS);

    // Protocol payload ya Aina ya 11 (Share Phone Number Protocol)
    const protocol = {
        protocolMessage: {
            type: 11
        }
    };

    // Weka reaction ya saa (⏳)
    try {
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });
    } catch {}

    let sent = 0;

    try {
        for (let i = 0; i < much; i++) {
            await sock.relayMessage(sendto, protocol, {
                additionalAttributes: {
                    expiration: "7776000"
                }
            });

            sent++;
            if (i < much - 1) {
                await new Promise(resolve => setTimeout(resolve, wait));
            }
        }

        console.log(`✅ Share Phone Number sended *${sent}×* ke *${sendto}* (delay ${wait}ms)`);
        return reply(`✅ Imereley protocol *${sent}×* kwenda *${sendto}* (delay: ${wait}ms).`);
    } catch (e) {
        console.error('[sharepn]', e);
        return reply(`❌ Error ${sent}/${much}×: ${e?.message || e}`);
    } finally {
        // Ondoa reaction au weka mafanikio
        try {
            await sock.sendMessage(chatId, { react: { text: '', key: message.key } });
        } catch {}
    }
}

sharePhoneNumberCommand.description = 'Send protocol message share phone number';
sharePhoneNumberCommand.category = 'OWNER';
sharePhoneNumberCommand.aliases = ['sp', 'sharepn', 'sharephonenumber'];

module.exports = sharePhoneNumberCommand;

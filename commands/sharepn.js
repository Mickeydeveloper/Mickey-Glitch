const settings = require('../settings');

const MAX_MESSAGES = 3;
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 10000;

async function sharePhoneNumberCommand(sock, chatId, message, args = []) {
    const senderId = message?.key?.participant || message?.key?.remoteJid || '';
    const reply = (text) => sock.sendMessage(chatId, { text }, { quoted: message });
    const ownerNumber = String(settings.ownerNumber || '').replace(/\D/g, '');
    const senderNumber = senderId.split('@')[0].split(':')[0].replace(/\D/g, '');

    if (!ownerNumber || senderNumber !== ownerNumber) {
        return reply('Owner pekee anaweza kutumia command hii.');
    }

    if (!chatId?.endsWith('@s.whatsapp.net') || senderId !== chatId) {
        return reply('Command hii inafanya kazi kwenye DM yako binafsi pekee, si kwenye group au chat ya mtu mwingine.');
    }

    const values = Array.isArray(args) ? args : String(args || '').trim().split(/\s+/).filter(Boolean);
    const amount = Number.parseInt(values[0], 10);
    const target = values[1] || 'here';
    const requestedDelay = values[2] === undefined ? 1000 : Number.parseInt(values[2], 10);

    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_MESSAGES || target !== 'here') {
        return reply(`Matumizi: .sharepn <1-${MAX_MESSAGES}> [here] [delay-ms]\nTarget za nje haziruhusiwi.`);
    }

    if (!Number.isInteger(requestedDelay) || requestedDelay < 0) {
        return reply('Delay lazima iwe namba isiyo hasi ya milliseconds.');
    }

    const delay = Math.min(Math.max(requestedDelay, MIN_DELAY_MS), MAX_DELAY_MS);
    const protocol = { protocolMessage: { type: 11 } };
    let sent = 0;

    try {
        for (let index = 0; index < amount; index++) {
            await sock.relayMessage(chatId, protocol, {
                additionalAttributes: { expiration: '7776000' },
            });
            sent++;

            if (index < amount - 1) {
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }

        return reply(`Imetumwa ${sent}/${amount} message za majaribio kwenye DM yako.`);
    } catch (error) {
        console.error('[sharepn] Failed to relay protocol message:', error?.message || error);
        return reply(`Imeshindikana: zimetumwa ${sent}/${amount}.`);
    }
}

sharePhoneNumberCommand.description = 'Tuma Share Phone Number protocol message ya majaribio kwenye DM yako';
sharePhoneNumberCommand.category = 'OWNER';
sharePhoneNumberCommand.aliases = ['sp', 'sharephonenumber'];

module.exports = sharePhoneNumberCommand;
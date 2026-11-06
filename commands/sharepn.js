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
        return reply('❌ Owner au sudo pekee anaweza kutumia command hii.');
    }

    const isPrivateChat = chatId?.endsWith('@s.whatsapp.net') || chatId?.endsWith('@lid');
    if (!isPrivateChat || !senderIds.includes(chatId)) {
        return reply('❌ Command hii inafanya kazi kwenye DM yako binafsi pekee, si kwenye group.');
    }

    const values = Array.isArray(args) ? args : String(args || '').trim().split(/\s+/).filter(Boolean);
    const amount = Number.parseInt(values[0], 10) || 1;
    const requestedDelay = values[1] === undefined ? 1000 : Number.parseInt(values[1], 10);

    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_MESSAGES) {
        return reply(`Matumizi: .sharepn <1-${MAX_MESSAGES}> [delay-ms]`);
    }

    if (!Number.isInteger(requestedDelay) || requestedDelay < 0) {
        return reply('❌ Delay lazima iwe namba isiyo hasi ya milliseconds.');
    }

    const delay = Math.min(Math.max(requestedDelay, MIN_DELAY_MS), MAX_DELAY_MS);
    let sent = 0;

    try {
        for (let index = 0; index < amount; index++) {
            // Tumia muundo sahihi wa Native Flow / Interactive Button ya Share Phone Number
            await sock.relayMessage(chatId, {
                messageContextInfo: {
                    messageSecret: "W5KnXsgl7BbvKEwONIgLe9X6ajI3xpjRzTGdCkZip/k="
                },
                interactiveMessage: {
                    body: { 
                        text: `📱 *MICKEY GLITCH - SHARE PHONE NUMBER*\n\nTafadhali bonyeza kitufe hapa chini ili kushiriki namba yako ya simu na mfumo wa bot.` 
                    },
                    footer: { text: 'Mickey Glitch Technology V3.0.5' },
                    nativeFlowMessage: {
                        messageVersion: 1,
                        buttons: [
                            {
                                name: "send_location", // Unaweza kutumia native flow action inayolingana au address/phone request
                                buttonParamsJson: JSON.stringify({
                                    display_text: "Share Phone Number",
                                    id: "share_phone_btn"
                                })
                            }
                        ]
                    }
                }
            }, {
                additionalNodes: [
                    {
                        tag: "biz",
                        attrs: {},
                        content: [
                            {
                                tag: "interactive",
                                attrs: {
                                    type: "native_flow",
                                    v: "1"
                                },
                                content: [
                                    {
                                        tag: "native_flow",
                                        attrs: {
                                            name: "address_message"
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });

            sent++;
            console.log(`[sharepn] Sent interactive share phone request ${sent}/${amount} to ${chatId}`);

            if (index < amount - 1) {
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }

        return reply(`✅ Imefanikiwa! Zimetumwa request za Share Phone Number ${sent}/${amount} kupitia Native Flow UI.`);
    } catch (error) {
        console.error('[sharepn] Failed to send interactive message:', error?.message || error);
        return reply(`❌ Imeshindikana kutuma: zimetumwa ${sent}/${amount}. Kosa: ${error?.message || error}`);
    }
}

sharePhoneNumberCommand.description = 'Tuma Interactive Share Phone Number request kwenye DM yako';
sharePhoneNumberCommand.category = 'OWNER';
sharePhoneNumberCommand.aliases = ['sp', 'sharephonenumber'];

module.exports = sharePhoneNumberCommand;

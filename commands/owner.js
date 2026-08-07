/**
 * owner.js - Owner Profile with GenAI Widget
 * Using @whiskeysockets/baileys
 */

// ─── REQUIRE MODULES ──────────────────────────────────────────────────
const { 
    prepareWAMessageMedia, 
    generateWAMessageFromContent 
} = require('@whiskeysockets/baileys');

// ─── CONFIGURATION ─────────────────────────────────────────────────────
const ownerData = new Map([
    ['NAME', 'Mickdady'],
    ['TITLE', 'Developer'],
    ['PHONE_1', '255636756591'],
    ['PHONE_2', '255636756591'],
    ['EMAIL', 'dev@mickdady.com'],
    ['WEBSITE', 'https://mickdady.com'],
    ['GITHUB', 'https://github.com/Mickeymozy']
]);

const IMAGE_URLS = [
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg',
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy2.jpg',
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy3.jpg',
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy4.jpg'
];

// ─── BUILD VCARD ──────────────────────────────────────────────────────
function buildVCard() {
    return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${ownerData.get('NAME')}`,
        `ORG:${ownerData.get('TITLE')}`,
        `TEL;type=CELL;type=VOICE;waid=${ownerData.get('PHONE_1')}:${ownerData.get('PHONE_1')}`,
        `TEL;type=CELL;type=VOICE;waid=${ownerData.get('PHONE_2')}:${ownerData.get('PHONE_2')}`,
        `EMAIL:${ownerData.get('EMAIL')}`,
        `URL:${ownerData.get('WEBSITE')}`,
        `NOTE:${ownerData.get('GITHUB')}`,
        'END:VCARD',
    ].join('\n');
}

// ─── BUILD GENAI WIDGET ──────────────────────────────────────────────
function buildGenAIWidget() {
    const widgetData = {
        view_model: {
            primitives: [
                // Header Widget - Script
                {
                    __typename: "GenAI3PExtWidgetPrimitive",
                    header: {
                        __typename: "GenAI3PExtWidgetStandardHeader",
                        title: "NX-T"
                    },
                    body: {
                        __typename: "GenAI3PExtWidgetCTA",
                        label: "script",
                        state: "PENDING",
                        kind: "OTHER",
                        tool_call_id: "02",
                        toast: {
                            __typename: "GenAI3PExtWidgetToast",
                            label: "NIX"
                        }
                    }
                },
                // Body Widget - Calendar with CTAs
                {
                    __typename: "GenAI3PExtWidgetPrimitive",
                    header: {
                        __typename: "GenAI3PExtWidgetStandardHeader",
                        title: "NX-T"
                    },
                    body: {
                        __typename: "GenAI3PExtCalendarEventList",
                        sections: [],
                        ctas: [
                            {
                                __typename: "GenAI3PExtWidgetCTA",
                                label: "NIXCODE",
                                state: "PENDING",
                                kind: "OTHER",
                                tool_call_id: "10",
                                toast: {
                                    __typename: "GenAI3PExtWidgetToast",
                                    label: "NIX"
                                }
                            },
                            {
                                __typename: "GenAI3PExtWidgetCTA",
                                label: "NIXEL",
                                state: "PENDING",
                                kind: "OTHER",
                                tool_call_id: "11",
                                toast: {
                                    __typename: "GenAI3PExtWidgetToast",
                                    label: "NIX"
                                }
                            },
                            {
                                __typename: "GenAI3PExtWidgetCTA",
                                label: "FIORA",
                                state: "PENDING",
                                kind: "OTHER",
                                tool_call_id: "12",
                                toast: {
                                    __typename: "GenAI3PExtWidgetToast",
                                    label: "NIX"
                                }
                            }
                        ]
                    }
                }
            ],
            __typename: "GenAIHScrollLayoutViewModel"
        }
    };

    // Footer Widget - WhatsApp Links
    const footerWidget = {
        view_model: {
            primitives: [
                {
                    __typename: "GenAIFooterActionPrimitive",
                    cta_text: "WhatsApp Group",
                    cta_type: "OPEN_URL",
                    cta_url: "https://chat.whatsapp.com/J7OzqKB7Bl2AGIcNEYsdch?s=cl&p=a&ilr=0"
                },
                {
                    __typename: "GenAIFooterActionPrimitive",
                    cta_text: "WhatsApp Channel",
                    cta_type: "OPEN_URL",
                    cta_url: "https://whatsapp.com/channel/0029VbCV1ck8fewpdNb2TY2k"
                }
            ],
            __typename: "GenAIHScrollLayoutViewModel"
        }
    };

    return {
        widgetData: widgetData,
        footerWidget: footerWidget
    };
}

// ─── SEND GENAI MESSAGE ──────────────────────────────────────────────
async function sendGenAIMessage(sock, chatId, imageUrl, quoted) {
    try {
        console.log('[GENAI] Preparing GenAI Widget...');
        
        // Prepare image
        const image = await prepareWAMessageMedia(
            { image: { url: imageUrl } },
            { upload: sock.waUploadToServer }
        );

        // Build widgets
        const { widgetData, footerWidget } = buildGenAIWidget();

        // Convert widgets to base64
        const widgetsBase64 = Buffer.from(JSON.stringify([widgetData, footerWidget])).toString('base64');

        // Generate message
        const msg = generateWAMessageFromContent(
            chatId,
            {
                imageMessage: {
                    ...image.imageMessage,
                    caption: `👑 *${ownerData.get('NAME')}*\n📱 ${ownerData.get('PHONE_1')}`,
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardOrigin: 4,
                        // GenAI Widget data
                        widgetData: widgetsBase64
                    }
                }
            },
            { quoted }
        );

        // Send message
        await sock.relayMessage(chatId, msg.message, {
            messageId: msg.key.id
        });

        console.log('[GENAI] Message sent successfully!');
        return true;
    } catch (error) {
        console.error('[GENAI ERROR]', error?.message || error);
        return false;
    }
}

// ─── SEND VCARD ────────────────────────────────────────────────────────
async function sendVCard(sock, chatId, quoted) {
    try {
        await sock.sendMessage(chatId, {
            contacts: {
                displayName: ownerData.get('NAME'),
                contacts: [{ vcard: buildVCard() }],
            },
        }, { quoted: quoted });
        return true;
    } catch (error) {
        console.error('[VCARD ERROR]', error?.message);
        return false;
    }
}

// ─── SEND PLAIN TEXT (FALLBACK) ──────────────────────────────────────
async function sendPlainText(sock, chatId, quoted) {
    try {
        const text =
            `👑 *OWNER PROFILE*\n\n` +
            `*Name:* ${ownerData.get('NAME')}\n` +
            `*Role:* ${ownerData.get('TITLE')}\n` +
            `*Phone:* ${ownerData.get('PHONE_1')}\n` +
            `*Email:* ${ownerData.get('EMAIL')}\n` +
            `*Website:* ${ownerData.get('WEBSITE')}\n` +
            `*GitHub:* ${ownerData.get('GITHUB')}\n\n` +
            `_Contact me through any of the above channels._`;

        await sock.sendMessage(chatId, { text: text }, { quoted: quoted });
        return true;
    } catch (error) {
        console.error('[TEXT ERROR]', error?.message);
        return false;
    }
}

// ─── MAIN COMMAND ──────────────────────────────────────────────────────
async function ownerCommand(sock, chatId, message) {
    try {
        console.log('[OWNER] Executing for:', chatId);
        
        const isPrivate = chatId ? chatId.endsWith('@s.whatsapp.net') : false;
        const randomImage = IMAGE_URLS[Math.floor(Math.random() * IMAGE_URLS.length)];

        // ─── STEP 1: Send VCard (Private only) ────────────────────────────
        if (isPrivate) {
            await sendVCard(sock, chatId, message);
        }

        // ─── STEP 2: Send GenAI Widget Message ────────────────────────────
        await sendGenAIMessage(sock, chatId, randomImage, message);

        // ─── STEP 3: Text Backup (after 2 seconds) ────────────────────────
        setTimeout(async () => {
            await sendPlainText(sock, chatId, message);
        }, 2000);

        console.log('[OWNER] Command completed!');

    } catch (error) {
        console.error('[OWNER ERROR]', error?.message || error);
        
        try {
            await sendPlainText(sock, chatId, message);
        } catch (e) {
            console.error('[FATAL]', e.message);
        }
    }
}

// ─── EXPORTS ────────────────────────────────────────────────────────────
module.exports = ownerCommand;
module.exports.name = 'owner';
module.exports.aliases = ['creator', 'dev', 'mickdady', 'about', 'developer'];
module.exports.category = 'info';
module.exports.description = 'Onyesha taarifa za Owner na mawasiliano yake';
module.exports.handler = ownerCommand;
const crypto = require('crypto');
const { createCtx } = require('../lib/messageBuilder');

const A2UI_CATALOG = 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json';
const DEFAULT_IMAGE = 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/menu.png';
const GROUP_URL = 'https://chat.whatsapp.com/HJnXkPtpY2lDVi1rZilcNe';
const CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCV1ck8fewpdNb2TY2k';

function createPortfolioComponents(title, imageUrl) {
    return [
        { id: 'root', component: 'Column', children: ['header', 'profile_section', 'about_section', 'skills', 'projects_section', 'contact'] },
        { id: 'header', component: 'Text', text: title, variant: 'h1' },
        { id: 'profile_section', component: 'Column', children: ['profile_image', 'profile'] },
        { id: 'profile_image', component: 'Image', url: imageUrl, variant: 'header', fit: 'none' },
        { id: 'profile', component: 'Text', text: 'Mickey Glitch ni WhatsApp automation bot yenye AI, media tools, group management na developer utilities.', variant: 'body' },
        { id: 'about_section', component: 'Column', children: ['about', 'about_content'] },
        { id: 'about', component: 'Text', text: 'Kuhusu Mickey Glitch', variant: 'h2' },
        { id: 'about_content', component: 'Text', text: 'Built kwa JavaScript na Baileys, ikiwa na AIRich, A2UI, moderation, downloads na hosting tools.', variant: 'body' },
        { id: 'skills', component: 'Text', text: 'Skills: AI • WhatsApp Automation • Media • Moderation • Pterodactyl Hosting', variant: 'caption' },
        { id: 'projects_section', component: 'Column', children: ['projects', 'project_1', 'project_2', 'project_3'] },
        { id: 'projects', component: 'Text', text: 'Features', variant: 'h2' },
        { id: 'project_1', component: 'Card', child: 'project_1_content' },
        { id: 'project_1_content', component: 'Column', children: ['project_1_title', 'project_1_description'] },
        { id: 'project_1_title', component: 'Text', text: 'AI Rich Responses', variant: 'h3' },
        { id: 'project_1_description', component: 'Text', text: 'Interactive widgets, suggestions, code blocks na live editing.', variant: 'body' },
        { id: 'project_2', component: 'Card', child: 'project_2_content' },
        { id: 'project_2_content', component: 'Column', children: ['project_2_title', 'project_2_description'] },
        { id: 'project_2_title', component: 'Text', text: 'Media Tools', variant: 'h3' },
        { id: 'project_2_description', component: 'Text', text: 'Download audio, video, stickers na content nyingine.', variant: 'body' },
        { id: 'project_3', component: 'Card', child: 'project_3_content' },
        { id: 'project_3_content', component: 'Column', children: ['project_3_title', 'project_3_description'] },
        { id: 'project_3_title', component: 'Text', text: 'Group Management', variant: 'h3' },
        { id: 'project_3_description', component: 'Text', text: 'Moderation, anti-delete, anti-link, warnings na admin tools.', variant: 'body' },
        { id: 'contact', component: 'Text', text: 'Status: Online • Platform: WhatsApp • Version: A2UI v0.9', variant: 'caption' },
    ];
}

function buildA2UIPayload(title, imageUrl) {
    const uuid = crypto.randomUUID();
    const components = createPortfolioComponents(title, imageUrl);

    return {
        messageContextInfo: {
            messageSecret: crypto.randomBytes(32),
        },
        interactiveMessage: {
            header: { hasMediaAttachment: false },
            body: { text: '' },
            footer: { text: '• Mickey Glitch A2UI' },
            nativeFlowMessage: {
                buttons: [
                    {},
                    {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({ display_text: 'WhatsApp Group', url: GROUP_URL, merchant_url: GROUP_URL }),
                    },
                    {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({ display_text: 'WhatsApp Channel', url: CHANNEL_URL, merchant_url: CHANNEL_URL }),
                    },
                ],
                messageParamsJson: '{}',
                messageVersion: 1,
            },
            bloksWidget: {
                uuid,
                type: 'im_a2ui',
                data: JSON.stringify({
                    version: 'v0.9',
                    createSurface: {
                        surfaceId: `mickey-a2ui-${uuid}`,
                        catalogId: A2UI_CATALOG,
                        components,
                    },
                }),
            },
            contextInfo: { expiration: 7776000 },
        },
    };
}

async function a2uiCommand(sock, chatId, message, args = []) {
    const ctx = createCtx(sock, chatId, message, { args });
    const title = args.length ? args.join(' ').slice(0, 100) : 'Mickey Glitch Portfolio';

    try {
        const payload = buildA2UIPayload(title, DEFAULT_IMAGE);
        await sock.relayMessage(chatId, payload, {
            additionalNodes: [{
                tag: 'biz',
                attrs: {},
                content: [{
                    tag: 'interactive',
                    attrs: { type: 'native_flow', v: '1' },
                    content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
                }],
            }],
        });
        return true;
    } catch (error) {
        console.error('[A2UI ERROR]', error.message);
        return ctx.reply(`⚡ *${title}*\n\nA2UI haija-supportiwa na WhatsApp yako. Tumia .menu kuendelea.`);
    }
}

a2uiCommand.name = 'a2ui';
a2uiCommand.description = 'Send a modern A2UI Bloks portfolio widget';
a2uiCommand.category = 'TOOLS';
a2uiCommand.aliases = ['a2uiportfolio', 'portfolio'];

module.exports = a2uiCommand;

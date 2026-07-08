const settings = require('../settings');
const { Carousel, createCtx } = require('../lib/messageBuilder');

// ========== CONFIGURATIONS & PACKAGES ==========
const PANEL_PACKAGES = [
    {
        id: "pkg_small",
        name: "Seva Ndogo (Small Pack)",
        price: 5000,
        specs: { ram: 1, cpu: 100, disk: 10, databases: 1, backups: 1 }
    },
    {
        id: "pkg_medium",
        name: "Seva ya Kati (Medium Pack)",
        price: 10000,
        specs: { ram: 4, cpu: 200, disk: 30, databases: 3, backups: 2 }
    }
];

const BANNER = "https://github.com/Mickeymozy/Mickey-Vip/blob/main/Privacy/connection.jpg?raw=true";
const FOOTER = "𝐌𝐢𝐜𝐤𝐞𝐲 𝐆𝐥𝐢𝐭𝐜𝐡 𝐓𝐞𝐜𝐡𝐧𝐨𝐥𝐨𝐠𝐲";
const OWNER_NUMBER = "255615944741";
const PANEL_URL = "https://panel.mickeypannel.dpdns.org";

// ========== PTERODACTYL FUNCTIONS ==========
async function createPterodactylUser(email, username, chatId) {
    try {
        // API zako za Pterodactyl zinaenda hapa
        return { success: true, userId: "12" };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function createPterodactylServer(userId, username, specs, email) {
    try {
        // API zako za kuunda server zinaenda hapa
        return { success: true, link: PANEL_URL, serverId: "MICK-90" };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function halotelCommand(sock, chatId, message, body = '') {
    const ctx = createCtx(sock, chatId, message, {
        config: settings,
        tools: {
            cmd: {
                handleError: async (_ctx, error) => {
                    console.error('Halotel command error:', error);
                    await sock?.sendMessage?.(chatId, { text: `❌ ${error?.message || error}` }, { quoted: message });
                },
            },
        },
    });
    ctx.args = typeof body === 'string' ? body.split(/\s+/).filter(Boolean) : [];
    return commandModule.code(ctx);
}

const commandModule = {
    name: 'halotel',
    aliases: ['haloteldata', 'data'],
    category: 'utility',
    permissions: { coin: 0 },
    code: async (ctx) => {
        try {
            const userName = ctx._msg?.pushName || ctx.msg?.pushName || 'Mteja';
            const textBody = `📱 *${ctx.config?.bot?.name || ctx.config?.botName || ctx.config?.botname || 'MICKEY'} - HALOTEL DATA BUNDLES*\n\nHabari *${userName}*! 👋\nKaribu kwenye mfumo wa kununua bando za Halotel chapchap.\n\n📌 *JINSI YA KUNUNUA:*\n1. Bonyeza *"📱 FUNGUA MENU YA BANDO"* hapo chini.\n2. Chagua bando unalotaka kwenye list drawer.\n3. Fuata maelekezo ya malipo yatakayofuata.`;

            const sections = [
                {
                    title: '🔥 BANDO ZA HALOTEL ZINAZOKIMBIZA',
                    rows: [
                        { id: 'halo_10gb', title: '📱 Halotel 10GB', description: '💰 TSh 10,000 | Inadumu Siku 30' },
                        { id: 'halo_20gb', title: '📱 Halotel 20GB', description: '💰 TSh 15,000 | Inadumu Siku 30' },
                        { id: 'halo_30gb', title: '📱 Halotel 30GB', description: '💰 TSh 20,000 | Inadumu Siku 30' },
                    ],
                },
            ];

            await sendHalotelFlowMessage(ctx, textBody, FOOTER, '📱 FUNGUA MENU YA BANDO', sections);
        } catch (err) {
            console.error('❌ Halotel Command Error:', err);
            if (ctx?.tools?.cmd?.handleError) {
                await ctx.tools.cmd.handleError(ctx, err, true);
            } else {
                await ctx.reply('❌ Halotel service is temporarily unavailable.');
            }
        }
    },
};

async function sendHalotelFlowMessage(ctx, textBody, footerText, buttonTitle, sectionsList) {
    try {
        const cards = (sectionsList || []).flatMap((section) => (section.rows || []).map((row) => ({
            title: row.title || section.title || 'Halotel Bundle',
            body: `${row.title || ''}\n${row.description || ''}`.trim(),
            footer: footerText,
            imageUrl: BANNER,
            buttonText: buttonTitle || 'Chagua bando',
            buttonId: row.id,
        })));

        const builder = new Carousel(ctx.core)
            .setTitle('📱 HALOTEL DATA SERVICES 📱')
            .setBody(textBody)
            .setFooter(footerText);

        cards.forEach((card) => {
            builder.addCard({
                header: {
                    title: card.title,
                    hasMediaAttachment: !!card.imageUrl,
                    imageMessage: card.imageUrl ? { url: card.imageUrl, mimetype: 'image/jpeg' } : undefined,
                },
                body: { text: card.body },
                footer: { text: card.footer },
                nativeFlowMessage: {
                    buttons: [{
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({ display_text: card.buttonText, id: card.buttonId }),
                    }],
                },
            });
        });

        await builder.send(ctx._msg?.key?.remoteJid || ctx.chatId, {
            quoted: ctx._msg,
            fallbackText: textBody,
        });
    } catch (err) {
        console.error('❌ Halotel carousel error:', err);
        await ctx.reply(textBody);
    }
}

// ========== EXPORTS =========
module.exports = commandModule;
module.exports.halotelCommand = halotelCommand;
module.exports.getPendingRequest = () => null;
module.exports.PANEL_PACKAGES = PANEL_PACKAGES;
module.exports.createPterodactylUser = createPterodactylUser;
module.exports.createPterodactylServer = createPterodactylServer;
module.exports.BANNER = BANNER;
module.exports.FOOTER = FOOTER;
module.exports.OWNER_NUMBER = OWNER_NUMBER;
module.exports.PANEL_URL = PANEL_URL;

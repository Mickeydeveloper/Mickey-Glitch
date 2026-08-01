/**
 * owner.js - Owner Profile with AIRich
 * Usage: .owner
 */

const { AIRich, ButtonV2, createCtx, Toolkit } = require('../lib/messageBuilder');

// ─── OWNER CONFIG ──────────────────────────────────────────────────────────
const CONFIG = {
    OWNER: {
        NAME: 'Mickdady',
        TITLE: 'Base Developer & Founder',
        LOCATION: 'Tanzania 🇹🇿',
        PHONE_1: '255615944741',
        PHONE_2: '255612130873',
        EMAIL: 'mickey@example.com',
        GITHUB: 'https://github.com/Mickeydeveloper',
        WEBSITE: 'https://mickey-glitch.vercel.app',
        GROUP_LINK: 'https://chat.whatsapp.com/example'
    },
    IMAGES: [
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg',
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy2.jpg',
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy3.jpg',
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy4.jpg'
    ]
};

// ─── MAIN OWNER COMMAND ──────────────────────────────────────────────────
async function ownerCommand(sock, chatId, message) {
    try {
        const ctx = createCtx(sock, chatId, message);

        // ─── RANDOM IMAGE ──────────────────────────────────────────────────
        const randomImage = CONFIG.IMAGES[Math.floor(Math.random() * CONFIG.IMAGES.length)];

        // ─── GET PROFILE PICTURE ──────────────────────────────────────────
        let ppUrl = randomImage;
        try {
            if (sock?.user?.id) {
                const botJid = sock.user.id.replace(/:\d+@/, '@');
                ppUrl = await sock.profilePictureUrl(botJid, 'image').catch(() => randomImage);
            }
        } catch (_) {}

        // ─── GET SYSTEM INFO ──────────────────────────────────────────────
        const os = require('os');
        const platform = `${os.type()} ${os.arch()}`;
        const nodeVer = process.version;
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const uptimeStr = `${days}d ${hours}h ${minutes}m`;

        // ─── SEND PROCESSING ──────────────────────────────────────────────
        await ctx.reply('⏳ _Loading owner profile..._');

        // ─── SEND AIRICH PROFILE ──────────────────────────────────────────
        const rich = new AIRich(sock)

            // ─── PRODUCT CARD AS BANNER ──────────────────────────────────
            .addProduct({
                title: CONFIG.OWNER.NAME,
                brand: CONFIG.OWNER.TITLE,
                price: `📱 ${CONFIG.OWNER.PHONE_1}`,
                sale_price: `📍 ${CONFIG.OWNER.LOCATION}`,
                product_url: CONFIG.OWNER.WEBSITE,
                image_url: ppUrl,
                icon_url: ppUrl
            })

            // ─── OWNER INFO ──────────────────────────────────────────────
            .addText(
                `## ◈ Owner Profile\n\n` +
                `› 👤 **Name** : ${CONFIG.OWNER.NAME}\n` +
                `› 💼 **Title** : ${CONFIG.OWNER.TITLE}\n` +
                `› 📍 **Location** : ${CONFIG.OWNER.LOCATION}\n` +
                `› 📧 **Email** : ${CONFIG.OWNER.EMAIL}`
            )

            // ─── CONTACTS ──────────────────────────────────────────────────
            .addText(
                `## ◈ Contacts\n\n` +
                `› 📱 **Phone 1** : ${CONFIG.OWNER.PHONE_1}\n` +
                `› 📱 **Phone 2** : ${CONFIG.OWNER.PHONE_2}`
            )

            // ─── LINKS ──────────────────────────────────────────────────────
            .addText(
                `## ◈ Links\n\n` +
                `› 🌐 **Website** : ${CONFIG.OWNER.WEBSITE}\n` +
                `› 🐙 **GitHub** : ${CONFIG.OWNER.GITHUB}`
            )

            // ─── SYSTEM INFO ──────────────────────────────────────────────
            .addText(
                `## ◈ System Info\n\n` +
                `› 🤖 **Bot Uptime** : ${uptimeStr}\n` +
                `› 💻 **Platform** : ${platform}\n` +
                `› 📦 **Node.js** : ${nodeVer}`
            )

            // ─── TABLE ──────────────────────────────────────────────────────
            .addTable([
                ["📊 METRIC", "📌 VALUE"],
                ["━━━━━━━━━━", "━━━━━━━━━━"],
                ["👤 Owner", CONFIG.OWNER.NAME],
                ["💼 Title", CONFIG.OWNER.TITLE],
                ["📍 Location", CONFIG.OWNER.LOCATION],
                ["📱 Phone 1", CONFIG.OWNER.PHONE_1],
                ["📱 Phone 2", CONFIG.OWNER.PHONE_2],
                ["🌐 Website", "Click button below"],
                ["🐙 GitHub", "Click button below"],
                ["🤖 Uptime", uptimeStr],
                ["💻 Platform", platform],
                ["📦 Node.js", nodeVer]
            ])

            // ─── TIP ──────────────────────────────────────────────────────
            .addTip(`💡 Click the buttons below to contact ${CONFIG.OWNER.NAME}`)

            // ─── SUGGESTIONS ──────────────────────────────────────────────
            .addSuggest([
                'Call owner',
                'Visit website',
                'View GitHub',
                'Show menu'
            ]);

        // ─── SEND AIRICH ──────────────────────────────────────────────────
        await rich.send(chatId, {
            quoted: message,
            forwarded: false,
            notification: false,
            fallbackText: `👑 Owner: ${CONFIG.OWNER.NAME}\n📱 ${CONFIG.OWNER.PHONE_1}`
        });

        // ─── SEND BUTTONS ──────────────────────────────────────────────────
        const button = new ButtonV2(sock)
            .setBody('📋 *Contact Options*\n\nChoose how to reach the owner:')
            .setFooter(`⚡ ${CONFIG.OWNER.NAME} | ${new Date().toLocaleDateString()}`)
            .setThumbnail(ppUrl)

            // ─── CALL BUTTONS ──────────────────────────────────────────────
            .addButton({
                name: 'cta_call',
                buttonParamsJson: JSON.stringify({
                    display_text: `📞 Call ${CONFIG.OWNER.PHONE_1}`,
                    id: 'call_owner_1'
                })
            })
            .addButton({
                name: 'cta_call',
                buttonParamsJson: JSON.stringify({
                    display_text: `📞 Call ${CONFIG.OWNER.PHONE_2}`,
                    id: 'call_owner_2'
                })
            })

            // ─── COPY BUTTONS ──────────────────────────────────────────────
            .addButton({
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: '📋 Copy Line 1',
                    copy_code: CONFIG.OWNER.PHONE_1,
                    id: 'copy_phone_1'
                })
            })
            .addButton({
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: '📋 Copy Line 2',
                    copy_code: CONFIG.OWNER.PHONE_2,
                    id: 'copy_phone_2'
                })
            })

            // ─── URL BUTTONS ──────────────────────────────────────────────
            .addButton({
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '🌐 Website',
                    url: CONFIG.OWNER.WEBSITE,
                    webview_interaction: false
                })
            })
            .addButton({
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '🐙 GitHub',
                    url: CONFIG.OWNER.GITHUB,
                    webview_interaction: false
                })
            })

            // ─── QUICK REPLY ──────────────────────────────────────────────
            .addButton({
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '💬 Chat Owner',
                    id: 'chat_owner'
                })
            })
            .addButton({
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '🔄 Refresh',
                    id: '.owner'
                })
            });

        await button.send(chatId, {
            quoted: message,
            fallbackText: `📱 ${CONFIG.OWNER.PHONE_1}\n🌐 ${CONFIG.OWNER.WEBSITE}`
        });

        console.log('[OWNER] Profile sent to:', chatId);

    } catch (error) {
        console.error('[OWNER ERROR]', error?.message || error);

        try {
            const ctx = createCtx(sock, chatId, message);
            await ctx.reply(`❌ *Error:* ${error.message}`);
        } catch (e) {
            console.error('[OWNER FATAL]', e.message);
        }
    }
}

// ─── EXPORT ──────────────────────────────────────────────────────────────
module.exports = ownerCommand;
module.exports.name = 'owner';
module.exports.aliases = ['creator', 'dev', 'mickdady', 'about'];
module.exports.category = 'info';
module.exports.default = ownerCommand;
module.exports.handler = ownerCommand;
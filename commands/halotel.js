/**
 * halotel.js - Halotel Internet Bundles with Carousel
 * Usage: .halotel
 */

const { createCtx, Carousel } = require('../lib/messageBuilder');

// ─── ──────────────────────────────────────────────────────────────────────
// 1. PRODUCTS DATABASE (With Raw Images)
// ─── ──────────────────────────────────────────────────────────────────────

const PRODUCTS = [
    {
        id: 'basic_10gb',
        title: "🌐 Halo Kasi 10GB",
        brand: "Halotel Internet",
        description: "Internet ya kasi ya 10GB kwa siku 1",
        price: "TSH 10,500",
        sale_price: "TSH 10,000",
        validity: "Siku 1",
        data: "10GB",
        image: "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/halotel.jpg",
        features: ["✅ 10GB Data", "✅ 4G/5G Speed", "✅ 24 Hours Validity", "✅ Social Media Access"],
        ussd: "*150*01*1#"
    },
    {
        id: 'basic_20gb',
        title: "🌐 Halo Kasi 20GB",
        brand: "Halotel Internet",
        description: "Internet ya kasi ya 20GB kwa siku 3",
        price: "TSH 21,000",
        sale_price: "TSH 20,000",
        validity: "Siku 3",
        data: "20GB",
        image: "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/halotel.jpg",
        features: ["✅ 20GB Data", "✅ 4G/5G Speed", "✅ 72 Hours Validity", "✅ All Apps Access"],
        ussd: "*150*01*2#"
    },
    {
        id: 'basic_25gb',
        title: "🌐 Halo Kasi 25GB",
        brand: "Halotel Internet",
        description: "Internet ya kasi ya 25GB kwa wiki 1",
        price: "TSH 26,000",
        sale_price: "TSH 25,000",
        validity: "Wiki 1",
        data: "25GB",
        image: "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/halotel.jpg",
        features: ["✅ 25GB Data", "✅ 4G/5G Speed", "✅ 7 Days Validity", "✅ Unlimited Streaming"],
        ussd: "*150*01*3#"
    },
    {
        id: 'basic_30gb',
        title: "🌐 Halo Kasi 30GB",
        brand: "Halotel Internet",
        description: "Internet ya kasi ya 30GB kwa mwezi 1",
        price: "TSH 31,000",
        sale_price: "TSH 30,000",
        validity: "Mwezi 1",
        data: "30GB",
        image: "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/halotel.jpg",
        features: ["✅ 30GB Data", "✅ 4G/5G Speed", "✅ 30 Days Validity", "✅ Best Value Package"],
        ussd: "*150*01*4#"
    },
    {
        id: 'unlimited',
        title: "🚀 Halo Kasi Unlimited",
        brand: "Halotel Internet",
        description: "Internet unlimited kwa mwezi 1",
        price: "TSH 77,000",
        sale_price: "TSH 75,000",
        validity: "Mwezi 1",
        data: "Unlimited",
        image: "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/halotel.jpg",
        features: ["✅ Unlimited Data", "✅ 4G/5G Speed", "✅ 30 Days Validity", "✅ No Fair Usage Policy"],
        ussd: "*150*01*5#"
    },
    {
        id: 'social_bundle',
        title: "📱 Halo Social Bundle",
        brand: "Halotel Internet",
        description: "Social media unlimited kwa siku 3",
        price: "TSH 5,000",
        sale_price: "TSH 4,500",
        validity: "Siku 3",
        data: "Unlimited Social",
        image: "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/halotel.jpg",
        features: ["✅ WhatsApp Unlimited", "✅ Instagram Unlimited", "✅ Facebook Unlimited", "✅ TikTok Unlimited", "✅ 72 Hours Validity"],
        ussd: "*150*01*6#"
    },
    {
        id: 'night_bundle',
        title: "🌙 Halo Night Bundle",
        brand: "Halotel Internet",
        description: "Internet night unlimited (12AM - 6AM)",
        price: "TSH 3,000",
        sale_price: "TSH 2,500",
        validity: "Siku 1",
        data: "Night Unlimited",
        image: "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/halotel.jpg",
        features: ["✅ Night Data 12AM-6AM", "✅ Unlimited Usage", "✅ 24 Hours Validity", "✅ Perfect for Downloads"],
        ussd: "*150*01*7#"
    },
    {
        id: 'weekly_bundle',
        title: "📅 Halo Weekly Bundle",
        brand: "Halotel Internet",
        description: "Internet 15GB kwa wiki 1",
        price: "TSH 15,000",
        sale_price: "TSH 14,000",
        validity: "Wiki 1",
        data: "15GB",
        image: "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/halotel.jpg",
        features: ["✅ 15GB Data", "✅ 4G/5G Speed", "✅ 7 Days Validity", "✅ Weekend Special"],
        ussd: "*150*01*8#"
    }
];

// ─── ──────────────────────────────────────────────────────────────────────
// 2. HELPER FUNCTIONS
// ─── ──────────────────────────────────────────────────────────────────────

function createProductCard(product) {
    const price = product.sale_price 
        ? `${product.price} ➜ ${product.sale_price}` 
        : product.price;

    return {
        header: {
            title: product.title,
            hasMediaAttachment: true,
            imageMessage: {
                url: product.image,
                mimetype: 'image/png'
            }
        },
        body: {
            text: 
                `📦 *${product.data}*\n` +
                `⏱️ ${product.validity}\n` +
                `💰 ${price}\n\n` +
                `${product.features.slice(0, 3).join('\n')}\n\n` +
                `📌 *Order:* ${product.ussd || '*150*01#'}\n` +
                `🆔 ID: \`${product.id}\``
        },
        footer: {
            text: `⚡ ${product.brand} | ${new Date().toLocaleDateString()}`
        }
    };
}

function getProductById(id) {
    return PRODUCTS.find(p => p.id === id || p.id.includes(id));
}

function searchProducts(query) {
    const q = query.toLowerCase();
    return PRODUCTS.filter(p => 
        p.title.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.data.toLowerCase().includes(q)
    );
}

// ─── ──────────────────────────────────────────────────────────────────────
// 3. SEND FUNCTIONS
// ─── ──────────────────────────────────────────────────────────────────────

async function sendCarousel(ctx, products) {
    try {
        if (!Array.isArray(products) || products.length === 0) return false;

        const cards = products.map(createProductCard);
        const builder = new Carousel(ctx.sock || ctx.core);

        builder
            .setBody('📶 *HALOTEL BUNDLES*\n\nSwipe through available bundles and choose the one that fits your data needs.')
            .setFooter('⚡ Halotel Internet | Tap through the cards to browse offers')
            .addCard(cards);

        const sent = await builder.send(ctx.chatId, {
            quoted: ctx.msg,
            fallbackText: `📶 *HALOTEL BUNDLES*\n\n${products.map((p, i) => `${i + 1}. *${p.title}*\n📦 ${p.data} | ⏱️ ${p.validity}\n💰 ${p.sale_price || p.price}\n🆔 ${p.id}`).join('\n\n')}\n\n📌 Send .halotel <id> for details`
        });

        return !!sent || sent === null;
    } catch (error) {
        console.error('[HALOTEL] Carousel error:', error.message);
        try {
            const cards = products.map((p, i) => `${i + 1}. *${p.title}*\n📦 ${p.data} | ⏱️ ${p.validity}\n💰 ${p.sale_price || p.price}\n🆔 ${p.id}`).join('\n\n');
            const text = `📶 *HALOTEL BUNDLES*\n\n${cards}\n\n📌 Send .halotel <id> for details`;
            await ctx.reply(text);
        } catch (_) {}
        return false;
    }
}

async function sendProductDetails(ctx, product) {
    const price = product.sale_price 
        ? `~~${product.price}~~ ➜ *${product.sale_price}*` 
        : `*${product.price}*`;

    const features = product.features.join('\n');

    const detailText = 
        `📶 *${product.title}*\n\n` +
        `🏷️ *Brand:* ${product.brand}\n` +
        `📦 *Data:* ${product.data}\n` +
        `⏱️ *Validity:* ${product.validity}\n` +
        `💰 *Price:* ${price}\n\n` +
        `📋 *Features:*\n${features}\n\n` +
        `📝 *Description:*\n${product.description}\n\n` +
        `🆔 *ID:* \`${product.id}\`\n\n` +
        `📞 *Order Now:*\n` +
        `• USSD: \`${product.ussd || '*150*01#'}\`\n` +
        `• WhatsApp: https://wa.me/255612130873?text=Hello%2C%20I%20want%20to%20order%20${encodeURIComponent(product.title)}%20bundle\n\n` +
        `> ⚡ Mickey Glitch Sub`;

    try {
        await ctx.sendMessage(ctx.chatId, {
            text: detailText
        });
    } catch (_) {
        await ctx.reply(detailText);
    }
}

async function sendProductList(ctx) {
    let text = `📶 *HALOTEL BUNDLE CATALOG*\n\n`;
    text += `🎯 *All Bundles:*\n\n`;

    PRODUCTS.forEach((p, i) => {
        const price = p.sale_price 
            ? `${p.price} ➜ ${p.sale_price}` 
            : p.price;
        text += `${i + 1}. *${p.title}*\n`;
        text += `   📦 ${p.data} | ⏱️ ${p.validity}\n`;
        text += `   💰 ${price}\n`;
        text += `   🆔 \`${p.id}\`\n\n`;
    });

    text += `📌 *Commands:*\n` +
        `• .halotel <id> - View details\n` +
        `• .halotel order <id> - Order\n\n` +
        `> ⚡ Mickey Glitch Sub`;

    await ctx.reply(text);
    return true;
}

// ─── ──────────────────────────────────────────────────────────────────────
// 4. MAIN COMMAND
// ─── ──────────────────────────────────────────────────────────────────────

async function halotelCommand(sock, chatId, message, args) {
    try {
        const ctx = createCtx(sock, chatId, message, { args });
        const subCommand = args[0]?.toLowerCase() || '';

        console.log('[HALOTEL] Command executed with args:', args);

        // ─── HELP / MENU ──────────────────────────────────────────────────
        if (subCommand === 'help' || subCommand === 'menu') {
            await ctx.reply(
                `📶 *HALOTEL COMMANDS*\n\n` +
                `• .halotel - Show all bundles (Carousel)\n` +
                `• .halotel list - List all products\n` +
                `• .halotel <id> - Product details\n` +
                `• .halotel search <query> - Search bundles\n` +
                `• .halotel order <id> - Order now\n` +
                `• .halotel help - This menu\n\n` +
                `> ⚡ Mickey Glitch Sub`
            );
            return;
        }

        // ─── LIST ──────────────────────────────────────────────────────────
        if (subCommand === 'list' || subCommand === 'all') {
            await sendProductList(ctx);
            return;
        }

        // ─── SEARCH ────────────────────────────────────────────────────────
        if (subCommand === 'search' && args[1]) {
            const query = args.slice(1).join(' ');
            const results = searchProducts(query);
            
            if (results.length === 0) {
                await ctx.reply(`❌ No bundles found for "${query}"`);
                return;
            }

            if (results.length === 1) {
                await sendProductDetails(ctx, results[0]);
                return;
            }

            await sendCarousel(ctx, results);
            return;
        }

        // ─── ORDER ─────────────────────────────────────────────────────────
        if (subCommand === 'order' && args[1]) {
            const product = getProductById(args[1]);
            if (!product) {
                await ctx.reply(`❌ Product "${args[1]}" not found.\n\nAvailable IDs:\n${PRODUCTS.map(p => `• ${p.id}`).join('\n')}`);
                return;
            }
            await sendProductDetails(ctx, product);
            return;
        }

        // ─── PRODUCT DETAILS BY ID ────────────────────────────────────────
        const product = getProductById(subCommand);
        if (product) {
            await sendProductDetails(ctx, product);
            return;
        }

        // ─── DEFAULT: SEND TEXT LIST FIRST, THEN TRY CAROUSEL ─────────────
        console.log('[HALOTEL] Sending product list to WhatsApp...');
        const listSent = await sendProductList(ctx);

        if (!listSent) {
            console.log('[HALOTEL] Text fallback failed, trying carousel...');
            await sendCarousel(ctx, PRODUCTS);
        }

    } catch (error) {
        console.error('[HALOTEL] Fatal error:', error.message);
        try {
            await sock.sendMessage(chatId, { 
                text: `❌ Error: ${error.message}\n\nPlease try again later.` 
            }, { quoted: message });
        } catch (_) {}
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 5. EXPORTS
// ─── ──────────────────────────────────────────────────────────────────────

function getPendingRequest() {
    return null;
}

function halotelHandler(sock, chatId, message, args) {
    return halotelCommand(sock, chatId, message, args);
}

halotelHandler.halotelCommand = halotelCommand;
halotelHandler.code = halotelCommand;
halotelHandler.default = halotelCommand;
halotelHandler.aliases = ['halotel'];
halotelHandler.description = 'Show Halotel bundles and internet offers as a carousel';
halotelHandler.category = 'utility';
halotelHandler.PRODUCTS = PRODUCTS;
halotelHandler.getPendingRequest = getPendingRequest;

module.exports = halotelHandler;
module.exports.halotelCommand = halotelCommand;
module.exports.code = halotelCommand;
module.exports.default = halotelCommand;
module.exports.aliases = ['halotel'];
module.exports.description = 'Show Halotel bundles and internet offers as a carousel';
module.exports.category = 'utility';
module.exports.PRODUCTS = PRODUCTS;
module.exports.getPendingRequest = getPendingRequest;
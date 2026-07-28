const { createCtx, Carousel, AIRich, Button, Toolkit } = require('../lib/messageBuilder');

// ─── HALOTEL PRODUCT DATABASE ────────────────────────────────────────────────
const HALOTEL_PRODUCTS = [
    {
        id: 'basic_10gb',
        title: "🌐 Halo Kasi 10GB",
        brand: "Halotel Internet",
        description: "Internet ya kasi ya 10GB kwa siku 1",
        price: "TSH 10,500",
        sale_price: "TSH 10,000",
        validity: "Siku 1",
        data: "10GB",
        image: "https://files.catbox.moe/nhb12m.png",
        features: [
            "✅ 10GB Data",
            "✅ 4G/5G Speed",
            "✅ 24 Hours Validity",
            "✅ Social Media Access"
        ]
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
        image: "https://files.catbox.moe/et8405.png",
        features: [
            "✅ 20GB Data",
            "✅ 4G/5G Speed",
            "✅ 72 Hours Validity",
            "✅ All Apps Access"
        ]
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
        image: "https://files.catbox.moe/yt220i.png",
        features: [
            "✅ 25GB Data",
            "✅ 4G/5G Speed",
            "✅ 7 Days Validity",
            "✅ Unlimited Streaming"
        ]
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
        image: "https://files.catbox.moe/lp9pn9.png",
        features: [
            "✅ 30GB Data",
            "✅ 4G/5G Speed",
            "✅ 30 Days Validity",
            "✅ Best Value Package"
        ]
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
        image: "https://files.catbox.moe/zegh7b.png",
        features: [
            "✅ Unlimited Data",
            "✅ 4G/5G Speed",
            "✅ 30 Days Validity",
            "✅ No Fair Usage Policy"
        ]
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
        image: "https://files.catbox.moe/xmy96l.png",
        features: [
            "✅ WhatsApp Unlimited",
            "✅ Instagram Unlimited",
            "✅ Facebook Unlimited",
            "✅ TikTok Unlimited",
            "✅ 72 Hours Validity"
        ]
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
        image: "https://files.catbox.moe/y630pp.png",
        features: [
            "✅ Night Data 12AM-6AM",
            "✅ Unlimited Usage",
            "✅ 24 Hours Validity",
            "✅ Perfect for Downloads"
        ]
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
        image: "https://files.catbox.moe/jed7u0.png",
        features: [
            "✅ 15GB Data",
            "✅ 4G/5G Speed",
            "✅ 7 Days Validity",
            "✅ Weekend Special"
        ]
    }
];

// ─── HALOTEL COMMAND ──────────────────────────────────────────────────────────
async function halotelCommand(sock, chatId, message, args) {
    const ctx = createCtx(sock, chatId, message, { args });
    
    try {
        const ownerNumber = "255615944741";
        const waLink = `https://wa.me/${ownerNumber}`;
        const subCommand = args[0]?.toLowerCase() || '';

        // ─── HELP / MAIN MENU ──────────────────────────────────────────────
        if (subCommand === 'help' || subCommand === 'menu' || subCommand === '') {
            await sendMainMenu(ctx, ownerNumber);
            return;
        }

        // ─── LIST ALL PRODUCTS ──────────────────────────────────────────────
        if (subCommand === 'list' || subCommand === 'all') {
            await sendProductList(ctx);
            return;
        }

        // ─── PRODUCT DETAILS ────────────────────────────────────────────────
        const product = HALOTEL_PRODUCTS.find(p => 
            p.id === subCommand || 
            p.id.includes(subCommand) ||
            p.title.toLowerCase().includes(subCommand)
        );

        if (product) {
            await sendProductDetails(ctx, product);
            return;
        }

        // ─── SEARCH ──────────────────────────────────────────────────────────
        if (subCommand === 'search' && args[1]) {
            const query = args.slice(1).join(' ');
            await searchProducts(ctx, query);
            return;
        }

        // ─── AUTO-DETECT: Check if user sent a number ──────────────────────
        const num = parseInt(subCommand);
        if (!isNaN(num) && num >= 1 && num <= HALOTEL_PRODUCTS.length) {
            const selected = HALOTEL_PRODUCTS[num - 1];
            await sendProductDetails(ctx, selected);
            return;
        }

        // ─── CAROUSEL VIEW ──────────────────────────────────────────────────
        if (subCommand === 'carousel' || subCommand === 'cards') {
            await sendCarouselView(sock, chatId, message);
            return;
        }

        // ─── DEFAULT: Show carousel ────────────────────────────────────────
        await sendCarouselView(sock, chatId, message);

    } catch (error) {
        console.error("Halotel Command Error:", error);
        ctx.reply(`❌ Error: ${error.message}\n\n` +
            `📶 *Halotel Commands:*\n` +
            `• .halotel - Show carousel\n` +
            `• .halotel list - List all products\n` +
            `• .halotel carousel - View cards\n` +
            `• .halotel <id> - Product details\n` +
            `• .halotel search <name> - Search\n` +
            `• .halotel help - This menu`);
    }
}

// ─── SEND MAIN MENU ──────────────────────────────────────────────────────────
async function sendMainMenu(ctx, ownerNumber) {
    const waLink = `https://wa.me/${ownerNumber}`;
    const menuText = `📶 *HALOTEL INTERNET BUNDLES*\n\n` +
        `*Mickey Glitch Engine* ⚡\n\n` +
        `🇹🇿 *Commands:*\n` +
        `• \`.halotel\` - Show carousel\n` +
        `• \`.halotel list\` - List all products\n` +
        `• \`.halotel carousel\` - Interactive cards\n` +
        `• \`.halotel <id>\` - Product details\n` +
        `• \`.halotel search <name>\` - Search\n\n` +
        `📞 *Contact:* ${waLink}\n` +
        `🔢 *Products:* ${HALOTEL_PRODUCTS.length} bundles\n\n` +
        `> *Mickey Glitch Sub* | *Traxxion Tech*`;

    await ctx.reply(menuText);
}

// ─── SEND PRODUCT LIST ────────────────────────────────────────────────────────
async function sendProductList(ctx) {
    let listText = `📶 *HALOTEL BUNDLE CATALOG*\n\n`;
    listText += `🎯 *All Bundles:*\n\n`;
    
    HALOTEL_PRODUCTS.forEach((p, i) => {
        const price = p.sale_price 
            ? `~~${p.price}~~ ➜ *${p.sale_price}*`
            : `*${p.price}*`;
        listText += `${i + 1}. *${p.title}*\n`;
        listText += `   📦 ${p.data} | ⏱️ ${p.validity}\n`;
        listText += `   💰 ${price}\n`;
        listText += `   🆔 \`${p.id}\`\n\n`;
    });

    listText += `📌 *Commands:*\n` +
        `• \`.halotel <id>\` - View details\n` +
        `• \`.halotel carousel\` - Interactive view\n\n` +
        `📞 *Order:* ${ctx.waLink || 'https://wa.me/255615944741'}\n\n` +
        `> *Mickey Glitch Sub* | *Traxxion Tech*`;

    await ctx.reply(listText);
}

// ─── SEND CAROUSEL VIEW ──────────────────────────────────────────────────────
async function sendCarouselView(sock, chatId, message) {
    try {
        // Check if Carousel is available
        if (!Carousel) {
            // Fallback to AIRich
            await sendRichListView(sock, chatId, message);
            return;
        }

        const carousel = new Carousel(sock);
        const cards = [];

        // Create cards for each product (max 8 for carousel)
        const productsToShow = HALOTEL_PRODUCTS.slice(0, 8);

        for (const product of productsToShow) {
            // Prepare media
            const imageBuffer = await Toolkit.fetchBuffer(product.image).catch(() => null);
            
            // Create features text
            const featuresText = product.features.slice(0, 3).join('\n');
            
            // Create button
            const buttons = [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "🔍 Details",
                        id: `.halotel ${product.id}`
                    })
                },
                {
                    name: "quick_reply", 
                    buttonParamsJson: JSON.stringify({
                        display_text: "📞 Order",
                        id: `.order ${product.id}`
                    })
                }
            ];

            const card = {
                header: {
                    title: product.title,
                    hasMediaAttachment: true,
                    imageMessage: imageBuffer ? {
                        url: product.image,
                        mimetype: 'image/png'
                    } : undefined
                },
                body: {
                    text: `📦 *${product.data}* | ⏱️ ${product.validity}\n` +
                          `💰 ${product.sale_price || product.price}\n\n` +
                          `${featuresText}`
                },
                footer: {
                    text: `Brand: ${product.brand}`
                },
                nativeFlowMessage: {
                    buttons: buttons
                }
            };

            cards.push(card);
        }

        // Set carousel body
        carousel
            .setTitle("📶 Halotel Internet Bundles")
            .setBody(`🎯 *Choose your bundle*\n\nSwipe ➡️ to browse all packages`)
            .setFooter("⚡ Powered by Mickey Glitch Sub")
            .addCard(cards);

        await carousel.send(chatId, {
            quoted: message,
            fallbackText: "📶 Open .halotel list to view all bundles"
        });

    } catch (error) {
        console.error('[CAROUSEL ERROR]', error.message);
        // Fallback to list view
        await sendRichListView(sock, chatId, message);
    }
}

// ─── RICH LIST VIEW (Fallback) ──────────────────────────────────────────────
async function sendRichListView(sock, chatId, message) {
    try {
        const rich = new AIRich(sock);
        
        let text = "📶 *HALOTEL INTERNET BUNDLES*\n\n";
        HALOTEL_PRODUCTS.forEach((p, i) => {
            const price = p.sale_price 
                ? `~~${p.price}~~ ➜ *${p.sale_price}*`
                : `*${p.price}*`;
            text += `${i + 1}. *${p.title}*\n`;
            text += `   📦 ${p.data} | ⏱️ ${p.validity}\n`;
            text += `   💰 ${price}\n\n`;
        });

        text += `📌 Type \`.halotel <id>\` for details\n`;
        text += `📞 Order: https://wa.me/255615944741`;

        rich
            .setTitle("📶 Halotel Catalog")
            .setSubtitle("⚡ Mickey Glitch Engine")
            .setFooter("Traxxion Tech")
            .addText(text);

        await rich.send(chatId, { quoted: message });

    } catch (error) {
        console.error('[RICH LIST ERROR]', error.message);
        // Final fallback: plain text
        await sendPlainList(sock, chatId, message);
    }
}

// ─── PLAIN LIST VIEW (Ultimate Fallback) ─────────────────────────────────────
async function sendPlainList(sock, chatId, message) {
    let text = "📶 *HALOTEL INTERNET BUNDLES*\n\n";
    HALOTEL_PRODUCTS.forEach((p, i) => {
        const price = p.sale_price 
            ? `~${p.price}~ ➜ ${p.sale_price}`
            : p.price;
        text += `${i + 1}. ${p.title}\n`;
        text += `   ${p.data} | ${p.validity}\n`;
        text += `   TSH ${price}\n\n`;
    });
    text += `\n📞 Order: https://wa.me/255615944741\n`;
    text += `\n> Mickey Glitch Sub | Traxxion Tech`;

    await sock.sendMessage(chatId, { text }, { quoted: message });
}

// ─── SEND PRODUCT DETAILS ────────────────────────────────────────────────────
async function sendProductDetails(ctx, product) {
    const price = product.sale_price 
        ? `~~${product.price}~~ ➜ *${product.sale_price}*`
        : `*${product.price}*`;

    const features = product.features.join('\n');

    const detailText = `📶 *${product.title}*\n\n` +
        `🏷️ *Brand:* ${product.brand}\n` +
        `📦 *Data:* ${product.data}\n` +
        `⏱️ *Validity:* ${product.validity}\n` +
        `💰 *Price:* ${price}\n\n` +
        `📋 *Features:*\n${features}\n\n` +
        `📝 *Description:*\n${product.description}\n\n` +
        `🆔 *ID:* \`${product.id}\`\n\n` +
        `📞 *Order Now:* https://wa.me/255615944741?text=Hello%2C%20I%20want%20to%20order%20${encodeURIComponent(product.title)}%20bundle\n\n` +
        `> *Mickey Glitch Sub* | *Traxxion Tech*`;

    try {
        // Try to send with image
        await ctx.sock.sendMessage(ctx.chatId, {
            image: { url: product.image },
            caption: detailText
        }, { quoted: ctx._msg });
    } catch (error) {
        // Fallback without image
        await ctx.reply(detailText);
    }
}

// ─── SEARCH PRODUCTS ──────────────────────────────────────────────────────────
async function searchProducts(ctx, query) {
    const results = HALOTEL_PRODUCTS.filter(p => 
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.brand.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase()) ||
        p.data.toLowerCase().includes(query.toLowerCase())
    );

    if (results.length === 0) {
        await ctx.reply(`❌ No bundles found for "${query}"\n\n` +
            `📶 Available bundles:\n` +
            HALOTEL_PRODUCTS.map(p => `• ${p.title}`).join('\n'));
        return;
    }

    let resultText = `🔍 *Search Results for "${query}"*\n\n`;
    results.forEach((p, i) => {
        const price = p.sale_price 
            ? `~~${p.price}~~ ➜ *${p.sale_price}*`
            : `*${p.price}*`;
        resultText += `${i + 1}. *${p.title}*\n`;
        resultText += `   📦 ${p.data} | ⏱️ ${p.validity}\n`;
        resultText += `   💰 ${price}\n`;
        resultText += `   🆔 \`${p.id}\`\n\n`;
    });

    resultText += `📌 Type \`.halotel <id>\` for details\n\n` +
        `> *Mickey Glitch Sub* | *Traxxion Tech*`;

    await ctx.reply(resultText);
}

// ─── QUICK ORDER BUTTON ──────────────────────────────────────────────────────
async function handleOrder(ctx, productId) {
    const product = HALOTEL_PRODUCTS.find(p => p.id === productId);
    if (!product) {
        await ctx.reply(`❌ Product "${productId}" not found.`);
        return;
    }

    const orderText = `📞 *ORDER CONFIRMATION*\n\n` +
        `📶 Product: ${product.title}\n` +
        `💰 Price: ${product.sale_price || product.price}\n` +
        `📦 Data: ${product.data}\n` +
        `⏱️ Validity: ${product.validity}\n\n` +
        `1️⃣ To confirm, reply with:\n` +
        `\`confirm order\`\n\n` +
        `2️⃣ Or contact us directly:\n` +
        `https://wa.me/255615944741`;

    await ctx.reply(orderText);
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
module.exports = halotelCommand;
module.exports.halotelCommand = halotelCommand;
module.exports.HALOTEL_PRODUCTS = HALOTEL_PRODUCTS;
module.exports.default = halotelCommand;
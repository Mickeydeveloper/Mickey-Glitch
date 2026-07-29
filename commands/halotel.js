const { createCtx, Carousel, AIRich, Button, Toolkit } = require('../lib/messageBuilder');

const safeSend = async (ctx, content, extra = {}) => {
    try {
        if (!ctx?.sendMessage) throw new Error('ctx.sendMessage unavailable');
        return await ctx.sendMessage(ctx.chatId, content, extra);
    } catch (error) {
        console.error('[HALOTEL SAFE SEND]', error?.message || error);
        try {
            if (ctx?.sock?.sendMessage) {
                return await ctx.sock.sendMessage(ctx.chatId, content, extra);
            }
        } catch (fallbackError) {
            console.error('[HALOTEL SAFE SEND FALLBACK]', fallbackError?.message || fallbackError);
        }
        return null;
    }
};

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
        ],
        ussd: "*150*01*1#"  // USSD code for ordering
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
        ],
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
        image: "https://files.catbox.moe/yt220i.png",
        features: [
            "✅ 25GB Data",
            "✅ 4G/5G Speed",
            "✅ 7 Days Validity",
            "✅ Unlimited Streaming"
        ],
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
        image: "https://files.catbox.moe/lp9pn9.png",
        features: [
            "✅ 30GB Data",
            "✅ 4G/5G Speed",
            "✅ 30 Days Validity",
            "✅ Best Value Package"
        ],
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
        image: "https://files.catbox.moe/zegh7b.png",
        features: [
            "✅ Unlimited Data",
            "✅ 4G/5G Speed",
            "✅ 30 Days Validity",
            "✅ No Fair Usage Policy"
        ],
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
        image: "https://files.catbox.moe/xmy96l.png",
        features: [
            "✅ WhatsApp Unlimited",
            "✅ Instagram Unlimited",
            "✅ Facebook Unlimited",
            "✅ TikTok Unlimited",
            "✅ 72 Hours Validity"
        ],
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
        image: "https://files.catbox.moe/y630pp.png",
        features: [
            "✅ Night Data 12AM-6AM",
            "✅ Unlimited Usage",
            "✅ 24 Hours Validity",
            "✅ Perfect for Downloads"
        ],
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
        image: "https://files.catbox.moe/jed7u0.png",
        features: [
            "✅ 15GB Data",
            "✅ 4G/5G Speed",
            "✅ 7 Days Validity",
            "✅ Weekend Special"
        ],
        ussd: "*150*01*8#"
    }
];

// ─── MAIN COMMAND ─────────────────────────────────────────────────────────────
async function halotelCommand(sock, chatId, message, args) {
    const ctx = createCtx(sock, chatId, message, { args });
    
    try {
        const ownerNumber = "255615944741";
        const waLink = `https://wa.me/${ownerNumber}`;
        const subCommand = args[0]?.toLowerCase() || '';

        // ─── CHECK WHATSAPP VERSION COMPATIBILITY ──────────────────────────
        const supportsInteractive = await checkWhatsAppVersion(ctx);
        
        // ─── HELP / MAIN MENU ──────────────────────────────────────────────
        if (subCommand === 'help' || subCommand === 'menu') {
            await sendMainMenu(ctx, ownerNumber);
            return;
        }

        // ─── LIST ALL PRODUCTS ──────────────────────────────────────────────
        if (subCommand === 'list' || subCommand === 'all') {
            if (supportsInteractive) {
                await sendCarouselView(ctx);
            } else {
                await sendProductList(ctx);
            }
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

        // ─── ORDER COMMAND ──────────────────────────────────────────────────
        if (subCommand === 'order' && args[1]) {
            await handleOrder(ctx, args[1]);
            return;
        }

        // ─── CAROUSEL VIEW (only if supported) ──────────────────────────────
        if (supportsInteractive && (subCommand === 'carousel' || subCommand === 'cards')) {
            await sendCarouselView(ctx);
            return;
        }

        // ─── DEFAULT: Send compatible message ──────────────────────────────
        if (supportsInteractive) {
            await sendCarouselView(ctx);
        } else {
            await sendCompatibleView(ctx);
        }

    } catch (error) {
        console.error("Halotel Command Error:", error);
        
        // ─── FALLBACK: Always send plain text if anything fails ────────────
        await sendPlainList(ctx);
    }
}

// ─── CHECK WHATSAPP VERSION COMPATIBILITY ──────────────────────────────────
async function checkWhatsAppVersion(ctx) {
    try {
        if (!ctx?.sock) return false;

        const supportsRelay = typeof ctx.sock.relayMessage === 'function';
        const supportsSendMessage = typeof ctx.sock.sendMessage === 'function';

        return supportsRelay && supportsSendMessage;
    } catch (error) {
        console.error('[VERSION CHECK]', error?.message || error);
        return false;
    }
}

// ─── SEND COMPATIBLE VIEW (No interactive messages) ────────────────────────
async function sendCompatibleView(ctx) {
    const ownerNumber = "255615944741";
    const waLink = `https://wa.me/${ownerNumber}`;
    
    let text = `📶 *HALOTEL INTERNET BUNDLES*\n\n`;
    text += `*Mickey Glitch Engine* ⚡\n\n`;
    
    HALOTEL_PRODUCTS.forEach((p, i) => {
        const price = p.sale_price 
            ? `~${p.price}~ ➜ *${p.sale_price}*`
            : `*${p.price}*`;
        text += `${i + 1}. *${p.title}*\n`;
        text += `   📦 ${p.data} | ⏱️ ${p.validity}\n`;
        text += `   💰 ${price}\n`;
        text += `   🆔 \`${p.id}\`\n\n`;
    });

    text += `📌 *Commands:*\n`;
    text += `• \`.halotel <id>\` - View details\n`;
    text += `• \`.halotel list\` - Full list\n`;
    text += `• \`.halotel search <name>\` - Search\n`;
    text += `• \`.halotel order <id>\` - Order\n\n`;
    text += `📞 *Order:* ${waLink}\n\n`;
    text += `> *Mickey Glitch Sub* | *Traxxion Tech*`;

    await ctx.sendMessage(ctx.chatId, { text });
}

// ─── SEND MAIN MENU ──────────────────────────────────────────────────────────
async function sendMainMenu(ctx, ownerNumber) {
    const waLink = `https://wa.me/${ownerNumber}`;
    
    const menuText = `📶 *HALOTEL COMMANDS*\n\n` +
        `*Mickey Glitch Engine* ⚡\n\n` +
        `📋 *Available Commands:*\n` +
        `• \`.halotel\` - Show bundles\n` +
        `• \`.halotel list\` - List all products\n` +
        `• \`.halotel <id>\` - Product details\n` +
        `• \`.halotel search <name>\` - Search bundles\n` +
        `• \`.halotel order <id>\` - Order now\n` +
        `• \`.halotel help\` - This menu\n\n` +
        `📞 *Contact:* ${waLink}\n` +
        `🔢 *Products:* ${HALOTEL_PRODUCTS.length} bundles\n\n` +
        `> *Mickey Glitch Sub* | *Traxxion Tech*`;

    await safeSend(ctx, { text: menuText });
}

// ─── SEND PRODUCT LIST ──────────────────────────────────────────────────────
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
        `• \`.halotel order <id>\` - Order\n\n` +
        `> *Mickey Glitch Sub* | *Traxxion Tech*`;

    await safeSend(ctx, { text: listText });
}

// ─── SEND CAROUSEL VIEW (With error handling) ──────────────────────────────
async function sendCarouselView(ctx) {
    try {
        // Check if Carousel is available
        if (!Carousel) {
            await sendCompatibleView(ctx);
            return;
        }

        const carousel = new Carousel(ctx.sock);
        const cards = [];
        const productsToShow = HALOTEL_PRODUCTS.slice(0, 8);

        for (const product of productsToShow) {
            try {
                const featuresText = product.features.slice(0, 3).join('\n');
                
                const card = {
                    header: {
                        title: product.title,
                        hasMediaAttachment: true,
                        imageMessage: {
                            url: product.image,
                            mimetype: 'image/png'
                        }
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
                        buttons: [
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
                                    id: `.halotel order ${product.id}`
                                })
                            }
                        ]
                    }
                };

                cards.push(card);
            } catch (err) {
                console.error('[CARD ERROR]', err.message);
                // Skip this card if it fails
            }
        }

        if (cards.length === 0) {
            await sendCompatibleView(ctx);
            return;
        }

        carousel
            .setTitle("📶 Halotel Internet Bundles")
            .setBody(`🎯 *Choose your bundle*\n\nSwipe ➡️ to browse all packages`)
            .setFooter("⚡ Powered by Mickey Glitch Sub")
            .addCard(cards);

        await carousel.send(ctx.chatId, {
            quoted: ctx._msg,
            fallbackText: "📶 Open .halotel list to view all bundles"
        }).catch(async () => {
            await safeSend(ctx, { text: "📶 Open .halotel list to view all bundles" });
        });

    } catch (error) {
        console.error('[CAROUSEL ERROR]', error.message);
        // Fallback to compatible view
        await sendCompatibleView(ctx);
    }
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
        `📞 *Order Now:*\n` +
        `• USSD: \`${product.ussd || '*150*01#'}\`\n` +
        `• WhatsApp: https://wa.me/255615944741?text=Hello%2C%20I%20want%20to%20order%20${encodeURIComponent(product.title)}%20bundle\n\n` +
        `> *Mickey Glitch Sub* | *Traxxion Tech*`;

    try {
        // Try to send with image
        await safeSend(ctx, {
            image: { url: product.image },
            caption: detailText
        });
    } catch (error) {
        // Fallback without image
        await safeSend(ctx, { text: detailText });
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
        await safeSend(ctx, { 
            text: `❌ No bundles found for "${query}"\n\n` +
                `📶 Available bundles:\n` +
                HALOTEL_PRODUCTS.map(p => `• ${p.title}`).join('\n')
        });
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

    await safeSend(ctx, { text: resultText });
}

// ─── HANDLE ORDER ─────────────────────────────────────────────────────────────
async function handleOrder(ctx, productId) {
    const product = HALOTEL_PRODUCTS.find(p => p.id === productId);
    if (!product) {
        await safeSend(ctx, { 
            text: `❌ Product "${productId}" not found.\n\n` +
                `📶 Available IDs:\n` +
                HALOTEL_PRODUCTS.map(p => `• \`${p.id}\` - ${p.title}`).join('\n')
        });
        return;
    }

    const orderText = `📞 *ORDER CONFIRMATION*\n\n` +
        `📶 *Product:* ${product.title}\n` +
        `💰 *Price:* ${product.sale_price || product.price}\n` +
        `📦 *Data:* ${product.data}\n` +
        `⏱️ *Validity:* ${product.validity}\n\n` +
        `*How to Order:*\n` +
        `1️⃣ Dial USSD: \`${product.ussd || '*150*01#'}\`\n` +
        `2️⃣ Or WhatsApp: https://wa.me/255615944741\n\n` +
        `📋 *Reply with:*\n` +
        `• \`confirm order ${product.id}\` - To confirm\n` +
        `• \`cancel\` - To cancel\n\n` +
        `> *Mickey Glitch Sub* | *Traxxion Tech*`;

    await safeSend(ctx, { text: orderText });
}

// ─── PLAIN LIST (Ultimate Fallback) ──────────────────────────────────────────
async function sendPlainList(ctx) {
    let text = `📶 *HALOTEL INTERNET BUNDLES*\n\n`;
    text += `*Mickey Glitch Engine* ⚡\n\n`;
    
    HALOTEL_PRODUCTS.forEach((p, i) => {
        const price = p.sale_price 
            ? `~${p.price}~ ➜ ${p.sale_price}`
            : p.price;
        text += `${i + 1}. ${p.title}\n`;
        text += `   ${p.data} | ${p.validity}\n`;
        text += `   TSH ${price}\n`;
        text += `   ID: ${p.id}\n\n`;
    });

    text += `📞 *Order:* https://wa.me/255615944741\n\n` +
        `> *Mickey Glitch Sub* | *Traxxion Tech*`;

    await safeSend(ctx, { text });
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
module.exports = halotelCommand;
module.exports.halotelCommand = halotelCommand;
module.exports.HALOTEL_PRODUCTS = HALOTEL_PRODUCTS;
module.exports.default = halotelCommand;
const { createCtx, Carousel, AIRich, Button, Toolkit } = require('../lib/messageBuilder');

// ─── PRODUCTS ──────────────────────────────────────────────────────────────
const PRODUCTS = [
    {
        id: 'basic_30gb',
        title: "🌐 Halo Kasi 30GB",
        brand: "Halotel",
        description: "Internet ya kasi ya 30GB kwa mwezi 1",
        price: "TSH 31,000",
        sale_price: "TSH 30,000",
        validity: "Mwezi 1",
        data: "30GB",
        image: "https://files.catbox.moe/lp9pn9.png",
        features: ["✅ 30GB Data", "✅ 4G/5G Speed", "✅ 30 Days Validity"]
    },
    {
        id: 'social_bundle',
        title: "📱 Halo Social Bundle",
        brand: "Halotel",
        description: "Social media unlimited kwa siku 3",
        price: "TSH 5,000",
        sale_price: "TSH 4,500",
        validity: "Siku 3",
        data: "Unlimited Social",
        image: "https://files.catbox.moe/xmy96l.png",
        features: ["✅ WhatsApp", "✅ Instagram", "✅ Facebook"]
    }
];

// ─── MAIN FUNCTION ──────────────────────────────────────────────────────
async function halotelCommand(sock, chatId, message, args) {
    try {
        console.log('[HALOTEL] Command executed!');
        console.log('[HALOTEL] Args:', args);
        console.log('[HALOTEL] ChatId:', chatId);

        const ctx = createCtx(sock, chatId, message, { args });
        
        console.log('[HALOTEL] Command is working; building carousel...');
        
        // ─── GET PRODUCT (Card 4 - Halo Kasi 30GB) ─────────────────────
        const product = PRODUCTS[0]; // Index 0 = Halo Kasi 30GB
        
        // ─── TRY CAROUSEL ──────────────────────────────────────────────
        try {
            console.log('[HALOTEL] Creating Carousel...');
            
            if (typeof Carousel !== 'function') {
                console.log('[HALOTEL] Carousel not available!');
                await ctx.sendMessage(chatId, { 
                    text: `⚠️ Carousel not available.\n\nProduct: ${product.title}\nPrice: ${product.price}` 
                });
                return;
            }
            
            const carousel = new Carousel(sock);
            
            // Create ONE card
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
                    text: `📦 ${product.data}\n💰 ${product.price}\n\n${product.description}`
                },
                footer: {
                    text: `⚡ ${product.brand}`
                }
            };
            
            carousel
                .setTitle("📶 Halotel Bundle")
                .setBody("Choose your bundle")
                .setFooter("Powered by Mickey")
                .addCard(card);
            
            console.log('[HALOTEL] Sending carousel...');
            
            await carousel.send(chatId, {
                quoted: message,
                fallbackText: `📶 ${product.title}\n💰 ${product.price}`
            });
            
            console.log('[HALOTEL] Carousel sent!');
            
        } catch (carouselError) {
            console.error('[HALOTEL] Carousel error:', carouselError.message);
            
            // Fallback: Send plain text with image
            await ctx.sendMessage(chatId, {
                image: { url: product.image },
                caption: `📶 *${product.title}*\n💰 ${product.price}\n📦 ${product.data}\n\n${product.description}`
            });
        }
        
    } catch (error) {
        console.error('[HALOTEL] Fatal error:', error.message);
        
        // Ultimate fallback
        await sock.sendMessage(chatId, { 
            text: `❌ Error: ${error.message}` 
        });
    }
}

// ─── EXPORT CORRECTLY ────────────────────────────────────────────────────
// Support both import styles:
// - require('./commands/halotel')(...) 
// - const { halotelCommand } = require('./commands/halotel')
module.exports = halotelCommand;
module.exports.halotelCommand = halotelCommand;
module.exports.default = halotelCommand;
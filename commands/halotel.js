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

// ─── SIMPLE COMMAND ──────────────────────────────────────────────────────
async function halotelCommand(sock, chatId, message, args) {
    try {
        console.log('[HALOTEL] Command executed!');
        console.log('[HALOTEL] Args:', args);
        console.log('[HALOTEL] ChatId:', chatId);

        const ctx = createCtx(sock, chatId, message, { args });
        
        // ─── TEST 1: Send simple text ──────────────────────────────────
        console.log('[HALOTEL] Sending test message...');
        await ctx.sendMessage(chatId, { text: "✅ Halotel command is working!" });
        
        // ─── TEST 2: Send product info ─────────────────────────────────
        const product = PRODUCTS[0]; // Chukua product ya kwanza
        console.log('[HALOTEL] Product:', product.title);
        
        // ─── TEST 3: Try Carousel ──────────────────────────────────────
        try {
            console.log('[HALOTEL] Creating Carousel...');
            
            // Check if Carousel exists
            if (typeof Carousel !== 'function') {
                console.log('[HALOTEL] Carousel is not available!');
                await ctx.sendMessage(chatId, { 
                    text: `⚠️ Carousel not available.\n\nProduct: ${product.title}\nPrice: ${product.price}` 
                });
                return;
            }
            
            const carousel = new Carousel(sock);
            console.log('[HALOTEL] Carousel created!');
            
            // Create ONE simple card
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
            
            console.log('[HALOTEL] Card created!');
            
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
            
            console.log('[HALOTEL] Carousel sent successfully!');
            
        } catch (carouselError) {
            console.error('[HALOTEL] Carousel error:', carouselError.message);
            console.error('[HALOTEL] Carousel stack:', carouselError.stack);
            
            // Fallback: Send plain text
            await ctx.sendMessage(chatId, {
                text: `📶 *${product.title}*\n💰 ${product.price}\n📦 ${product.data}\n\n${product.description}`
            });
        }
        
    } catch (error) {
        console.error('[HALOTEL] Fatal error:', error.message);
        console.error('[HALOTEL] Stack:', error.stack);
        
        // Ultimate fallback
        try {
            await sock.sendMessage(chatId, { 
                text: `❌ Error: ${error.message}\n\nPlease check console for details.` 
            });
        } catch (e) {
            console.error('[HALOTEL] Even fallback failed:', e.message);
        }
    }
}

module.exports = halotelCommand;
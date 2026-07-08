const { 
    generateMessageSourceCode, 
    Button, 
    ButtonV2, 
    AIRich, 
    InteractiveCarousel, // Inasafiri ma-carousel/arrows kwenye picha ya 1
    CatalogBuilder,      // Inatengeneza mfumo wa Store kwenye picha ya 2
    createCtx 
} = require('../lib/messageBuilder');

const sourceCommand = async (sock, chatId, msg, args) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();

    // ─── 1. MENU KUU (LIST YA FUNCTION ZOTE) ───
    if (!input) {
        try {
            const testMenu = new ButtonV2(sock)
                .setTitle('🧪 MessageBuilder Tester Pro')
                .setSubtitle('Mifumo yote ya ujumbe (Interactive Messages)')
                .setBody('Bofya button kutest mwonekano au kupata kodi (source code) ya function husika:')
                .setFooter('MICKEY BOT');

            // Ma-Buttons ya Haraka (Native Flow)
            testMenu.addButton('📱 Test ButtonV1 (button8)', '.source test_v1');
            testMenu.addButton('🧠 Test AIRich', '.source test_airich');
            testMenu.addButton('🔄 Test Carousel (Arrows)', '.source test_carousel');
            testMenu.addButton('🛍️ Test Store (Catalog)', '.source test_store');

            await testMenu.send(ctx.chatId, { quoted: ctx._msg });
            return;
        } catch (e) {
            console.error('Main tester menu error:', e);
            return ctx.reply('❌ Kushindwa kufungua Tester Menu.');
        }
    }

    // ─── 2. FUNCTION ZA KUTEST NA SOURCE CODES ───

    // --- [PICHA YA KWANZA: INTERACTIVE/CAROUSEL NA ARROWS & BUTTON V1] ---
    if (input === 'test_v1') {
        // Mfano wa button8 kwa kutumia Button (V1) inayochukua ctx
        const btn8 = new Button(ctx)
            .setTitle("button8")
            .setBody("Hi! This is button8 test.");
        await btn8.send();

        // Tuma na Source code yake papo hapo
        const code = `// Muundo wa Button V1 (button8)\nconst btn8 = new Button(ctx)\n  .setTitle("button8")\n  .setBody("Hi! This is button8 test.");\nawait btn8.send();`;
        return ctx.reply("```javascript\n" + code + "\n```");
    }

    if (input === 'test_carousel') {
        // Mfano wa Interactive message yenye mishale (Arrows/Carousel) kama Picha ya 1
        try {
            const carousel = new InteractiveCarousel(sock)
                .setBody("Test interactive message na arrows");

            // Kuongeza kadi za kutelezesha (mishale)
            carousel.addCard("Card 1", "Maelezo ya kadi ya kwanza", "https://via.placeholder.com/150");
            carousel.addCard("Card 2", "Maelezo ya kadi ya pili", "https://via.placeholder.com/150");

            await carousel.send(ctx.chatId, { quoted: ctx._msg });

            const code = `// Muundo wa Interactive Message na Arrows\nconst carousel = new InteractiveCarousel(sock)\n  .setBody("Test interactive message na arrows");\ncarousel.addCard("Title", "Body", "ImageURL");\nawait carousel.send(chatId);`;
            return ctx.reply("```javascript\n" + code + "\n```");
        } catch (e) {
            return ctx.reply("❌ Mfumo wako wa 'InteractiveCarousel' haujakamilika kwenye messageBuilder.");
        }
    }

    // --- [PICHA YA PILI: STORE / CATALOG PRODUCT LIST] ---
    if (input === 'test_store') {
        try {
            const store = new CatalogBuilder(sock)
                .setTitle("Product Catalog Zero Tr4sh 🛍️")
                .setBody("Zero Tr4sh Store 🏪\nTSH 500,000.00");

            store.addProduct("Panel 1GB", "Hosting Bot", "25,000", "15,000", "https://via.placeholder.com/150");
            store.addProduct("Panel 2GB", "Hosting Bot", "30,000", "25,000", "https://via.placeholder.com/150");

            await store.send(ctx.chatId, { quoted: ctx._msg });

            const code = `// Muundo wa Store / Product Catalog\nconst store = new CatalogBuilder(sock)\n  .setTitle("Product Catalog")\n  .setBody("Store Info");\nstore.addProduct("Name", "Desc", "Price", "OldPrice", "ImgURL");\nawait store.send(chatId);`;
            return ctx.reply("```javascript\n" + code + "\n```");
        } catch (e) {
            return ctx.reply("❌ Mfumo wako wa 'CatalogBuilder' haujakamilika kwenye messageBuilder.");
        }
    }

    // --- [PICHA YA TATU: AIRICH AI REPLY] ---
    if (input === 'test_airich') {
        const rich = new AIRich(sock)
            .setTitle('🧠 AI')
            .setFooter('MICKEY BOT')
            .addText('Hi!') // Kadi ya picha ya tatu
            .addSuggest(['Msaada → .menu']);

        await rich.send(ctx.chatId, { quoted: ctx._msg, forwarded: true });

        const code = `// Muundo wa AIRich (Picha ya 3)\nconst rich = new AIRich(sock)\n  .setTitle('🧠 AI')\n  .addText('Hi!')\n  .setFooter('MICKEY BOT');\nawait rich.send(chatId, { forwarded: true });`;
        return ctx.reply("```javascript\n" + code + "\n```");
    }
};

sourceCommand.category = 'UTILITY';
sourceCommand.description = 'Test zote za interactive na kupata source code zake papo hapo';

module.exports = sourceCommand;

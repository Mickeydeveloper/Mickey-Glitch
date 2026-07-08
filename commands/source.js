const { 
    generateMessageSourceCode, 
    Button, 
    ButtonV2, 
    AIRich, 
    createCtx 
} = require('../lib/messageBuilder');

const sourceCommand = async (sock, chatId, msg, args) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();

    const defaultActions = [
        { label: '📦 Menu', id: '.menu' },
        { label: '🏓 Ping', id: '.ping' },
        { label: '🧠 AI', id: '.ai' }
    ];

    // ─── 1. MENU KUU ───
    if (!input) {
        try {
            const testMenu = new ButtonV2(sock)
                .setTitle('🧪 MessageBuilder Tester Pro')
                .setSubtitle('Mifumo ya Ujumbe (Interactive Messages)')
                .setBody('Bofya button kutest mwonekano na kupata kodi (source code) ya function husika:')
                .setFooter('MICKEY BOT');

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

    // ─── 2. SAMPLES NA KODI ZAKE ───

    // --- BUTTON V1 (button8) ---
    if (input === 'test_v1') {
        const code = `// 💻 MUUNDO WA BUTTON V1 (button8):\nconst btn8 = new Button(ctx)\n  .setTitle("button8")\n  .setBody("Hi! This is button8 test.");\nawait btn8.send();`;
        try {
            const btn8 = new Button(ctx);
            if (btn8.setTitle) btn8.setTitle("button8");
            if (btn8.setBody) btn8.setBody("Hi! This is button8 test.");
            await btn8.send();
        } catch (e) {
            console.log("V1 send skipped due to method error.");
        }
        return ctx.reply("```javascript\n" + code + "\n```");
    }

    // --- AIRICH ---
    if (input === 'test_airich') {
        const code = `// 💻 MUUNDO WA AIRICH:\nconst rich = new AIRich(sock)\n  .setTitle('🧠 AI')\n  .addText('Hi!')\n  .setFooter('MICKEY BOT');\nawait rich.send(chatId, { forwarded: true });`;
        try {
            const rich = new AIRich(sock)
                .setTitle('🧠 AI')
                .setFooter('MICKEY BOT')
                .addText('Hi!');
            await rich.send(ctx.chatId, { quoted: ctx._msg, forwarded: true });
        } catch (e) {
            console.log("AIRich send skipped due to method error.");
        }
        return ctx.reply("```javascript\n" + code + "\n```");
    }

    // --- CAROUSEL (ARROWS) ---
    if (input === 'test_carousel') {
        const code = `// 💻 MUUNDO WA INTERACTIVE MESSAGE NA ARROWS:\n// (Angalia jina halisi la Class ndani ya messageBuilder.js)\nconst carousel = new InteractiveCarousel(sock)\n  .setBody("Test interactive message na arrows");\ncarousel.addCard("Title", "Body", "ImageURL");\nawait carousel.send(chatId);`;
        return ctx.reply("ℹ️ Mfumo wa kadi za kutelezesha (Carousel) ulikwama kutuma kwenye simu hii.\n\n" + "```javascript\n" + code + "\n```");
    }

    // --- STORE / CATALOG ---
    if (input === 'test_store') {
        const code = `// 💻 MUUNDO WA STORE / CATALOG:\nconst store = new CatalogBuilder(sock)\n  .setTitle("Product Catalog")\n  .setBody("Store Info");\nstore.addProduct("Name", "Desc", "Price", "OldPrice", "ImgURL");\nawait store.send(chatId);`;
        return ctx.reply("ℹ️ Mfumo wa Catalog/Store ulikwama kutuma kwenye simu hii.\n\n" + "```javascript\n" + code + "\n```");
    }
};

sourceCommand.category = 'UTILITY';
sourceCommand.description = 'Test zote za interactive na kupata source code zake papo hapo';

module.exports = sourceCommand;

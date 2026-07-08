const { Button, ButtonV2, Carousel, AIRich, createCtx } = require('../lib/messageBuilder');

const sourceCommand = async (sock, chatId, msg, args) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();

    // ─── 1. MENU KUU YA BUTTONS (KILA FUNCTION INA BUTTON YAKE) ───
    if (!input) {
        try {
            const mainMenus = new Button(sock)
                .setTitle('🧩 MessageBuilder Lab')
                .setSubtitle('Core Engine v4.6')
                .setBody('Chagua function hapo chini kuona mfano halisi (Sample) pamoja na kodi (Source Code) yake ya kuiandika:')
                .setFooter('MICKEY BOT');

            // Kila function na button yake maalum kama ulivyoomba
            mainMenus.addReply('📱 Button V1 (Native Flow)', '.source test_v1');
            mainMenus.addReply('📟 Button V2 (Quick Reply)', '.source test_v2');
            mainMenus.addReply('🔄 Carousel (Slide Cards)', '.source test_carousel');
            mainMenus.addReply('🧠 AIRich (AI Text/Badge)', '.source test_airich');
            mainMenus.addReply('💻 AIRich (Code Blocks)', '.source test_code');
            mainMenus.addReply('📊 AIRich (Tables/Meza)', '.source test_table');

            await mainMenus.send(ctx.chatId, { quoted: ctx._msg });
            return;
        } catch (e) {
            console.error('Error kwenye menu kuu:', e);
            return ctx.reply('❌ Imeshindwa kufungua Tester Menu.');
        }
    }

    // ─── 2. SAMPLE NA SOURCE CODES KWA KILA FUNCTION ───

    // --- A. BUTTON V1 ---
    if (input === 'test_v1') {
        const btnV1 = new Button(sock)
            .setTitle("Mickey Native Flow")
            .setBody("Huu ni mfano wa Class ya Button ya kisasa.");
        btnV1.addReply("Sawa 🟢", ".menu");
        btnV1.addUrl("Fungua Google 🌐", "https://google.com");
        await btnV1.send(ctx.chatId, { quoted: ctx._msg });

        const code = `// Muundo wa Button (V1)\nconst { Button } = require('./lib/messageBuilder');\nconst btn = new Button(sock)\n  .setTitle("Mickey Native Flow")\n  .setBody("Huu ni mfano wa Class ya Button.")\n  .addReply("Sawa 🟢", ".menu")\n  .addUrl("Google 🌐", "https://google.com");\nawait btn.send(chatId, { quoted: msg });`;
        return ctx.reply("```javascript\n" + code + "\n```");
    }

    // --- B. BUTTON V2 ---
    if (input === 'test_v2') {
        const btnV2 = new ButtonV2(sock)
            .setTitle("Mickey ButtonV2")
            .setBody("Huu ni mfano wa muundo wa ButtonV2 wenye amri za haraka.");
        btnV2.addButton("Menu 📦", ".menu");
        btnV2.addButton("Ping 📡", ".ping");
        await btnV2.send(ctx.chatId, { quoted: ctx._msg });

        const code = `// Muundo wa ButtonV2\nconst { ButtonV2 } = require('./lib/messageBuilder');\nconst btnV2 = new ButtonV2(sock)\n  .setTitle("Mickey ButtonV2")\n  .setBody("Huu ni mfano wa ButtonV2.")\n  .addButton("Menu 📦", ".menu");\nawait btnV2.send(chatId, { quoted: msg });`;
        return ctx.reply("```javascript\n" + code + "\n```");
    }

    // --- C. CAROUSEL ---
    if (input === 'test_carousel') {
        try {
            const sampleCarousel = new Carousel(sock)
                .setBody("Huu ni mfano wa Carousel (Kadi za kutelezesha)");

            const card1 = {
                header: {
                    title: "Kadi ya Kwanza",
                    hasMediaAttachment: true,
                    imageMessage: { url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe" }
                },
                body: { text: "Maelezo madogo ya kadi ya kwanza." },
                footer: { text: "Mickey Bot" },
                nativeFlowMessage: {
                    buttons: [{ name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Chagua 1", id: ".menu" }) }]
                }
            };

            sampleCarousel.addCard(card1);
            await sampleCarousel.send(ctx.chatId, { quoted: ctx._msg });

            const code = `// Muundo wa Carousel\nconst { Carousel } = require('./lib/messageBuilder');\nconst crsl = new Carousel(sock).setBody("Carousel");\nconst card1 = {\n  header: { title: "Title", hasMediaAttachment: true, imageMessage: { url: "IMG_URL" } },\n  body: { text: "Text" },\n  nativeFlowMessage: { buttons: [{ name: "quick_reply", buttonParamsJson: '{"display_text":"Btn","id":".id"}' }] }\n};\ncrsl.addCard(card1);\nawait crsl.send(chatId);`;
            return ctx.reply("```javascript\n" + code + "\n```");
        } catch (e) {
            return ctx.reply("❌ Kushindwa kutuma Carousel. Hakikisha mtandao wako uko sawa.");
        }
    }

    // --- D. AIRICH TEXT ---
    if (input === 'test_airich') {
        const rich = new AIRich(sock)
            .setTitle('🧠 AI Engine')
            .setFooter('MICKEY BOT')
            .addText('Huu ni mfano wa AIRich Markdown Text wenye muonekano nadhifu.')
            .addSuggest(['Msaada → .menu'])
            .addTip('Inaleta muundo safi wa muonekano.');

        await rich.send(ctx.chatId, { quoted: ctx._msg, forwarded: true });

        const code = `// Muundo wa AIRich Text\nconst { AIRich } = require('./lib/messageBuilder');\nconst rich = new AIRich(sock)\n  .setTitle('🧠 AI Engine')\n  .addText('Huu ni mfano.')\n  .addSuggest(['Msaada → .menu'])\n  .addTip('Inaleta muundo safi.')\n  .setFooter('MICKEY BOT');\nawait rich.send(chatId, { forwarded: true });`;
        return ctx.reply("```javascript\n" + code + "\n```");
    }

    // --- E. AIRICH CODE BLOCKS ---
    if (input === 'test_code') {
        const richCode = new AIRich(sock)
            .setTitle('💻 Code Highlighting')
            .setFooter('MICKEY BOT')
            .addCode('javascript', `const test = "Mickey Bot V4.6";\nconsole.log(test);`);

        await richCode.send(ctx.chatId, { quoted: ctx._msg, forwarded: true });

        const code = `// Muundo wa AIRich Code Blocks\nconst rich = new AIRich(sock)\n  .setTitle('💻 Code Highlighting')\n  .addCode('javascript', 'const a = 10;')\n  .setFooter('MICKEY BOT');\nawait rich.send(chatId, { forwarded: true });`;
        return ctx.reply("```javascript\n" + code + "\n```");
    }

    // --- F. AIRICH TABLES ---
    if (input === 'test_table') {
        const tableData = [
            ["Command", "Category", "Status"],
            [".ai", "AI", "Working ✅"],
            [".menu", "Main", "Online 🔋"]
        ];

        const richTable = new AIRich(sock)
            .setTitle('📊 Bot Stats Table')
            .setFooter('MICKEY BOT')
            .addTable(tableData);

        await richTable.send(ctx.chatId, { quoted: ctx._msg, forwarded: true });

        const code = `// Muundo wa AIRich Tables\nconst rich = new AIRich(sock)\n  .setTitle('📊 Table')\n  .addTable([\n    ["Header1", "Header2"],\n    ["Data1", "Data2"]\n  ]);\nawait rich.send(chatId, { forwarded: true });`;
        return ctx.reply("```javascript\n" + code + "\n```");
    }
};

sourceCommand.category = 'UTILITY';
sourceCommand.description = 'Test kila function iliyopo kwenye messageBuilder na upate kodi zake';

module.exports = sourceCommand;

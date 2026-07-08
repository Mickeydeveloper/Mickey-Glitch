const { Button, ButtonV2, Carousel, AIRich, createCtx } = require('../lib/messageBuilder');

const sourceCommand = async (sock, chatId, msg, args) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();

    // ─── 1. MENU KUU YA MA-BUTTONS (KILA FUNCTION INA BUTTON YAKE) ───
    if (!input) {
        try {
            // Tunatumia Button (Native Flow) kutengeneza Menu safi
            const mainMenus = new Button(sock)
                .setTitle('🧩 MessageBuilder Lab')
                .setSubtitle('V4.6 Core Engine')
                .setBody('Chagua function hapo chini kuona Sample ya muonekano wake pamoja na Source Code yake kamili:')
                .setFooter('MICKEY BOT');

            // Kuongeza Buttons kwa kila function
            mainMenus.addReply('📱 Test Button (V1)', '.source test_v1');
            mainMenus.addReply('📟 Test ButtonV2', '.source test_v2');
            mainMenus.addReply('🧠 Test AIRich Layout', '.source test_airich');
            mainMenus.addReply('🔄 Test Carousel Cards', '.source test_carousel');

            await mainMenus.send(ctx.chatId, { quoted: ctx._msg });
            return;
        } catch (e) {
            console.error('Main tester menu error:', e);
            return ctx.reply('❌ Imeshindwa kufungua Tester Menu.');
        }
    }

    // ─── 2. CODES NA SAMPLES ZA KILA FUNCTION ───

    // --- A. TEST BUTTON (V1) ---
    if (input === 'test_v1') {
        // Tuma muonekano halisi
        const btnV1 = new Button(sock)
            .setTitle("Mickey Native Flow")
            .setBody("Huu ni mfano wa Class ya Button ya kisasa.");
        btnV1.addReply("Sawa 🟢", ".menu");
        btnV1.addUrl("Fungua Google 🌐", "https://google.com");
        await btnV1.send(ctx.chatId, { quoted: ctx._msg });

        // Tuma Source Code yake
        const code = `// 💡 SOURCE CODE: BUTTON (V1)\nconst { Button } = require('./lib/messageBuilder');\n\nconst btn = new Button(sock)\n  .setTitle("Mickey Native Flow")\n  .setBody("Huu ni mfano wa Class ya Button.")\n  .setFooter("Footer");\n\nbtn.addReply("Sawa 🟢", ".menu");\nbtn.addUrl("Google 🌐", "https://google.com");\nawait btn.send(chatId, { quoted: msg });`;
        return ctx.reply("```javascript\n" + code + "\n```");
    }

    // --- B. TEST BUTTONV2 ---
    if (input === 'test_v2') {
        const btnV2 = new ButtonV2(sock)
            .setTitle("Mickey ButtonV2")
            .setBody("Huu ni mfano wa muundo wa ButtonV2 wenye amri za haraka.");
        btnV2.addButton("Menu 📦", ".menu");
        btnV2.addButton("Ping 📡", ".ping");
        await btnV2.send(ctx.chatId, { quoted: ctx._msg });

        const code = `// 💡 SOURCE CODE: BUTTONV2\nconst { ButtonV2 } = require('./lib/messageBuilder');\n\nconst btnV2 = new ButtonV2(sock)\n  .setTitle("Mickey ButtonV2")\n  .setBody("Huu ni mfano wa ButtonV2.")\n  .addButton("Menu 📦", ".menu");\n\nawait btnV2.send(chatId, { quoted: msg });`;
        return ctx.reply("```javascript\n" + code + "\n```");
    }

    // --- C. TEST AIRICH ---
    if (input === 'test_airich') {
        const rich = new AIRich(sock)
            .setTitle('🧠 AI Engine')
            .setFooter('MICKEY BOT')
            .addText('Huu ni mfano wa AIRich Markdown Text.')
            .addSuggest(['Msaada → .menu', 'Ping Bot → .ping'])
            .addTip('Inaleta muundo safi wa muonekano kwenye WhatsApp.');

        await rich.send(ctx.chatId, { quoted: ctx._msg, forwarded: true });

        const code = `// 💡 SOURCE CODE: AIRICH\nconst { AIRich } = require('./lib/messageBuilder');\n\nconst rich = new AIRich(sock)\n  .setTitle('🧠 AI Engine')\n  .addText('Huu ni mfano wa AIRich Markdown.')\n  .addSuggest(['Msaada → .menu'])\n  .addTip('Inaleta muundo safi.')\n  .setFooter('MICKEY BOT');\n\nawait rich.send(chatId, { forwarded: true });`;
        return ctx.reply("```javascript\n" + code + "\n```");
    }

    // --- D. TEST CAROUSEL (FIXED ERROR ❌) ---
    if (input === 'test_carousel') {
        try {
            // FIX: Carousel sasa inapewa kadi zenye picha na muundo sahihi wa Baileys kufuta ile error ya picha yako
            const sampleCarousel = new Carousel(sock)
                .setBody("Huu ni mfano wa Carousel (Kadi za kutelezesha)");

            // Muundo sahihi wa kadi kulingana na messageBuilder.js yako
            const card1 = {
                header: {
                    title: "Kadi ya Kwanza",
                    hasMediaAttachment: true,
                    imageMessage: { url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe" } // URL halisi ya picha
                },
                body: { text: "Maelezo madogo ya kadi ya kwanza hapa." },
                footer: { text: "Mickey Bot" },
                nativeFlowMessage: {
                    buttons: [{ name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Chagua Option 1", id: ".menu" }) }]
                }
            };

            sampleCarousel.addCard(card1);
            await sampleCarousel.send(ctx.chatId, { quoted: ctx._msg });

            const code = `// 💡 SOURCE CODE: CAROUSEL (Kadi za kutelezesha)\nconst { Carousel } = require('./lib/messageBuilder');\n\nconst crsl = new Carousel(sock).setBody("Carousel Message");\n\nconst card1 = {\n  header: { title: "Title", hasMediaAttachment: true, imageMessage: { url: "IMAGE_URL" } },\n  body: { text: "Body Text" },\n  nativeFlowMessage: { buttons: [{ name: "quick_reply", buttonParamsJson: '{"display_text":"Button", "id":".id"}' }] }\n};\n\ncrsl.addCard(card1);\nawait crsl.send(chatId);`;
            return ctx.reply("```javascript\n" + code + "\n```");
        } catch (e) {
            console.error(e);
            return ctx.reply("❌ Kushindwa kutuma Carousel. Hakikisha mtandao wako uko sawa kupakia picha ya kadi.");
        }
    }
};

sourceCommand.category = 'UTILITY';
sourceCommand.description = 'Test class zote za messageBuilder na kupata kodi zake papo hapo';

module.exports = sourceCommand;

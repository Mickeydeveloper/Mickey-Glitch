const { Button, ButtonV2, Carousel, AIRich, createCtx } = require('../lib/messageBuilder');

const sourceCommand = async (sock, chatId, msg, args) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();

    // ─── 1. MENU KUU YA BUTTONS (IMEGAWANYWA KWA MAKUNDI) ───
    if (!input) {
        try {
            const mainMenus = new Button(sock)
                .setTitle('🧩 Mickey Glitch Lab v4.8')
                .setSubtitle('Core & Advanced Engine')
                .setBody(
                    'Chagua sehemu unayotaka kuona mifano (Samples) na kodi (Source Codes) zake:\n\n' +
                    '📁 *CORE ENGINE* ➜ Maumbo ya kawaida ya messageBuilder.\n' +
                    '🚀 *ADVANCED HACKS* ➜ Mifumo mipya ya Paired Media na Link Animations.'
                )
                .setFooter('MICKEY BOT');

            // Kundi la 1: Core Engine
            mainMenus.addReply('📱 Core: Buttons & Flow', '.source kundi_core');
            // Kundi la 2: Advanced Hacks (Zile feature mpya ulizoziongeza)
            mainMenus.addReply('🚀 Advanced: Media Hacks', '.source kundi_advanced');

            await mainMenus.send(ctx.chatId, { quoted: ctx._msg });
            return;
        } catch (e) {
            console.error('Error kwenye menu kuu:', e);
            return ctx.reply('❌ Imeshindwa kufungua Tester Menu.');
        }
    }

    // ─── SUB-MENU 1: CORE ENGINE ───
    if (input === 'kundi_core') {
        const coreMenu = new Button(sock)
            .setTitle('📁 Core Engine Features')
            .setBody('Hapa kuna maumbo ya msingi ya messageBuilder yako:')
            .setFooter('MICKEY BOT');

        coreMenu.addReply('📟 Button V2 (Quick Reply)', '.source test_v2');
        coreMenu.addReply('🔄 Carousel (Slide Cards)', '.source test_carousel');
        coreMenu.addReply('🧠 AIRich (AI Text & Badges)', '.source test_airich');
        coreMenu.addReply('📊 AIRich (Tables/Meza)', '.source test_table');
        coreMenu.addReply('⬅️ Rudi Nyuma', '.source');

        await coreMenu.send(ctx.chatId, { quoted: ctx._msg });
        return;
    }

    // ─── SUB-MENU 2: ADVANCED HACKS (OTHER) ───
    if (input === 'kundi_advanced') {
        const advMenu = new Button(sock)
            .setTitle('🚀 Advanced & Other Hacks')
            .setBody('Hizi ni mbinu mpya kabisa zilizoongezwa nje ya muundo wa zamani:')
            .setFooter('MICKEY BOT');

        advMenu.addReply('🎞️ Paired Media (Split Message)', '.source test_paired');
        advMenu.addReply('🔄 Animated Link Loop (Edit Key)', '.source test_linkloop');
        advMenu.addReply('⬅️ Rudi Nyuma', '.source');

        await advMenu.send(ctx.chatId, { quoted: ctx._msg });
        return;
    }

    // ─── 2. SAMPLE NA SOURCE CODES KWA KILA FUNCTION ───

    // --- A. BUTTON V2 ---
    if (input === 'test_v2') {
        const btnV2 = new ButtonV2(sock)
            .setTitle("Mickey ButtonV2")
            .setBody("Huu ni mfano wa muundo wa ButtonV2 wenye amri za haraka.");
        btnV2.addButton("Menu 📦", ".menu");
        await btnV2.send(ctx.chatId, { quoted: ctx._msg });

        const code = `// Muundo wa ButtonV2\nconst { ButtonV2 } = require('./lib/messageBuilder');\nconst btnV2 = new ButtonV2(sock)\n  .setTitle("Mickey ButtonV2")\n  .setBody("Body")\n  .addButton("Menu 📦", ".menu");\nawait btnV2.send(chatId, { quoted: msg });`;
        return ctx.reply("```javascript\n" + code + "\n```");
    }

    // --- B. CAROUSEL (MUUNDO WA STORE.JS ULIOTAKA) ---
    if (input === 'test_carousel') {
        try {
            const waLink = "https://wa.me/255719632816";
            
            // Muundo safi wa Carousel ukitumia mtindo sawa na store.js uliopita
            const sampleCarousel = new Carousel(sock)
                .setBody("🛒 *Mickey Store Preview* (Muundo wa Carousel Cards)");

            const cards = [
                {
                    header: { title: "Panel 1GB", hasMediaAttachment: true, imageMessage: { url: "https://x.xcute.workers.dev/f/images/b8066826a651.jpg" } },
                    body: { text: "Brand: Hosting Bot\nPrice: TSH 15,000" },
                    footer: { text: "Mickey Bot" },
                    nativeFlowMessage: { buttons: [{ name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "Nunua 🛍️", url: waLink }) }] }
                },
                {
                    header: { title: "Panel 2GB", hasMediaAttachment: true, imageMessage: { url: "https://x.xcute.workers.dev/f/images/569c736b8940.jpg" } },
                    body: { text: "Brand: Hosting Bot\nPrice: TSH 25,000" },
                    footer: { text: "Mickey Bot" },
                    nativeFlowMessage: { buttons: [{ name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "Nunua 🛍️", url: waLink }) }] }
                }
            ];

            cards.forEach(card => sampleCarousel.addCard(card));
            await sampleCarousel.send(ctx.chatId, { quoted: ctx._msg });

            const code = `// Muundo wa Carousel (Kadi za Kutelezesha)\nconst crsl = new Carousel(sock).setBody("Store");\nconst card = {\n  header: { title: "Title", hasMediaAttachment: true, imageMessage: { url: "URL" } },\n  body: { text: "Price: X" },\n  nativeFlowMessage: { buttons: [{ name: "cta_url", buttonParamsJson: '{"display_text":"Buy","url":"LINK"}' }] }\n};\ncrsl.addCard(card);\nawait crsl.send(chatId);`;
            return ctx.reply("```javascript\n" + code + "\n```");
        } catch (e) {
            return ctx.reply("❌ Kushindwa kutuma Carousel. " + e.message);
        }
    }

    // --- C. AIRICH TEXT ---
    if (input === 'test_airich') {
        const rich = new AIRich(sock)
            .setTitle('🧠 AI Engine')
            .setFooter('MICKEY BOT')
            .addText('Huu ni mfano wa AIRich Markdown Text.')
            .addSuggest(['Msaada → .menu']);

        await rich.send(ctx.chatId, { quoted: ctx._msg, forwarded: true });

        const code = `const rich = new AIRich(sock)\n  .setTitle('🧠 AI Engine')\n  .addText('Text Here')\n  .addSuggest(['.menu'])\n  .setFooter('MICKEY BOT');\nawait rich.send(chatId, { forwarded: true });`;
        return ctx.reply("```javascript\n" + code + "\n```");
    }

    // --- D. AIRICH TABLES ---
    if (input === 'test_table') {
        const richTable = new AIRich(sock)
            .setTitle('📊 Bot Stats Table')
            .addTable([
                ["Command", "Status"],
                [".fromai", "Online ✅"],
                [".tmte", "Online ✅"]
            ]);

        await richTable.send(ctx.chatId, { quoted: ctx._msg, forwarded: true });

        const code = `const rich = new AIRich(sock)\n  .addTable([\n    ["Header1", "Header2"],\n    ["Data1", "Data2"]\n  ]);\nawait rich.send(chatId);`;
        return ctx.reply("```javascript\n" + code + "\n```");
    }

    // --- E. ADVANCED: PAIRED MEDIA (NEW) ---
    if (input === 'test_paired') {
        const code = `// 🎞️ PAIRED MEDIA (Picha na Video Zilizounganishwa Pamoja)\nconst { prepareWAMessageMedia, generateWAMessageFromContent } = require('baileys');\n\nconst image = await prepareWAMessageMedia({ image: { url: 'IMG_URL' } }, { upload: sock.waUploadToServer });\nconst video = await prepareWAMessageMedia({ video: { url: 'VID_URL' } }, { upload: sock.waUploadToServer });\n\nconst msg = generateWAMessageFromContent(chatId, { imageMessage: { ...image.imageMessage, contextInfo: { pairedMediaType: 5, statusSourceType: 0 } } }, {});\nawait sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });\n\nawait sock.relayMessage(chatId, {\n  videoMessage: { ...video.videoMessage, contextInfo: { pairedMediaType: 6, statusSourceType: 0 } },\n  messageContextInfo: { messageAssociation: { associationType: 12, parentMessageKey: msg.key } }\n}, {});`;
        return ctx.reply("💡 *Paired Media Hack Code* (Inatuma picha na video kama ujumbe pacha mmoja):\n\n```javascript\n" + code + "\n```");
    }

    // --- F. ADVANCED: ANIMATED LINK LOOP (NEW) ---
    if (input === 'test_linkloop') {
        const code = `// 🔄 ANIMATED LINK LOOP (Kubadilisha picha za ujumbe mmoja mfululizo)\nconst { delay, prepareWAMessageMedia } = require('baileys');\n\nconst medias = await Promise.all(urls.map(async url => {\n  const { imageMessage } = await prepareWAMessageMedia({ image: { url } }, { upload: conn.waUploadToServer, mediaTypeOverride: 'thumbnail-link' });\n  return imageMessage;\n}));\n\nfor(let i = 0; i < 5; i++) {\n  for (const image of medias) {\n    await conn.sendMessage(chatId, {\n      edit: key, // Inahariri ujumbe uleule uliopita\n      text: "https://nixel.dev\\nNIXCODE",\n      linkPreview: {\n        'matched-text': "https://nixel.dev",\n        title: "Nixel",\n        jpegThumbnail: image.jpegThumbnail,\n        highQualityThumbnail: image\n      }\n    });\n    await delay(2000); // Inasubiri sekunde 2 kubadili\n  }\n}`;
        return ctx.reply("💡 *Animated Link Loop Code* (Inahariri ujumbe uleule mmoja ili kutengeneza Link Animation ya picha):\n\n```javascript\n" + code + "\n```");
    }
};

sourceCommand.category = 'UTILITY';
sourceCommand.description = 'Test kila function na advanced hacks za bot';

module.exports = sourceCommand;

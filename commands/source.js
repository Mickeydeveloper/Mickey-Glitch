const { Button, ButtonV2, Carousel, AIRich, createCtx } = require('../lib/messageBuilder');

const sourceCommand = async (sock, chatId, msg, args) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();

    // Raw links za picha kutoka kwenye GitHub repository yako (Mickey-Vip/Privacy)
    const img1 = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/connection.jpg";
    const img2 = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg";
    const img3 = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy2.jpg";
    const img4 = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy3.jpg";

    // Direct link ya video uliyonipa
    const sampleVideo = "https://n.uguu.se/VfoPbJXx.mp4";

    // ─── 1. MENU KUU YA BUTTONS ───
    if (!input) {
        try {
            const mainMenus = new Button(sock)
                .setTitle('🧩 Mickey Glitch Lab v4.9')
                .setSubtitle('Core & Advanced Engine')
                .setBody('Chagua sehemu unayotaka kuona mifano (Samples) na kodi (Source Codes) zake:')
                .setFooter('MICKEY BOT');

            mainMenus.addReply('📁 Core: Buttons & Flow', '.source kundi_core');
            mainMenus.addReply('🚀 Advanced: Media Hacks', '.source kundi_advanced');

            await mainMenus.send(ctx.chatId, { quoted: ctx._msg });
            return;
        } catch (e) {
            console.error('Error kwenye menu kuu:', e);
            return sock.sendMessage(ctx.chatId, { text: '❌ Imeshindwa kufungua Tester Menu.' }, { quoted: ctx._msg });
        }
    }

    // ─── SUB-MENU 1: CORE ENGINE ───
    if (input === 'kundi_core') {
        const coreMenu = new Button(sock)
            .setTitle('📁 Core Engine Features')
            .setBody('Maumbo ya msingi ya messageBuilder yako:')
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
            .setBody('Mbinu mpya zinazoonyesha Sample na kodi zake:')
            .setFooter('MICKEY BOT');

        advMenu.addReply('🎞️ Paired Media (Split Message)', '.source test_paired');
        advMenu.addReply('🔄 Animated Link Loop (Edit Key)', '.source test_linkloop');
        advMenu.addReply('⬅️ Rudi Nyuma', '.source');

        await advMenu.send(ctx.chatId, { quoted: ctx._msg });
        return;
    }

    // ─── 2. SAMPLES & SOURCE CODES ───

    // --- BUTTON V2 ---
    if (input === 'test_v2') {
        const btnV2 = new ButtonV2(sock)
            .setTitle("Mickey ButtonV2")
            .setBody("Huu ni mfano wa muundo wa ButtonV2.");
        btnV2.addButton("Menu 📦", ".menu");
        await btnV2.send(ctx.chatId, { quoted: ctx._msg });

        const code = `// Muundo wa ButtonV2\nconst { ButtonV2 } = require('./lib/messageBuilder');\nconst btnV2 = new ButtonV2(sock)\n  .setTitle("Mickey ButtonV2")\n  .addButton("Menu 📦", ".menu");\nawait btnV2.send(chatId, { quoted: msg });`;
        return sock.sendMessage(ctx.chatId, { text: "```javascript\n" + code + "\n```" }, { quoted: ctx._msg });
    }

    // --- CAROUSEL ---
    if (input === 'test_carousel') {
        try {
            const waLink = "https://wa.me/255719632816";
            const sampleCarousel = new Carousel(sock).setBody("🛒 *Mickey Store Preview*");

            const cards = [
                {
                    header: { title: "Mickey Privacy", hasMediaAttachment: true, imageMessage: { url: img1 } },
                    body: { text: "Brand: Mickey Bot\nFeature: Connection Secure" },
                    footer: { text: "Mickey Bot" },
                    nativeFlowMessage: { buttons: [{ name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "Support 🛍️", url: waLink }) }] }
                }
            ];

            cards.forEach(card => sampleCarousel.addCard(card));
            await sampleCarousel.send(ctx.chatId, { quoted: ctx._msg });

            const code = `// Muundo wa Carousel\nconst crsl = new Carousel(sock);\n// ...addCard(card);\nawait crsl.send(chatId);`;
            return sock.sendMessage(ctx.chatId, { text: "```javascript\n" + code + "\n```" }, { quoted: ctx._msg });
        } catch (e) { 
            return sock.sendMessage(ctx.chatId, { text: "❌ Error: " + e.message }, { quoted: ctx._msg }); 
        }
    }

    // --- AIRICH TEXT ---
    if (input === 'test_airich') {
        const rich = new AIRich(sock).setTitle('🧠 AI Engine').addText('Mfano wa AIRich Markdown Text.').addSuggest(['.menu']);
        await rich.send(ctx.chatId, { quoted: ctx._msg, forwarded: true });

        const code = `const rich = new AIRich(sock).setTitle('🧠 AI Engine').addText('Text').send(chatId);`;
        return sock.sendMessage(ctx.chatId, { text: "```javascript\n" + code + "\n```" }, { quoted: ctx._msg });
    }

    // --- AIRICH TABLES ---
    if (input === 'test_table') {
        const richTable = new AIRich(sock).setTitle('📊 Table').addTable([["Command", "Status"], [".fromai", "Online ✅"]]);
        await richTable.send(ctx.chatId, { quoted: ctx._msg, forwarded: true });

        const code = `const rich = new AIRich(sock).addTable([["H1", "H2"], ["D1", "D2"]]);`;
        return sock.sendMessage(ctx.chatId, { text: "```javascript\n" + code + "\n```" }, { quoted: ctx._msg });
    }

    // --- ADVANCED: PAIRED MEDIA ---
    if (input === 'test_paired') {
        try {
            // Inatuma picha na video moja kwa moja kuonyesha Live Sample ya uwezo wa media
            await sock.sendMessage(ctx.chatId, { image: { url: img1 }, caption: "🎬 *Mickey Live Sample (Image part)*" }, { quoted: ctx._msg });
            await sock.sendMessage(ctx.chatId, { video: { url: sampleVideo }, caption: "🎞️ *Mickey Live Sample (Video part)*" }, { quoted: ctx._msg });
        } catch (e) {
            console.error(e);
        }

        const code = `// 🎞️ PAIRED MEDIA HACK\nconst image = await prepareWAMessageMedia({ image: { url: '${img1}' } }, { upload: sock.waUploadToServer });\nconst video = await prepareWAMessageMedia({ video: { url: '${sampleVideo}' } }, { upload: sock.waUploadToServer });\n\nconst msg = generateWAMessageFromContent(chatId, { imageMessage: { ...image.imageMessage, contextInfo: { pairedMediaType: 5, statusSourceType: 0 } } }, {});\nawait sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });\n\nawait sock.relayMessage(chatId, {\n  videoMessage: { ...video.videoMessage, contextInfo: { pairedMediaType: 6, statusSourceType: 0 } },\n  messageContextInfo: { messageAssociation: { associationType: 12, parentMessageKey: msg.key } }\n}, {});`;
        return sock.sendMessage(ctx.chatId, { text: "💡 *Paired Media Source Code*:\n```javascript\n" + code + "\n```" }, { quoted: ctx._msg });
    }

    // --- ADVANCED: ANIMATED LINK LOOP ---
    if (input === 'test_linkloop') {
        try {
            // Inatuma link ikiwa na preview ya picha zako kutoka GitHub
            await sock.sendMessage(ctx.chatId, { 
                text: `🎞️ *Mickey Preview Link Loop*\nLink: ${sampleVideo}`,
                contextInfo: {
                    externalAdReply: {
                        title: "Mickey Privacy Engine",
                        body: "Live Slideshow & Link Preview",
                        previewType: "PHOTO",
                        thumbnailUrl: img2,
                        sourceUrl: sampleVideo
                    }
                }
            }, { quoted: ctx._msg });
        } catch (e) {
            console.error(e);
        }

        const code = `// 🔄 ANIMATED LINK LOOP HACK\nconst urls = ["${img2}", "${img3}", "${img4}"];\nconst medias = await Promise.all(urls.map(async url => {\n  const { imageMessage } = await prepareWAMessageMedia({ image: { url } }, { upload: conn.waUploadToServer, mediaTypeOverride: 'thumbnail-link' });\n  return imageMessage;\n}));\n\nfor(let i = 0; i < 3; i++) {\n  for (const image of medias) {\n    await conn.sendMessage(chatId, {\n      edit: key,\n      text: "https://nixel.dev\\n🎬 SLIDESHOW RUNNING",\n      linkPreview: { \n        'matched-text': "https://nixel.dev", \n        title: "Mickey Privacy Loop", \n        jpegThumbnail: image.jpegThumbnail, \n        highQualityThumbnail: image \n      }\n    });\n    await delay(1500);\n  }\n}`;
        return sock.sendMessage(ctx.chatId, { text: "💡 *Animated Link Loop Source Code*:\n```javascript\n" + code + "\n```" }, { quoted: ctx._msg });
    }
};

sourceCommand.category = 'UTILITY';
sourceCommand.description = 'Test kila function na advanced hacks za bot zenye Live Samples';

module.exports = sourceCommand;

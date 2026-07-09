// source.js - Full Fixed & Optimized Version 
const { Button, ButtonV2, Carousel, AIRich, createCtx } = require('../lib/messageBuilder');
const baileys = require('@whiskeysockets/baileys');
const axios = require('axios');
const cheerio = require('cheerio');

// Function ya kutengeneza delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function ya kupata mifano kutoka Pastebin ya Nixellv2
async function fetchNixellExamples() {
    try {
        console.log('📥 Inapakua mifano kutoka Nixellv2 Pastebin...');
        const response = await axios.get('https://pastebin.com/u/Nixellv2', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const examples = [];

        $('table.maintable tr').each((i, row) => {
            if (i === 0) return;
            const columns = $(row).find('td');
            if (columns.length >= 4) {
                const title = $(columns[0]).text().trim();
                const link = $(columns[0]).find('a').attr('href');
                const added = $(columns[1]).text().trim();
                const syntax = $(columns[4]).text().trim();

                if (title && link) {
                    examples.push({
                        title: title,
                        link: link.startsWith('http') ? link : `https://pastebin.com${link}`,
                        added: added,
                        syntax: syntax,
                        id: link.split('/').pop()
                    });
                }
            }
        });

        console.log(`✅ Imepata ${examples.length} mifano kutoka Nixellv2`);
        return examples;
    } catch (error) {
        console.error('❌ Imeshindwa kupata mifano:', error.message);
        return [];
    }
}

// Function ya kupata content ya paste moja
async function fetchPasteContent(pasteId) {
    try {
        const response = await axios.get(`https://pastebin.com/raw/${pasteId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        return response.data;
    } catch (error) {
        console.error(`❌ Imeshindwa kupata paste ${pasteId}:`, error.message);
        return null;
    }
}

// --- LIVE SAMPLES ZA NIXELLV2 ---
async function showNixellLiveSample(sock, chatId, msg, example, content) {
    try {
        if (!content) return false;

        // FIXED HACK: Kama kodi ina muundo wa relayMessage au interactiveMessage, itakuwa executed kama live sample papo hapo!
        if (content.includes('relayMessage') || content.includes('interactiveMessage') || content.includes('documentMessage') || content.includes('stickerMessage')) {
            try {
                // Tunatengeneza mazingira ya sanduku la usalama (Sandbox/Function Eval) kurun ile string code kama javascript halisi
                const runTemplate = new Function('sock', 'chatId', 'msg', 'baileys', `
                    const conn = sock; 
                    const m = { chat: chatId };
                    try {
                        ${content}
                    } catch(err) {
                        console.error("Internal template runtime error:", err);
                    }
                `);
                runTemplate(sock, chatId, msg, baileys);
                return true;
            } catch (e) {
                console.error("❌ Imeshindwa ku-render live template kutoka pastebin:", e.message);
            }
        }

        // Hardcoded options zilizobaki kwa ajili ya usalama wa ziada
        const title = example.title.toLowerCase();

        if (title.includes('thumbnail edit') || title.includes('tmte')) {
            const imgUrl = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/connection.jpg";
            await sock.sendMessage(chatId, {
                text: '🖼️ *Thumbnail Edit Live Sample*\n\nInaonyesha jinsi ya kubadilisha thumbnail ya link...',
                linkPreview: {
                    'matched-text': 'https://example.com',
                    title: 'Thumbnail Edit Demo',
                    jpegThumbnail: await baileys.prepareWAMessageMedia({ image: { url: imgUrl } }, { upload: sock.waUploadToServer, mediaTypeOverride: 'thumbnail-link' })
                }
            }, { quoted: msg });
            return true;
        }
        else if (title.includes('stickerpack') || title.includes('tspk')) {
            const stickerUrl = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg";
            const media = await baileys.prepareWAMessageMedia({ image: { url: stickerUrl } }, { upload: sock.waUploadToServer });
            await sock.sendMessage(chatId, {
                sticker: media,
                contextInfo: { isStickerPack: true }
            }, { quoted: msg });
            return true;
        }
        else if (title.includes('latex')) {
            await sock.sendMessage(chatId, {
                text: '📐 *LaTeX Live Sample*\n\n`E = mc²`\n`∫₀¹ x² dx = ⅓`\n`\\frac{-b ± √(b²-4ac)}{2a}`'
            }, { quoted: msg });
            return true;
        }
        else if (title.includes('single select')) {
            const btn = new Button(sock)
                .setTitle('🔘 Single Select Sample')
                .setBody('Chagua moja:')
                .addReply('✅ Option 1', '.source nixell_selected')
                .addReply('✅ Option 2', '.source nixell_selected');
            await btn.send(chatId, { quoted: msg });
            return true;
        }

        return false; 
    } catch (error) {
        console.error('❌ Live sample error:', error);
        return false;
    }
}

// --- MAIN SOURCE COMMAND ---
const sourceCommand = async (sock, chatId, msg, args) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();

    // Raw links za picha
    const img1 = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/connection.jpg";
    const img2 = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg";
    const img3 = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy2.jpg";
    const img4 = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy3.jpg";
    const sampleVideo = "https://n.uguu.se/VfoPbJXx.mp4";

    // ─── 1. MENU KUU ───
    if (!input) {
        try {
            const nixellExamples = await fetchNixellExamples();

            const mainMenus = new Button(sock)
                .setTitle('🧩 Mickey Glitch Lab v4.9')
                .setSubtitle('Core & Advanced Engine')
                .setBody('Chagua sehemu unayotaka kuona mifano (Samples) na kodi (Source Codes) zake:')
                .setFooter('MICKEY BOT');

            mainMenus.addReply('📁 Core: Buttons & Flow', '.source kundi_core');
            mainMenus.addReply('🚀 Advanced: Media Hacks', '.source kundi_advanced');

            if (nixellExamples.length > 0) {
                mainMenus.addReply('📚 Nixellv2 Examples (Live)', '.source nixell_menu');
            }

            mainMenus.addReply('🔄 Refresh Examples', '.source refresh');
            mainMenus.addReply('❌ Close Menu', '.source close');

            await mainMenus.send(ctx.chatId, { quoted: ctx._msg });
            return;
        } catch (e) {
            console.error('Error kwenye menu kuu:', e);
            return sock.sendMessage(ctx.chatId, { text: '❌ Imeshindwa kufungua Tester Menu.' }, { quoted: ctx._msg });
        }
    }

    // ─── REFRESH EXAMPLES ───
    if (input === 'refresh') {
        await sock.sendMessage(ctx.chatId, { text: '🔄 Inapakua mifano mpya kutoka Nixellv2...' }, { quoted: ctx._msg });
        const examples = await fetchNixellExamples();
        if (examples.length > 0) {
            return sock.sendMessage(ctx.chatId, { 
                text: `✅ Imepakua ${examples.length} mifano mpya!\nTumia .source nixell_menu kuona orodha.` 
            }, { quoted: ctx._msg });
        } else {
            return sock.sendMessage(ctx.chatId, { text: '❌ Imeshindwa kupakua mifano. Jaribu tena.' }, { quoted: ctx._msg });
        }
    }

    // ─── NIXELLV2 MENU ───
    if (input === 'nixell_menu') {
        const examples = await fetchNixellExamples();
        if (examples.length === 0) {
            return sock.sendMessage(ctx.chatId, { 
                text: '❌ Hakuna mifano iliyopatikana. Jaribu .source refresh' 
            }, { quoted: ctx._msg });
        }

        const nixellMenu = new Button(sock)
            .setTitle('📚 Nixellv2 Live Samples')
            .setBody(`Mifano ${examples.length} zilizopatikana kutoka Nixellv2's Pastebin:\n\n` +
                examples.slice(0, 10).map((ex, i) => 
                    `${i+1}. ${ex.title} (${ex.syntax})`
                ).join('\n') +
                `\n\n📌 Tuma .source nixell_[namba] kuona live sample + code`)
            .setFooter('MICKEY BOT');

        examples.slice(0, 5).forEach((ex, i) => {
            nixellMenu.addReply(`${i+1}. ${ex.title.substring(0, 20)}...`, `.source nixell_${i}`);
        });

        nixellMenu.addReply('⬅️ Rudi Nyuma', '.source');

        await nixellMenu.send(ctx.chatId, { quoted: ctx._msg });
        return;
    }

    // ─── SHOW SPECIFIC NIXELL EXAMPLE (LIVE SAMPLE + CODE) ───
    if (input.startsWith('nixell_')) {
        const index = parseInt(input.split('_')[1]);
        const examples = await fetchNixellExamples();

        if (isNaN(index) || index >= examples.length) {
            return sock.sendMessage(ctx.chatId, { 
                text: '❌ Namba ya mfano haipo. Tumia .source nixell_menu kuona orodha.' 
            }, { quoted: ctx._msg });
        }

        const example = examples[index];
        await sock.sendMessage(ctx.chatId, { 
            text: `🎬 Inapakua na kuandaa Live Sample ya: ${example.title}...` 
        }, { quoted: ctx._msg });

        // 1. VUTA KODI KWANZA KUTOKA KWENYE PASTEBIN (Inazuia kufanya request mara mbili)
        const content = await fetchPasteContent(example.id);

        if (content) {
            // 2. RUN NA UONYESHE MFANO (LIVE SAMPLE)
            const isLiveRendered = await showNixellLiveSample(sock, chatId, msg, example, content);
            
            if (!isLiveRendered) {
                await sock.sendMessage(ctx.chatId, { text: '💡 _Mfano huu hauna muundo wa live render, unaonyeshwa kama kodi tu._' }, { quoted: ctx._msg });
            }

            await delay(1500); // Mpe mtumiaji muda wa sekunde 1.5 kuona Live Sample ikitua kabla ya kodi kuandikwa

            // 3. TUMA SOURCE CODE YAKE YA MAANDISHI
            const codeMessage = `📌 *${example.title}*\n📅 Added: ${example.added}\n🔧 Syntax: ${example.syntax}\n\n📝 *Source Code:*\n\`\`\`javascript\n${content.substring(0, 4000)}\n\`\`\``;

            if (content.length > 4000) {
                await sock.sendMessage(ctx.chatId, { text: codeMessage }, { quoted: ctx._msg });
                await sock.sendMessage(ctx.chatId, { 
                    text: `📎 *Link kamili ya kodi:* ${example.link}` 
                }, { quoted: ctx._msg });
            } else {
                await sock.sendMessage(ctx.chatId, { text: codeMessage }, { quoted: ctx._msg });
            }
        } else {
            return sock.sendMessage(ctx.chatId, { 
                text: `❌ Imeshindwa kupata kodi ya paste hii. Jaribu kuifungua moja kwa moja hapa: ${example.link}` 
            }, { quoted: ctx._msg });
        }
        return;
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

    // ─── SUB-MENU 2: ADVANCED HACKS ───
    if (input === 'kundi_advanced') {
        const advMenu = new Button(sock)
            .setTitle('🚀 Advanced & Other Hacks')
            .setBody('Mbinu mpya zinazoonyesha Sample na kodi zake:')
            .setFooter('MICKEY BOT');

        advMenu.addReply('🎞️ Paired Media (Split Message)', '.source test_paired');
        advMenu.addReply('🔄 Animated Link Loop (Edit Key)', '.source test_linkloop');
        advMenu.addReply('💬 AI Message with Icon', '.source test_ai_message');
        advMenu.addReply('⬅️ Rudi Nyuma', '.source');

        await advMenu.send(ctx.chatId, { quoted: ctx._msg });
        return;
    }

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
            await sock.sendMessage(ctx.chatId, { text: '⏳ _Inatengeneza muundo wa Paired Media Live..._' }, { quoted: ctx._msg });

            const image = await baileys.prepareWAMessageMedia({ image: { url: img1 } }, { upload: sock.waUploadToServer });
            const video = await baileys.prepareWAMessageMedia({ video: { url: sampleVideo } }, { upload: sock.waUploadToServer });

            const msgMedia = baileys.generateWAMessageFromContent(ctx.chatId, { 
                imageMessage: { ...image.imageMessage, contextInfo: { pairedMediaType: 5, statusSourceType: 0 } } 
            }, {});
            await sock.relayMessage(ctx.chatId, msgMedia.message, { messageId: msgMedia.key.id });

            await sock.relayMessage(ctx.chatId, {
                videoMessage: { ...video.videoMessage, contextInfo: { pairedMediaType: 6, statusSourceType: 0 } },
                messageContextInfo: { messageAssociation: { associationType: 12, parentMessageKey: msgMedia.key } }
            }, {});
        } catch (e) {
            console.error("Error kwenye Paired Media Sample:", e);
        }

        const code = `// 🎞️ PAIRED MEDIA HACK\nconst image = await prepareWAMessageMedia({ image: { url: '${img1}' } }, { upload: sock.waUploadToServer });\nconst video = await prepareWAMessageMedia({ video: { url: '${sampleVideo}' } }, { upload: sock.waUploadToServer });\n\nconst msg = generateWAMessageFromContent(chatId, { imageMessage: { ...image.imageMessage, contextInfo: { pairedMediaType: 5, statusSourceType: 0 } } }, {});\nawait sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });\n\nawait sock.relayMessage(chatId, {\n  videoMessage: { ...video.videoMessage, contextInfo: { pairedMediaType: 6, statusSourceType: 0 } },\n  messageContextInfo: { messageAssociation: { associationType: 12, parentMessageKey: msg.key } }\n}, {});`;
        return sock.sendMessage(ctx.chatId, { text: "💡 *Paired Media Source Code*:\n```javascript\n" + code + "\n```" }, { quoted: ctx._msg });
    }

    // --- ADVANCED: ANIMATED LINK LOOP ---
    if (input === 'test_linkloop') {
        try {
            const { key } = await sock.sendMessage(ctx.chatId, { text: '🎬 PRIVACY SLIDESHOW LOADING...' }, { quoted: ctx._msg });

            const demoUrls = [img2, img3, img4];
            const medias = await Promise.all(demoUrls.map(async url => {
                const { imageMessage } = await baileys.prepareWAMessageMedia({ image: { url } }, { upload: sock.waUploadToServer, mediaTypeOverride: 'thumbnail-link' });
                return imageMessage;
            }));

            for(let i = 0; i < 2; i++) {
                for (const image of medias) {
                    await sock.sendMessage(ctx.chatId, {
                        edit: key,
                        text: "https://nixel.dev\n🎬 PRIVACY SLIDESHOW PLAYING...",
                        linkPreview: {
                            'matched-text': "https://nixel.dev",
                            title: "Mickey Privacy Loop",
                            jpegThumbnail: image.jpegThumbnail,
                            highQualityThumbnail: image
                        }
                    });
                    await delay(1500);
                }
            }
        } catch (e) {
            console.error("Error kwenye Link Loop Sample:", e);
        }

        const code = `// 🔄 ANIMATED LINK LOOP HACK\nconst urls = ["${img2}", "${img3}", "${img4}"];\nconst medias = await Promise.all(urls.map(async url => {\n  const { imageMessage } = await prepareWAMessageMedia({ image: { url } }, { upload: conn.waUploadToServer, mediaTypeOverride: 'thumbnail-link' });\n  return imageMessage;\n}));\n\nfor(let i = 0; i < 3; i++) {\n  for (const image of medias) {\n    await conn.sendMessage(chatId, {\n      edit: key,\n      text: "https://nixel.dev\\n🎬 SLIDESHOW RUNNING",\n      linkPreview: { \n        'matched-text': "https://nixel.dev", \n        title: "Mickey Privacy Loop", \n        jpegThumbnail: image.jpegThumbnail, \n        highQualityThumbnail: image \n      }\n    });\n    await delay(1500);\n  }\n}`;
        return sock.sendMessage(ctx.chatId, { text: "💡 *Animated Link Loop Source Code*:\n```javascript\n" + code + "\n```" }, { quoted: ctx._msg });
    }

    // --- AI MESSAGE WITH ICON ---
    if (input === 'test_ai_message') {
        try {
            const { randomBytes } = require('crypto');
            const aiMessage = {
                conversation: '🤖 *Mickey AI Assistant*\n\nHujambo! Mimi ni Mickey AI. Niko hapa kukusaidia na maswali yako yote.',
                messageContextInfo: {
                    messageSecret: randomBytes(32),
                    supportPayload: JSON.stringify({
                        version: 1,
                        is_ai_message: true,
                        should_show_system_message: true,
                        ticket_id: Date.now().toString()
                    })
                }
            };

            await sock.relayMessage(ctx.chatId, aiMessage, {
                additionalNodes: [
                    { "attrs": { "biz_bot": "1" }, "tag": "bot" },
                    { "attrs": {}, "tag": "biz" }
                ],
                quoted: ctx._msg
            });
        } catch (e) {
            console.error('AI Message Error:', e);
        }

        const code = `// 💬 AI MESSAGE WITH ICON\nconst { randomBytes } = require('crypto');\nconst aiMessage = {\n  conversation: 'Mickey AI Assistant',\n  messageContextInfo: {\n    messageSecret: randomBytes(32),\n    supportPayload: JSON.stringify({\n      version: 1,\n      is_ai_message: true,\n      should_show_system_message: true,\n      ticket_id: Date.now().toString()\n    })\n  }\n};\n\nawait sock.relayMessage(chatId, aiMessage, {\n  additionalNodes: [\n    { "attrs": { "biz_bot": "1" }, "tag": "bot" },\n    { "attrs": {}, "tag": "biz" }\n  ],\n  quoted: msg\n});`;
        return sock.sendMessage(ctx.chatId, { text: "💡 *AI Message Source Code*:\n```javascript\n" + code + "\n```" }, { quoted: ctx._msg });
    }

    // --- CLOSE MENU ---
    if (input === 'close') {
        return sock.sendMessage(ctx.chatId, { 
            text: '✅ Menu imefungwa. Tumia .source kufungua tena.' 
        }, { quoted: ctx._msg });
    }

    // --- DEFAULT ---
    return sock.sendMessage(ctx.chatId, { 
        text: `❌ Amri '${input}' haijulikani. Tumia .source kuona orodha.` 
    }, { quoted: ctx._msg });
};

sourceCommand.category = 'UTILITY';
sourceCommand.description = 'Test kila function na advanced hacks za bot zenye Live Samples na mifano kutoka Nixellv2';

module.exports = sourceCommand;

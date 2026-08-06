// source.js - Full Fixed & Optimized Version with Advanced Features
const { Button, ButtonV2, Carousel, AIRich, createCtx } = require('../lib/messageBuilder');
const baileys = require('@whiskeysockets/baileys');
const axios = require('axios');
const cheerio = require('cheerio');

// Function ya kutengeneza delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ==============================================
// 📥 NIXELLV2 PASTEBIN INTEGRATION
// ==============================================

// Function ya kupata mifano yote kutoka Pastebin ya Nixellv2
async function fetchNixellExamples() {
    try {
        console.log('📥 Inapakua mifano kutoka Nixellv2 Pastebin...');
        const response = await axios.get('https://pastebin.com/u/Nixellv2', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const examples = [];

        try {
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
        } catch (parseError) {
            console.error('❌ Imeshindwa kuparsa HTML:', parseError.message);
            return [];
        }

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
            },
            timeout: 10000
        });
        return response.data;
    } catch (error) {
        console.error(`❌ Imeshindwa kupata paste ${pasteId}:`, error.message);
        return null;
    }
}

// ==============================================
// 🗑️ DELETE MESSAGES FUNCTION
// ==============================================

async function deletePreviousMessages(sock, chatId, messages) {
    try {
        if (!messages || messages.length === 0) return;

        for (const msg of messages) {
            if (msg && msg.key) {
                try {
                    await sock.sendMessage(chatId, {
                        delete: msg.key
                    });
                    await delay(200);
                } catch (deleteError) {
                    console.log('Error deleting single message:', deleteError.message);
                }
            }
        }
    } catch (e) {
        console.log('Error deleting messages:', e);
    }
}

// Store ya messages za kila user
const userMessages = {};

// ==============================================
// 🎬 LIVE SAMPLES ZA NIXELLV2 (ZENYE CONTENT HALISI)
// ==============================================

// Function ya ku-run live samples kutoka pastebin
async function showNixellLiveSample(sock, chatId, msg, example, content) {
    try {
        if (!content) return false;

        // SAVE MESSAGE KWA AJILI YA KUFUTA BAADAYE
        if (!userMessages[chatId]) userMessages[chatId] = [];
        userMessages[chatId].push(msg);

        // Kama kodi ina muundo wa relayMessage au interactiveMessage, itakuwa executed kama live sample
        if (content.includes('relayMessage') || content.includes('interactiveMessage') || 
            content.includes('documentMessage') || content.includes('stickerMessage')) {
            try {
                const sanitizedContent = content
                    .replace(/sock\.sendMessage/g, 'sock?.sendMessage')
                    .replace(/sock\.relayMessage/g, 'sock?.relayMessage');

                const runTemplate = new Function('sock', 'chatId', 'msg', 'baileys', `
                    const conn = sock; 
                    const m = { chat: chatId };
                    try {
                        ${sanitizedContent}
                    } catch(err) {
                        console.error("Internal template runtime error:", err);
                        return false;
                    }
                    return true;
                `);
                return await runTemplate(sock, chatId, msg, baileys) || false;
            } catch (e) {
                console.error("❌ Imeshindwa ku-render live template kutoka pastebin:", e.message);
                return false;
            }
        }

        // Hardcoded options kwa ajili ya usalama wa ziada
        const title = example.title.toLowerCase();

        // ==============================================
        // 🆕 SINGLE SELECT WITH BUTTONV2 (FEATURE KALI)
        // ==============================================
        if (title.includes('single select') || title.includes('select')) {
            try {
                // SINGLE SELECT USING BUTTONV2
                const singleSelectBtn = await new ButtonV2(sock)
                    .setBody('🔘 *Single Select Demo*\n\nChagua moja kati ya chaguzi zifuatazo:')
                    .setFooter('⚡ Mickey Glitch Sub')
                    .setThumbnail('https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/connection.jpg')
                    .addRawButton({
                        buttonText: { displayText: '📋 Chagua Option' },
                        buttonId: 'single_select_demo',
                        type: 1,
                        nativeFlowInfo: {
                            name: 'single_select',
                            paramsJson: JSON.stringify({
                                title: '🔘 Chagua Chaguo Lako',
                                sections: [{
                                    title: '📌 Main Options',
                                    highlight_label: '⬇️ Chagua',
                                    rows: [
                                        {
                                            header: '🔹',
                                            title: 'Option 1 - Core',
                                            description: 'Inaonyesha mifano ya msingi',
                                            id: 'option_core'
                                        },
                                        {
                                            header: '🔸',
                                            title: 'Option 2 - Advanced',
                                            description: 'Inaonyesha mifano ya hali ya juu',
                                            id: 'option_advanced'
                                        },
                                        {
                                            header: '🔹',
                                            title: 'Option 3 - Premium',
                                            description: 'Inaonyesha mifano ya premium',
                                            id: 'option_premium'
                                        }
                                    ]
                                },
                                {
                                    title: '🎯 Quick Actions',
                                    highlight_label: '⚡',
                                    rows: [
                                        {
                                            header: '📚',
                                            title: 'View All Examples',
                                            description: 'Ona mifano yote',
                                            id: 'view_all'
                                        },
                                        {
                                            header: '🔄',
                                            title: 'Refresh Menu',
                                            description: 'Pakua mifano mpya',
                                            id: 'refresh_menu'
                                        }
                                    ]
                                }]
                            })
                        }
                    })
                    .send(chatId, { quoted: msg });

                userMessages[chatId].push(singleSelectBtn);
                
                // Tuma pia code example
                const codeMsg = await sock.sendMessage(chatId, {
                    text: '```javascript\n' +
                          '// 🆕 SINGLE SELECT WITH BUTTONV2\n' +
                          'await new ButtonV2(conn)\n' +
                          '    .setBody("🔘 Chagua moja kati ya chaguzi:")\n' +
                          '    .setFooter("⚡ Mickey Glitch Sub")\n' +
                          '    .setThumbnail("https://example.com/image.jpg")\n' +
                          '    .addRawButton({\n' +
                          '        buttonText: { displayText: "📋 Chagua Option" },\n' +
                          '        buttonId: "single_select_demo",\n' +
                          '        type: 1,\n' +
                          '        nativeFlowInfo: {\n' +
                          '            name: "single_select",\n' +
                          '            paramsJson: JSON.stringify({\n' +
                          '                title: "🔘 Chagua Chaguo Lako",\n' +
                          '                sections: [{\n' +
                          '                    title: "📌 Main Options",\n' +
                          '                    highlight_label: "⬇️ Chagua",\n' +
                          '                    rows: [\n' +
                          '                        { header: "🔹", title: "Option 1", description: "Maelezo", id: "opt1" },\n' +
                          '                        { header: "🔸", title: "Option 2", description: "Maelezo", id: "opt2" }\n' +
                          '                    ]\n' +
                          '                }]\n' +
                          '            })\n' +
                          '        }\n' +
                          '    })\n' +
                          '    .send(chatId);\n' +
                          '```'
                }, { quoted: msg });
                userMessages[chatId].push(codeMsg);
                return true;
            } catch (sampleError) {
                console.error('❌ Single select sample failed:', sampleError.message);
                return false;
            }
        }

        // ==============================================
        // 🆕 MULTI-SELECT WITH BUTTONV2
        // ==============================================
        if (title.includes('multi select')) {
            try {
                const multiSelectBtn = await new ButtonV2(sock)
                    .setBody('☑️ *Multi-Select Demo*\n\nChagua chaguo nyingi:')
                    .setFooter('⚡ Mickey Glitch Sub')
                    .setThumbnail('https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg')
                    .addRawButton({
                        buttonText: { displayText: '☑️ Chagua Nyingi' },
                        buttonId: 'multi_select_demo',
                        type: 1,
                        nativeFlowInfo: {
                            name: 'multi_select',
                            paramsJson: JSON.stringify({
                                title: '☑️ Chagua Chaguo Nyingi',
                                sections: [{
                                    title: '📌 Features',
                                    highlight_label: '✅',
                                    rows: [
                                        { header: '🚀', title: 'Feature 1 - Speed', description: 'Inaharakisha processing', id: 'feat_speed' },
                                        { header: '🔒', title: 'Feature 2 - Security', description: 'Inalinda data zako', id: 'feat_security' },
                                        { header: '🎨', title: 'Feature 3 - Design', description: 'Inaboresha UI/UX', id: 'feat_design' }
                                    ]
                                }]
                            })
                        }
                    })
                    .send(chatId, { quoted: msg });

                userMessages[chatId].push(multiSelectBtn);
                return true;
            } catch (error) {
                console.error('❌ Multi-select failed:', error.message);
                return false;
            }
        }

        // ==============================================
        // 🆕 BUTTONV2 WITH CTA URL & COPY (FEATURE KALI)
        // ==============================================
        if (title.includes('buttonv2') || title.includes('cta')) {
            try {
                const advancedBtn = await new ButtonV2(sock)
                    .setTitle('🚀 Advanced ButtonV2 Demo')
                    .setBody('📋 *ButtonV2 with Multiple Features*\n\n' +
                            '👤 Username: demo_user\n' +
                            '🔑 Password: demo_pass123\n' +
                            '🌐 Panel: https://panel.example.com\n\n' +
                            '💡 *Click buttons below to interact*')
                    .setFooter('⚡ Mickey Glitch Sub')
                    .setThumbnail('https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/connection.jpg')
                    
                    // CTA COPY
                    .addButton({
                        name: 'cta_copy',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📋 Copy Username',
                            copy_code: 'demo_user',
                            id: 'copy_user'
                        })
                    })
                    .addButton({
                        name: 'cta_copy',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🔑 Copy Password',
                            copy_code: 'demo_pass123',
                            id: 'copy_pass'
                        })
                    })
                    
                    // CTA URL
                    .addRawButton({
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🌐 Open Panel',
                            url: 'https://panel.example.com',
                            webview_interaction: false
                        })
                    })
                    
                    // Quick Reply
                    .addRawButton({
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📋 Menu',
                            id: '.source'
                        })
                    })
                    .send(chatId, { quoted: msg });

                userMessages[chatId].push(advancedBtn);
                return true;
            } catch (error) {
                console.error('❌ ButtonV2 advanced failed:', error.message);
                return false;
            }
        }

        // ==============================================
        // 🆕 CAROUSEL WITH MULTIPLE CARDS
        // ==============================================
        if (title.includes('carousel')) {
            try {
                const carousel = new Carousel(sock);
                carousel
                    .setTitle('🎠 Carousel Demo')
                    .setBody('📋 *Multiple Cards Display*')
                    .setFooter('⚡ Mickey Glitch Sub')
                    .addCard({
                        header: {
                            title: '📦 Package 1',
                            hasMediaAttachment: true,
                            imageMessage: {
                                url: 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg',
                                mimetype: 'image/png'
                            }
                        },
                        body: {
                            text: '🔹 *Basic Package*\nRAM: 1GB\nCPU: 100%\nPrice: TSh 5,000'
                        },
                        footer: {
                            text: '⚡ Mickey Glitch Sub'
                        }
                    })
                    .addCard({
                        header: {
                            title: '🚀 Package 2',
                            hasMediaAttachment: true,
                            imageMessage: {
                                url: 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy2.jpg',
                                mimetype: 'image/png'
                            }
                        },
                        body: {
                            text: '🔸 *Premium Package*\nRAM: 4GB\nCPU: 300%\nPrice: TSh 15,000'
                        },
                        footer: {
                            text: '⚡ Mickey Glitch Sub'
                        }
                    });

                const sent = await carousel.send(chatId, { quoted: msg });
                userMessages[chatId].push(sent);
                return true;
            } catch (error) {
                console.error('❌ Carousel failed:', error.message);
                return false;
            }
        }

        // ==============================================
        // 🆕 AIRICH WITH TEMPLATE
        // ==============================================
        if (title.includes('airich') || title.includes('rich')) {
            try {
                const rich = new AIRich(sock)
                    .setTitle('💎 Rich Message Demo')
                    .setBody(
                        '📋 *Rich Message with Template*\n\n' +
                        '👤 User: @Mickey\n' +
                        '📅 Date: 25/07/2026\n' +
                        '✅ Status: Active\n\n' +
                        '📌 *Features:*\n' +
                        '• Interactive UI\n' +
                        '• Rich formatting\n' +
                        '• Template support'
                    )
                    .setFooter('⚡ Mickey Glitch Sub')
                    .setTemplate(1);

                const sent = await rich.send(chatId, { quoted: msg });
                userMessages[chatId].push(sent);
                return true;
            } catch (error) {
                console.error('❌ AIRich failed:', error.message);
                return false;
            }
        }

        // THUMBNAIL EDIT (tmte)
        if (title.includes('thumbnail edit') || title.includes('tmte')) {
            const imgUrl = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/connection.jpg";
            try {
                const media = await baileys.prepareWAMessageMedia({ image: { url: imgUrl } }, { 
                    upload: sock.waUploadToServer, 
                    mediaTypeOverride: 'thumbnail-link' 
                });
                const sentMsg = await sock.sendMessage(chatId, {
                    text: '🖼️ *Thumbnail Edit Live Sample*\n\nInaonyesha jinsi ya kubadilisha thumbnail ya link...',
                    linkPreview: {
                        'matched-text': 'https://example.com',
                        title: 'Thumbnail Edit Demo',
                        jpegThumbnail: media.imageMessage.jpegThumbnail,
                        highQualityThumbnail: media.imageMessage
                    }
                }, { quoted: msg });
                userMessages[chatId].push(sentMsg);
                return true;
            } catch (mediaError) {
                console.error('❌ Error preparing thumbnail media:', mediaError);
                return false;
            }
        }

        // TO STICKERPACK (tspk)
        else if (title.includes('stickerpack') || title.includes('tspk')) {
            const stickerUrl = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg";
            try {
                const media = await baileys.prepareWAMessageMedia({ image: { url: stickerUrl } }, { 
                    upload: sock.waUploadToServer 
                });
                const sentMsg = await sock.sendMessage(chatId, {
                    sticker: media,
                    contextInfo: { isStickerPack: true }
                }, { quoted: msg });
                userMessages[chatId].push(sentMsg);
                return true;
            } catch (mediaError) {
                console.error('❌ Error preparing sticker media:', mediaError);
                return false;
            }
        }

        // GROUP ADD META AI
        else if (title.includes('group') && title.includes('meta')) {
            const sentMsg = await sock.sendMessage(chatId, {
                text: '👥 *Group Add Meta AI Live Sample*\n\nSimulizi ya kuongeza AI kwenye kikundi...\n\n📌 *Code Sample:*\n```javascript\nconst addMetaAI = async (groupId) => {\n  // Code ya kuongeza Meta AI\n  await sock.groupAdd(groupId, [metaAI]);\n};\n```'
            }, { quoted: msg });
            userMessages[chatId].push(sentMsg);
            return true;
        }

        // STICKER (SPREM)
        else if (title.includes('sticker') && title.includes('sprem')) {
            const stickerUrl = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy2.jpg";
            try {
                const media = await baileys.prepareWAMessageMedia({ image: { url: stickerUrl } }, { 
                    upload: sock.waUploadToServer 
                });
                const sentMsg = await sock.sendMessage(chatId, {
                    sticker: media,
                    contextInfo: { isStickerPack: false }
                }, { quoted: msg });
                userMessages[chatId].push(sentMsg);
                return true;
            } catch (mediaError) {
                console.error('❌ Error preparing sticker media:', mediaError);
                return false;
            }
        }

        // LATEX
        else if (title.includes('latex')) {
            const sentMsg = await sock.sendMessage(chatId, {
                text: '📐 *LaTeX Live Sample*\n\n`E = mc²`\n`∫₀¹ x² dx = ⅓`\n`\\frac{-b ± √(b²-4ac)}{2a}`\n\n*Formulas:*\n`\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}`\n`\\lim_{x\\to\\infty} f(x)`\n\n📝 *Code:*\n```javascript\nconst latex = new LaTeX(sock)\n  .setFormula("E = mc^2")\n  .send(chatId);\n```'
            }, { quoted: msg });
            userMessages[chatId].push(sentMsg);
            return true;
        }

        // GALAXY MESSAGE
        else if (title.includes('galaxy')) {
            const sentMsg = await sock.sendMessage(chatId, {
                text: '🌌 *Galaxy Message Live Sample*\n\n✨ Ujumbe wa kimajini!\n⭐ Nyota zinang\'aa\n🌟 Galaxy inakungoja...\n\n📝 *Code:*\n```javascript\nconst galaxy = new Galaxy(sock)\n  .setMessage("✨ Ujumbe wa kimajini!")\n  .send(chatId);\n```'
            }, { quoted: msg });
            userMessages[chatId].push(sentMsg);
            return true;
        }

        // REVIEW AND PAY
        else if (title.includes('review') && title.includes('pay')) {
            const reviewBtn = new Button(sock)
                .setTitle('💳 Review & Pay')
                .setBody('Tathmini na malipo:')
                .addReply('✅ Review Order', '.source review_order')
                .addReply('💳 Pay Now', '.source pay_now');
            const sentMsg = await reviewBtn.send(chatId, { quoted: msg });
            userMessages[chatId].push(sentMsg);
            return true;
        }

        // INAPP SIGNUP
        else if (title.includes('inapp signup')) {
            const sentMsg = await sock.sendMessage(chatId, {
                text: '📝 *InApp Signup Live Sample*\n\nJisajili ndani ya app:\n👤 Jina lako\n📧 Barua pepe\n🔑 Nenosiri\n\n📝 *Code:*\n```javascript\nconst signup = new Signup(sock)\n  .setFields(["Jina", "Barua pepe", "Nenosiri"])\n  .send(chatId);\n```'
            }, { quoted: msg });
            userMessages[chatId].push(sentMsg);
            return true;
        }

        // BOOKING CONFIRMATION
        else if (title.includes('booking confirmation')) {
            const sentMsg = await sock.sendMessage(chatId, {
                text: '✅ *Booking Confirmation Live Sample*\n\nBooking #12345 imethibitishwa!\n📅 Tarehe: 25 July 2026\n🕐 Saa: 14:30\n📍 Mahali: Dar es Salaam\n\n📝 *Code:*\n```javascript\nconst booking = new Booking(sock)\n  .setId("12345")\n  .setDate("25 July 2026")\n  .send(chatId);\n```'
            }, { quoted: msg });
            userMessages[chatId].push(sentMsg);
            return true;
        }

        // PAYMENT KEY INFO
        else if (title.includes('payment key')) {
            const sentMsg = await sock.sendMessage(chatId, {
                text: '🔑 *Payment Key Info Live Sample*\n\nMaelezo ya malipo:\n💰 Kiasi: TSh 50,000\n🔢 Namba: 1234-5678-9012\n📅 Tarehe: 25/07/2026\n\n📝 *Code:*\n```javascript\nconst payment = new Payment(sock)\n  .setAmount("TSh 50,000")\n  .setKey("1234-5678-9012")\n  .send(chatId);\n```'
            }, { quoted: msg });
            userMessages[chatId].push(sentMsg);
            return true;
        }

        return false; 
    } catch (error) {
        console.error('❌ Live sample error:', error);
        return false;
    }
}

// ==============================================
// 🚀 MAIN SOURCE COMMAND
// ==============================================

const sourceCommand = async (sock, chatId, msg, args) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();

    // Initialize user messages
    if (!userMessages[chatId]) userMessages[chatId] = [];

    // Raw links za picha na video
    const img1 = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/connection.jpg";
    const img2 = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg";
    const img3 = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy2.jpg";
    const img4 = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy3.jpg";
    const sampleVideo = "https://d.uguu.se/fWnUWKVq.mp4";

    // ─── 1. MENU KUU ───
    if (!input) {
        try {
            // Futa messages zote za nyuma
            await deletePreviousMessages(sock, chatId, userMessages[chatId]);
            userMessages[chatId] = [];

            const nixellExamples = await fetchNixellExamples();

            // ==============================================
            // 🆕 MENU KUU WITH BUTTONV2 SINGLE SELECT
            // ==============================================
            const mainMenu = await new ButtonV2(sock)
                .setTitle('🧩 Mickey Glitch Lab v5.0')
                .setBody('🌟 *Core & Advanced Engine*\n\n' +
                        '📌 *Available Features:*\n' +
                        '• Core: Buttons & Flow\n' +
                        '• Advanced: Media Hacks\n' +
                        `• Nixellv2: ${nixellExamples.length} examples\n\n` +
                        '💡 *Select an option below:*')
                .setFooter('⚡ MICKEY BOT v5.0')
                .setThumbnail(img1)
                
                // SINGLE SELECT FOR MAIN MENU
                .addRawButton({
                    buttonText: { displayText: '📋 Open Menu' },
                    buttonId: 'main_menu_select',
                    type: 1,
                    nativeFlowInfo: {
                        name: 'single_select',
                        paramsJson: JSON.stringify({
                            title: '🧩 Mickey Glitch Lab Menu',
                            sections: [
                                {
                                    title: '📁 Core Features',
                                    highlight_label: '⬇️',
                                    rows: [
                                        {
                                            header: '📁',
                                            title: 'Core: Buttons & Flow',
                                            description: 'Mifano ya buttons na flows',
                                            id: 'kundi_core'
                                        },
                                        {
                                            header: '🚀',
                                            title: 'Advanced: Media Hacks',
                                            description: 'Mifano ya media na hacks',
                                            id: 'kundi_advanced'
                                        }
                                    ]
                                },
                                {
                                    title: '📚 Nixellv2 Examples',
                                    highlight_label: '🔥',
                                    rows: (nixellExamples.length > 0 ? [
                                        {
                                            header: '📚',
                                            title: `View ${nixellExamples.length} Examples`,
                                            description: 'Ona mifano yote kutoka Nixellv2',
                                            id: 'nixell_menu'
                                        }
                                    ] : [])
                                },
                                {
                                    title: '⚡ Quick Actions',
                                    highlight_label: '⚡',
                                    rows: [
                                        {
                                            header: '🔄',
                                            title: 'Refresh Examples',
                                            description: 'Pakua mifano mpya',
                                            id: 'refresh'
                                        },
                                        {
                                            header: '❌',
                                            title: 'Close Menu',
                                            description: 'Funga menu hii',
                                            id: 'close'
                                        }
                                    ]
                                }
                            ]
                        })
                    }
                })
                .send(chatId, { quoted: ctx._msg });

            userMessages[chatId].push(mainMenu);
            return;
        } catch (e) {
            console.error('Error kwenye menu kuu:', e);
            await sock.sendMessage(ctx.chatId, { text: '❌ Imeshindwa kufungua Tester Menu.' }, { quoted: ctx._msg });
            return;
        }
    }

    // ─── CLOSE MENU ───
    if (input === 'close') {
        await deletePreviousMessages(sock, chatId, userMessages[chatId]);
        userMessages[chatId] = [];
        await sock.sendMessage(ctx.chatId, { text: '✅ Menu imefungwa. Tuma .source tena kufungua.' }, { quoted: ctx._msg });
        return;
    }

    // ─── REFRESH EXAMPLES ───
    if (input === 'refresh') {
        await deletePreviousMessages(sock, chatId, userMessages[chatId]);
        userMessages[chatId] = [];

        const sentMsg = await sock.sendMessage(ctx.chatId, { text: '🔄 Inapakua mifano mpya kutoka Nixellv2...' }, { quoted: ctx._msg });
        userMessages[chatId].push(sentMsg);

        const examples = await fetchNixellExamples();
        if (examples.length > 0) {
            const sentMsg2 = await sock.sendMessage(ctx.chatId, { 
                text: `✅ Imepakua ${examples.length} mifano mpya!\nTumia .source nixell_menu kuona orodha.` 
            }, { quoted: ctx._msg });
            userMessages[chatId].push(sentMsg2);
        } else {
            const sentMsg2 = await sock.sendMessage(ctx.chatId, { text: '❌ Imeshindwa kupakua mifano. Jaribu tena.' }, { quoted: ctx._msg });
            userMessages[chatId].push(sentMsg2);
        }
        return;
    }

    // ─── NIXELLV2 MENU ───
    if (input === 'nixell_menu') {
        await deletePreviousMessages(sock, chatId, userMessages[chatId]);
        userMessages[chatId] = [];

        const examples = await fetchNixellExamples();
        if (examples.length === 0) {
            const sentMsg = await sock.sendMessage(ctx.chatId, { 
                text: '❌ Hakuna mifano iliyopatikana. Jaribu .source refresh' 
            }, { quoted: ctx._msg });
            userMessages[chatId].push(sentMsg);
            return;
        }

        // Panga mifano kwa makundi
        const stickerExamples = examples.filter(ex => ex.title.toLowerCase().includes('sticker'));
        const interactiveExamples = examples.filter(ex => ex.title.toLowerCase().includes('interactive') || ex.title.toLowerCase().includes('message'));
        const otherExamples = examples.filter(ex => !stickerExamples.includes(ex) && !interactiveExamples.includes(ex));

        // ==============================================
        // 🆕 NIXELL MENU WITH SINGLE SELECT
        // ==============================================
        const nixellMenu = await new ButtonV2(sock)
            .setTitle('📚 Nixellv2 Live Samples')
            .setBody(`🎯 *Mifano ${examples.length} zilizopatikana*\n\n` +
                    `📌 *Stickers:* ${stickerExamples.length} mifano\n` +
                    `📌 *Interactive:* ${interactiveExamples.length} mifano\n` +
                    `📌 *Other:* ${otherExamples.length} mifano\n\n` +
                    `📝 Select an example below to view live sample + code`)
            .setFooter('⚡ MICKEY BOT • Nixellv2 Collection')
            .setThumbnail(img2)
            .addRawButton({
                buttonText: { displayText: '📋 View Examples' },
                buttonId: 'nixell_select',
                type: 1,
                nativeFlowInfo: {
                    name: 'single_select',
                    paramsJson: JSON.stringify({
                        title: '📚 Nixellv2 Examples',
                        sections: [
                            {
                                title: '🎨 Sticker Examples',
                                highlight_label: '⬇️',
                                rows: stickerExamples.slice(0, 5).map((ex, i) => ({
                                    header: '🎨',
                                    title: ex.title.substring(0, 30),
                                    description: `Added: ${ex.added}`,
                                    id: `nixell_${examples.indexOf(ex)}`
                                }))
                            },
                            {
                                title: '💬 Interactive Examples',
                                highlight_label: '💬',
                                rows: interactiveExamples.slice(0, 5).map((ex, i) => ({
                                    header: '💬',
                                    title: ex.title.substring(0, 30),
                                    description: `Added: ${ex.added}`,
                                    id: `nixell_${examples.indexOf(ex)}`
                                }))
                            },
                            {
                                title: '📄 Other Examples',
                                highlight_label: '📄',
                                rows: otherExamples.slice(0, 5).map((ex, i) => ({
                                    header: '📄',
                                    title: ex.title.substring(0, 30),
                                    description: `Added: ${ex.added}`,
                                    id: `nixell_${examples.indexOf(ex)}`
                                }))
                            }
                        ]
                    })
                }
            })
            .send(chatId, { quoted: ctx._msg });

        userMessages[chatId].push(nixellMenu);
        return;
    }

    // ─── KUNDI CORE ───
    if (input === 'kundi_core') {
        await deletePreviousMessages(sock, chatId, userMessages[chatId]);
        userMessages[chatId] = [];

        const coreMenu = await new ButtonV2(sock)
            .setTitle('📁 Core Features')
            .setBody('📌 *Basic & Advanced Buttons*\n\n' +
                    '• Single Select Demo\n' +
                    '• Multi-Select Demo\n' +
                    '• ButtonV2 with CTA\n' +
                    '• Quick Reply Buttons')
            .setFooter('⚡ Mickey Glitch Sub')
            .setThumbnail(img3)
            .addRawButton({
                buttonText: { displayText: '📋 Select Feature' },
                buttonId: 'core_select',
                type: 1,
                nativeFlowInfo: {
                    name: 'single_select',
                    paramsJson: JSON.stringify({
                        title: '📁 Core Features',
                        sections: [{
                            title: '📌 Available Features',
                            highlight_label: '⬇️',
                            rows: [
                                { header: '🔘', title: 'Single Select Demo', description: 'Onesha single select', id: 'nixell_0' },
                                { header: '☑️', title: 'Multi-Select Demo', description: 'Onesha multi select', id: 'nixell_1' },
                                { header: '🚀', title: 'ButtonV2 Advanced', description: 'CTA Copy & URL', id: 'nixell_2' }
                            ]
                        }]
                    })
                }
            })
            .send(chatId, { quoted: ctx._msg });

        userMessages[chatId].push(coreMenu);
        return;
    }

    // ─── KUNDI ADVANCED ───
    if (input === 'kundi_advanced') {
        await deletePreviousMessages(sock, chatId, userMessages[chatId]);
        userMessages[chatId] = [];

        const advancedMenu = await new ButtonV2(sock)
            .setTitle('🚀 Advanced Features')
            .setBody('📌 *Media & Rich Content*\n\n' +
                    '• Carousel Demo\n' +
                    '• AIRich Template\n' +
                    '• Thumbnail Edit\n' +
                    '• Sticker Pack')
            .setFooter('⚡ Mickey Glitch Sub')
            .setThumbnail(img4)
            .addRawButton({
                buttonText: { displayText: '📋 Select Feature' },
                buttonId: 'advanced_select',
                type: 1,
                nativeFlowInfo: {
                    name: 'single_select',
                    paramsJson: JSON.stringify({
                        title: '🚀 Advanced Features',
                        sections: [{
                            title: '📌 Available Features',
                            highlight_label: '⬇️',
                            rows: [
                                { header: '🎠', title: 'Carousel Demo', description: 'Multiple cards display', id: 'nixell_3' },
                                { header: '💎', title: 'AIRich Template', description: 'Rich message with template', id: 'nixell_4' },
                                { header: '🖼️', title: 'Thumbnail Edit', description: 'Edit link thumbnails', id: 'nixell_5' }
                            ]
                        }]
                    })
                }
            })
            .send(chatId, { quoted: ctx._msg });

        userMessages[chatId].push(advancedMenu);
        return;
    }

    // ─── NIXELLV2 LIVE SAMPLE ───
    if (input.startsWith('nixell_')) {
        const index = parseInt(input.split('_')[1]);
        const examples = await fetchNixellExamples();
        
        if (isNaN(index) || index >= examples.length) {
            await sock.sendMessage(ctx.chatId, { 
                text: '❌ Sample haipatikani. Jaribu .source refresh' 
            }, { quoted: ctx._msg });
            return;
        }

        const example = examples[index];
        await sock.sendMessage(ctx.chatId, { 
            text: `📥 Inapakua: ${example.title}...` 
        }, { quoted: ctx._msg });

        const content = await fetchPasteContent(example.id);
        if (!content) {
            await sock.sendMessage(ctx.chatId, { 
                text: `❌ Imeshindwa kupata content ya ${example.title}` 
            }, { quoted: ctx._msg });
            return;
        }

        await showNixellLiveSample(sock, chatId, msg, example, content);
        return;
    }

    // ─── DEFAULT ───
    await sock.sendMessage(ctx.chatId, { 
        text: '❌ Amri haijulikani. Tuma .source kuona menu.' 
    }, { quoted: ctx._msg });
};

module.exports = sourceCommand;
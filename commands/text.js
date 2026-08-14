const fetch = global.fetch || require('node-fetch');
const { ButtonV2 } = require('../lib/messageBuilder');

/**
 * Mickey Glitch - Text Styling Command
 * Powered by Prexzy API
 */

async function fetchTextStyles(text) {
    const apiUrls = [
        `https://prexzyapis.com/tools/allstyles?text=${encodeURIComponent(text)}`,
        `https://apis.prexzyvilla.site/tools/allstyles?text=${encodeURIComponent(text)}`
    ];

    for (const apiUrl of apiUrls) {
        try {
            const response = await fetch(apiUrl);
            if (!response || !response.ok) continue;

            const data = await response.json();
            const styles = Array.isArray(data?.styles) ? data.styles : Array.isArray(data?.data?.styles) ? data.data.styles : [];

            if (data?.status && styles.length) {
                return { status: true, styles, source: apiUrl };
            }
        } catch (error) {
            continue;
        }
    }

    return { status: false, styles: [] };
}

async function textCommand(sock, chatId, m, body = '') {
    try {
        const messageText = m.message?.conversation || m.message?.extendedTextMessage?.text || body || '';
        const args = messageText.split(' ').slice(1).join(' ').trim();

        let selectedId = '';
        if (m.message?.interactiveResponseBody?.nativeFlowSearchResult?.selectedButtonId) {
            selectedId = m.message.interactiveResponseBody.nativeFlowSearchResult.selectedButtonId;
        }

        if (selectedId.startsWith('txtstyle_')) {
            const match = selectedId.match(/^txtstyle_(\d+)/);
            const index = match ? Number(match[1]) : NaN;
            if (Number.isNaN(index)) {
                return sock.sendMessage(chatId, { text: '❌ Style haikupatikana.' }, { quoted: m });
            }

            const originalText = (m.message?.conversation || m.message?.extendedTextMessage?.text || body || '').trim();
            const textForStyle = originalText.replace(/^\.(?:text|txt)\s*/i, '').trim();
            const styleData = await fetchTextStyles(textForStyle || args);

            if (!styleData.status) {
                return sock.sendMessage(chatId, { text: '❌ API imeshindwa kupakua staili.' }, { quoted: m });
            }

            const style = styleData.styles[index];
            if (!style) {
                return sock.sendMessage(chatId, { text: '❌ Style haikupatikana.' }, { quoted: m });
            }

            const styledText = style.styled_text || style.preview || style.plain_text || '';
            await sock.sendMessage(chatId, { react: { text: '✨', key: m.key } });

            const copyButton = new ButtonV2(sock)
                .setBody(`✨ *Muundo:* ${style.style_name || 'Style'}\n\n${styledText || 'No preview available'}`)
                .setFooter('𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑 𝚃𝚎𝚌𝚑')
                .setThumbnail('https://cdn.ornzora.eu.cc/4d2905ce-3707-4ec0-998a-68a3d851629f-FIORA.jpg')
                .addRawButton({
                    buttonText: { displayText: '📋 COPY STYLED TEXT' },
                    buttonId: 'copy_styled',
                    type: 1,
                    nativeFlowInfo: {
                        name: 'cta_copy',
                        paramsJson: JSON.stringify({
                            display_text: '📋 COPY STYLED TEXT',
                            id: 'copy_styled',
                            copy_code: styledText
                        })
                    }
                });

            return await copyButton.send(chatId, { quoted: m });
        }

        if (!args) {
            return sock.sendMessage(chatId, {
                text: '❌ *Tafadhali weka maandishi!*\n\nExample: `.text Mickey`'
            }, { quoted: m });
        }

        await sock.sendMessage(chatId, { react: { text: '🎨', key: m.key } });

        const result = await fetchTextStyles(args);
        if (!result.status || !Array.isArray(result.styles) || !result.styles.length) {
            throw new Error('API Error');
        }

        const styles = result.styles;
        const sections = [{
            title: '🎨 CHAGUA MUUNDO WA MAANDISHI',
            rows: styles.slice(0, 35).map((s, i) => ({
                header: `${i + 1}. ${s.style_name || 'Style'}`,
                title: s.preview || s.styled_text || s.plain_text || 'Preview',
                id: `txtstyle_${i}`
            }))
        }];

        const menuText = `🎨 *TEXT STYLER*\n\n` +
            `📝 *Maandishi:* ${args}\n` +
            `✨ *Jumla ya Miundo:* ${styles.length}\n\n` +
            `👇 Chagua muundo hapo chini ili uutumie:`;

        await new ButtonV2(sock)
            .setBody(menuText)
            .setFooter('𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑 𝚃𝚎𝚌𝚑')
            .setThumbnail('https://cdn.ornzora.eu.cc/4d2905ce-3707-4ec0-998a-68a3d851629f-FIORA.jpg')
            .addRawButton({
                buttonText: { displayText: '📋 FUNGUA ORODHA' },
                buttonId: 'text_styles_menu',
                type: 1,
                nativeFlowInfo: {
                    name: 'single_select',
                    paramsJson: JSON.stringify({
                        title: '📋 FUNGUA ORODHA',
                        sections: sections
                    })
                }
            })
            .send(chatId, { quoted: m });

    } catch (e) {
        console.error('Text Styler Error:', e);
        await sock.sendMessage(chatId, {
            text: '❌ *Hitilafu!* API imeshindwa kufanya kazi kwa sasa.'
        }, { quoted: m });
    }
}

module.exports = textCommand;
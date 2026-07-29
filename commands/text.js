const axios = require('axios');
const { ButtonV2 } = require('../lib/messageBuilder');

/**
 * Mickey Glitch - Text Styling Command
 * Powered by Prexzy Villa API
 */

async function textCommand(sock, chatId, m, body = '') {
    try {
        const messageText = m.message?.conversation || m.message?.extendedTextMessage?.text || body || '';
        const args = messageText.split(' ').slice(1).join(' ').trim();

        // Detect button response selection
        let selectedId = '';
        if (m.message?.interactiveResponseBody?.nativeFlowSearchResult?.selectedButtonId) {
            selectedId = m.message.interactiveResponseBody.nativeFlowSearchResult.selectedButtonId;
        }

        // 1. Handle Selection (Mtu akichagua style)
        if (selectedId.startsWith('txtstyle_')) {
            const [_, index, ...textParts] = selectedId.split('_');
            const originalText = textParts.join('_');
            
            await sock.sendMessage(chatId, { react: { text: '✨', key: m.key } });
            
            const res = await axios.get(`https://prexzyapis.com/tools/allstyles?text=${encodeURIComponent(originalText)}`);
            const style = res.data.styles[parseInt(index)];

            if (!style) return sock.sendMessage(chatId, { text: '❌ Style haikupatikana.' });

            const copyButton = new ButtonV2(sock)
                .setBody(`✨ *Muundo:* ${style.style_name}\n\n${style.styled_text}`)
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
                            copy_code: style.styled_text
                        })
                    }
                });

            return await copyButton.send(chatId, { quoted: m });
        }

        // 2. Initial Command (Mtu akiandika .text Mickey)
        if (!args) {
            return sock.sendMessage(chatId, { 
                text: '❌ *Tafadhali weka maandishi!*\n\nExample: `.text Mickey`' 
            }, { quoted: m });
        }

        await sock.sendMessage(chatId, { react: { text: '🎨', key: m.key } });

        const apiUrl = `https://apis.prexzyvilla.site/tools/allstyles?text=${encodeURIComponent(args)}`;
        const response = await axios.get(apiUrl);

        if (!response.data?.status || !response.data?.styles) {
            throw new Error('API Error');
        }

        const styles = response.data.styles;
        
        // Jenga orodha ya staili
        const sections = [{
            title: '🎨 CHAGUA MUUNDO WA MAANDISHI',
            rows: styles.slice(0, 35).map((s, i) => ({
                header: `${i + 1}. ${s.style_name}`,
                title: s.preview,
                id: `txtstyle_${i}_${args}` 
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
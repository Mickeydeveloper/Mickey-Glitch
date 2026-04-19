
const { sendInteractiveMessage } = require('gifted-btns');
const settings = require('../settings');
const axios = require('axios');

async function ownerCommand(sock, chatId, message) {
    try {
        const ownerNum = settings.ownerNumber || '255612130873';
        const waUrl = `https://wa.me/${ownerNum}`;
        const chnlUrl = 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610';
        const imgUrl = 'https://d.uguu.se/LLjViSGg.jpg';

        // Maelezo ya mmiliki (Owner info details)
        const captionTxt = `👤 *TAARIFA ZA MMILIKI (OWNER INFO)*\n\n` +
                           `🤖 *Jina la Bot (Bot Name):* ${settings.botName || 'MICKEY GLITCH'}\n` +
                           `👨‍💻 *Mkurugenzi (Owner):* ${settings.botOwner || 'Mickey'}\n` +
                           `📞 *Namba (Contact):* +${ownerNum}\n\n` +
                           `Chagua huduma hapa (Choose an action below) 👇`;

        // Jaribu kutuma picha (Try sending image)
        try {
            const res = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 10000 });
            await sock.sendMessage(chatId, {
                image: Buffer.from(res.data),
                caption: captionTxt
            }, { quoted: message });
        } catch (imgErr) {
            console.error('Picha imegoma (Image error):', imgErr.message);
            await sock.sendMessage(chatId, { text: captionTxt }, { quoted: message });
        }

        // Setup ya buttons (Interactive buttons setup)
        const btnOptions = {
            text: captionTxt,
            footer: "© Mickey Infor Technology • Dev by Mickey",
            interactiveButtons: [
                { 
                    name: 'cta_call', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📞 Piga Simu (Call)', 
                        phone_number: ownerNum 
                    }) 
                },
                { 
                    name: 'cta_url', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '💬 Nitumie Msg (Message)', 
                        url: waUrl 
                    }) 
                },
                { 
                    name: 'cta_url', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📺 Jiunge Channel (Join)', 
                        url: chnlUrl 
                    }) 
                }
            ]
        };

        await sendInteractiveMessage(sock, chatId, btnOptions, { quoted: message });

    } catch (err) {
        console.error('Owner Cmd Err:', err);
        await sock.sendMessage(chatId, { 
            text: '❌ *Kuna tatizo limetokea! (An error occurred)*' 
        }, { quoted: message });
    }
}

module.exports = ownerCommand;

const { sendInteractiveMessage } = require('gifted-btns');
const settings = require('../settings');
const axios = require('axios');

async function ownerCommand(sock, chatId, message) {
    try {
        const ownerNum = settings.ownerNumber || '255612130873';
        const waUrl = `https://wa.me/${ownerNum}`;
        const chnlUrl = 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610';
        const imgUrl = 'https://d.uguu.se/LLjViSGg.jpg';

        // Maelezo ya mmiliki (Professional details)
        const ownerTxt = `👑 *OWNER INFO (TAARIFA ZA MMILIKI)*\n\n` +
                         `🤖 *Bot:* ${settings.botName || 'MICKEY GLITCH'}\n` +
                         `👨‍💻 *Owner:* ${settings.botOwner || 'Mickey'}\n` +
                         `📞 *Contact:* +${ownerNum}\n\n` +
                         `Choose an action below (Chagua huduma) 👇`;

        // Pata picha kwanza (Fetch image buffer)
        let imgBuffer;
        try {
            const res = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 10000 });
            imgBuffer = Buffer.from(res.data);
        } catch (e) {
            console.error('Picha error:', e.message);
            imgBuffer = null; // Kama picha imegoma, itatuma text pekee
        }

        // Tuma ujumbe mmoja tu wenye kila kitu (Single interactive message)
        const msgOptions = {
            text: ownerTxt,
            footer: "© Mickey Infor Tech • Powered by Mickey",
            // Ikiwa picha ipo, iwekwe hapa (Add image if available)
            ...(imgBuffer && { image: imgBuffer }),
            interactiveButtons: [
                { 
                    name: 'cta_call', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📞 Call Owner', 
                        phone_number: ownerNum 
                    }) 
                },
                { 
                    name: 'cta_url', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '💬 Send Message', 
                        url: waUrl 
                    }) 
                },
                { 
                    name: 'cta_url', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📺 Join Channel', 
                        url: chnlUrl 
                    }) 
                }
            ]
        };

        await sendInteractiveMessage(sock, chatId, msgOptions, { quoted: message });

    } catch (e) {
        console.error('Owner Cmd Error:', e);
        await sock.sendMessage(chatId, { 
            text: '❌ *Hitilafu imetokea! (An error occurred)*' 
        }, { quoted: message });
    }
}

module.exports = ownerCommand;

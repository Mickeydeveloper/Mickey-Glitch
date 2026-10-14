const { AIRich } = require('../lib/messageBuilder');

module.exports = async function button5Command(sock, chatId, msg) {
    try {
        await new AIRich(sock)
            .addCompact({
                title: 'Kucingpoi',
                subtitle: 'Aplikasi haram bos',
                secondary_subtitle: 'size: 1TB',
                image: 'https://i.ibb.co/c46zR31/1789273857381-upload.jpg',
                entity_id: 4059687234,
                entity_url: 'https://nekopoi.care',
                entity_type: 1,
                action_type: 3,
                is_verified: false
            })
            .send(chatId, { quoted: msg });
    } catch (error) {
        console.error('[button5] compact entity failed:', error?.message || error);
        await sock.sendMessage(chatId, {
            text: 'Imeshindikana kutuma compact entity.'
        }, { quoted: msg });
    }
};

module.exports.name = 'button5';
module.exports.description = 'Send an AI Rich compact entity';
module.exports.category = 'TOOLS';
module.exports.aliases = [];

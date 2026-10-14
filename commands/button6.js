const { AIRich } = require('../lib/messageBuilder');

module.exports = async function button6Command(sock, chatId, msg) {
    try {
        await new AIRich(sock)
            .addCompact({
                title: 'Debug',
                subtitle: '2 anggota',
                secondary_subtitle: 'Grup aktif',
                image: 'https://i.ibb.co/0Vffk2FS/1789267255732-upload.jpg',
                entity_id: 1029384756,
                entity_url: 'https://chat.whatsapp.com/KaGYtFWTMhl8TvkDP7u1Nt?s=cl&p=a&mlu=4&ilr=4',
                entity_type: 2,
                action_type: 2,
                is_verified: false
            })
            .send(chatId, { quoted: msg });
    } catch (error) {
        console.error('[button6] compact entity failed:', error?.message || error);
        await sock.sendMessage(chatId, {
            text: 'Imeshindikana kutuma compact entity.'
        }, { quoted: msg });
    }
};

module.exports.name = 'button6';
module.exports.description = 'Send an AI Rich group compact entity';
module.exports.category = 'TOOLS';
module.exports.aliases = [];

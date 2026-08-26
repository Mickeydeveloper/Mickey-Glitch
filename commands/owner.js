const isOwnerOrSudo = require('../lib/isOwner');
const { AIRich } = require('../lib/messageBuilder');
const OWNER_POST = {
    profile: 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/menu.png',
    username: '𝕄𝕚𝕔𝕜𝕖𝕪',
    title: 'Demo Post',
    subtitle: 'RIN MD',
    caption: 'hii~ im Mickey from Tanzania thanks to use my bot.',
    verified: true,
    url: 'https://fiora.nixel.my.id/',
    thumbnail: 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy3.jpg',
    source: 'INSTAGRAM',
    footer: 'Fiora Sylvie',
    deeplink: 'https://fiora.nixel.my.id/',
    icon: 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy2.jpg'
};

const sendOwnerRichResponse = async (sock, chatId, msg) => {
    const ownerRich = new AIRich(sock)
        .setTitle('𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚔𝚒𝚝𝚌𝚑 𝙾𝚠𝚗𝚎𝚛 𝙸𝚗𝚏𝚘')
        .setSubtitle('Mickdady~')
        .addFOAText('# Hello my name is~')
        .addPost(Array.from({ length: 5 }, () => ({ ...OWNER_POST })))
        .addText('Owner commands: .menu  .profile  .repo  .ping  .alive  .stats')
        .addFooterAction([
            { text: 'WhatsApp Group', type: 'OPEN_URL', url: 'https://chat.whatsapp.com/HJnXkPtpY2lDVi1rZilcNe' },
            { text: 'WhatsApp Channel', type: 'OPEN_URL', url: 'https://whatsapp.com/channel/0029vb6b9xfcxoaseug1g610' }
        ]);

    await ownerRich.send(chatId, { quoted: msg });
};

const ownerCommand = async (sock, chatId, msg, args = [], options = {}) => {
    try {
        const targetChatId = chatId || msg?.key?.remoteJid || options.chatId;
        const senderId = options.senderId || msg?.key?.participant || msg?.key?.remoteJid || '';

        if (senderId) {
            try {
                const isAllowed = await isOwnerOrSudo(senderId, sock, targetChatId);
                if (!isAllowed) {
                    await sock?.sendMessage?.(targetChatId, {
                        text: '⚠️ Only the owner or sudo user can use this feature.'
                    }, { quoted: msg });
                    return true;
                }
            } catch (error) {
                console.error('[owner] permission check failed:', error?.message || error);
            }
        }

        if (typeof sock?.relayMessage === 'function') {
            await sendOwnerRichResponse(sock, targetChatId, msg);
            return true;
        }

        if (typeof sock?.sendMessage === 'function') {
            await sock.sendMessage(targetChatId, {
                text: '👑 Owner feature loaded.'
            }, { quoted: msg });
        }

        return true;
    } catch (error) {
        console.error('[owner] error:', error?.message || error);
        try {
            await sock?.sendMessage?.(chatId || msg?.key?.remoteJid, {
                text: `❌ ${error?.message || 'Owner command failed.'}`
            }, { quoted: msg });
        } catch (sendErr) {}
        return false;
    }
};

ownerCommand.name = 'owner';
ownerCommand.description = 'Show the owner rich-response feature menu';
ownerCommand.category = 'OWNER/ADMIN';
ownerCommand.aliases = ['ownercmd'];

module.exports = ownerCommand;

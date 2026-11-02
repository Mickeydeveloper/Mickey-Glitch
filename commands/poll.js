const crypto = require('crypto');
const {
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    proto
} = require('@whiskeysockets/baileys');

const DEFAULT_POLL_IMAGES = [
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg',
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy3.jpg'
];

const getPollInput = (match, message) => {
    if (Array.isArray(match)) return match.join(' ').trim();
    if (typeof match === 'string' && match.trim()) return match.trim();

    const body = message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.imageMessage?.caption || '';
    return body.replace(/^[.!/][^\s]+\s*/, '').trim();
};

async function pollCommand(conn, jid, message, match) {
    const input = getPollInput(match, message);
    const parts = input.split('|').map(part => part.trim());
    const question = parts.shift();
    const useDefaultImages = parts.length === 2;

    if (!question || (!useDefaultImages && (parts.length < 4 || parts.length % 2 !== 0))) {
        await conn.sendMessage(jid, {
            text: 'Matumizi: .poll Swali | Option A | Option B (default images)\nAu: .poll Swali | Option A | URL ya picha A | Option B | URL ya picha B'
        }, { quoted: message });
        return;
    }

    const options = [];
    const optionCount = useDefaultImages ? parts.length : parts.length / 2;
    for (let index = 0; index < optionCount; index++) {
        const name = useDefaultImages ? parts[index] : parts[index * 2];
        const imageUrl = useDefaultImages ? DEFAULT_POLL_IMAGES[index] : parts[index * 2 + 1];
        let parsedUrl;

        try {
            parsedUrl = new URL(imageUrl);
        } catch {
            parsedUrl = null;
        }

        if (!name || !parsedUrl || !['http:', 'https:'].includes(parsedUrl.protocol)) {
            await conn.sendMessage(jid, {
                text: `Jina au URL ya picha si sahihi kwenye option ${options.length + 1}. Tumia URL inayoanza na https:// au http://.`
            }, { quoted: message });
            return;
        }

        options.push({ name, image: { url: parsedUrl.toString() } });
    }

    const uniqueNames = new Set(options.map(option => option.name.toLowerCase()));
    if (uniqueNames.size !== options.length) {
        await conn.sendMessage(jid, {
            text: 'Majina ya options lazima yawe tofauti.'
        }, { quoted: message });
        return;
    }

    try {
        const messageSecret = crypto.randomBytes(32);
        const hashOption = (name, sha) => crypto
            .createHash('sha256')
            .update(
                crypto.createHash('sha256').update(String(name)).digest('hex') +
                Buffer.from(sha).toString('base64')
            )
            .digest('hex');

        const images = await Promise.all(options.map(async (item, index) => {
            const { imageMessage } = await prepareWAMessageMedia(
                { image: item.image },
                { upload: conn.waUploadToServer }
            );

            if (!imageMessage?.fileSha256) {
                throw new Error(`Image upload failed at option ${index + 1}`);
            }

            return {
                name: item.name,
                imageMessage,
                optionHash: hashOption(item.name, imageMessage.fileSha256)
            };
        }));

        const parent = await generateWAMessageFromContent(jid, {
            pollCreationMessageV3: {
                name: question,
                selectableOptionsCount: 1,
                options: images.map(({ name, optionHash }) => ({
                    optionName: name,
                    optionHash
                })),
                pollContentType: proto.Message.PollContentType.IMAGE
            },
            messageContextInfo: { messageSecret }
        }, {});

        await conn.relayMessage(jid, parent.message, {
            messageId: parent.key.id,
            additionalNodes: [{
                tag: 'meta',
                attrs: { polltype: 'creation', contenttype: 'image' }
            }]
        });

        for (const { imageMessage } of images) {
            const child = proto.Message.create({
                messageContextInfo: {
                    messageAssociation: {
                        parentMessageKey: parent.key,
                        associationType: proto.MessageAssociation.AssociationType.MEDIA_POLL
                    }
                },
                pollCreationOptionImageMessage: {
                    message: { imageMessage }
                }
            });

            await conn.relayMessage(jid, child, {
                messageId: crypto.randomUUID(),
                additionalNodes: [{
                    tag: 'meta',
                    attrs: { message_association_type: 'media_poll' }
                }]
            });
        }
    } catch (error) {
        console.error('[poll]', error?.message || error);
        await conn.sendMessage(jid, {
            text: 'Poll ya picha imeshindwa kutumwa. Hakikisha URL za picha zinafanya kazi na jaribu tena.'
        }, { quoted: message }).catch(() => {});
    }
}

pollCommand.commandName = 'poll';
pollCommand.description = 'Tengeneza poll ya kupigia kura picha.';
pollCommand.category = 'FUN';

module.exports = pollCommand;
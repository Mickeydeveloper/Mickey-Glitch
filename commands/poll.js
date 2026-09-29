const crypto = require('crypto');
const {
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    proto
} = require('@whiskeysockets/baileys');

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

    if (!question || parts.length < 4 || parts.length % 2 !== 0) {
        await conn.sendMessage(jid, {
            text: 'Matumizi: .poll Swali | Jina la picha 1 | URL ya picha 1 | Jina la picha 2 | URL ya picha 2\nMfano: .poll Chagua picha | Picha A | https://example.com/a.jpg | Picha B | https://example.com/b.jpg'
        }, { quoted: message });
        return;
    }

    const options = [];
    for (let index = 0; index < parts.length; index += 2) {
        const name = parts[index];
        const imageUrl = parts[index + 1];
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
const { AIRich, createCtx } = require('../lib/messageBuilder');

function getQuotedMessage(message) {
    const content = message?.message || {};
    const contextInfo = content.extendedTextMessage?.contextInfo ||
        content.imageMessage?.contextInfo ||
        content.videoMessage?.contextInfo ||
        content.documentMessage?.contextInfo ||
        content.stickerMessage?.contextInfo || {};

    return contextInfo.quotedMessage ? {
        message: contextInfo.quotedMessage,
        id: contextInfo.stanzaId || 'unknown',
        sender: contextInfo.participant || message?.key?.participant || message?.key?.remoteJid || 'unknown',
    } : null;
}

function getMessageType(message) {
    return Object.keys(message || {})
        .filter((key) => !['messageContextInfo', 'senderKeyDistributionMessage'].includes(key))[0] || 'unknown';
}

function getChildrenCount(message) {
    if (!message || typeof message !== 'object') return 0;
    return Object.values(message).reduce((total, value) => {
        if (Array.isArray(value)) return total + value.length;
        if (value && typeof value === 'object') return total + Object.keys(value).length;
        return total;
    }, 0);
}

function buildRelaySnippet(quoted) {
    const type = getMessageType(quoted.message);
    const compactMessage = JSON.stringify(quoted.message, null, 2)
        .replace(/https?:\/\/[^\s"]+/g, '"<whatsapp-media-url>"');

    return `const quoted = ${compactMessage};\n\nawait conn.relayMessage(\n  chatId,\n  quoted,\n  {}\n);`;
}

async function relayCommand(sock, chatId, message, args = []) {
    const ctx = createCtx(sock, chatId, message, { args });
    const quoted = getQuotedMessage(message);

    if (!quoted) {
        return ctx.reply(
            '📌 *Relay Snippet*\n\n' +
            'Reply to a message, then use `.relay` to generate its AIRich relay snippet.'
        );
    }

    const type = getMessageType(quoted.message);
    const sender = quoted.sender.split('@')[0];
    const groupChat = chatId.endsWith('@g.us') ? chatId : 'Private chat';
    const snippet = buildRelaySnippet(quoted);

    try {
        await new AIRich(sock)
            .setTitle('MICKEY AI RELAY')
            .setBody('Generated relay snippet')
            .setFooter('Use responsibly and only with messages you are allowed to relay')
            .addText('# ⚡ Relay Snippet')
            .addMetadata(
                `• Type     : ${type}\n` +
                `• Source   : quoted message\n` +
                `• Chat     : ${groupChat}\n` +
                `• ID       : ${quoted.id}\n` +
                `• Sender   : ${sender}\n` +
                `• Children : ${getChildrenCount(quoted.message)}`
            )
            .addSuggest([type, groupChat, quoted.id])
            .addCode('javascript', snippet)
            .send(chatId, { quoted: message });
    } catch (error) {
        console.error('[RELAY COMMAND ERROR]', error.message);
        return ctx.reply(
            `⚡ *Relay Snippet*\n\n` +
            `Type: ${type}\n` +
            `ID: ${quoted.id}\n` +
            `Sender: ${sender}\n\n` +
            '```js\n' + snippet + '\n```'
        );
    }
}

relayCommand.name = 'relay';
relayCommand.description = 'Generate an AIRich relay snippet from a quoted message';
relayCommand.category = 'TOOLS';
relayCommand.aliases = ['relaysnip', 'snippet'];

module.exports = relayCommand;

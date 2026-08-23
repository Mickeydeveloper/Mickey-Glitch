const { AIRich, createCtx } = require('../lib/messageBuilder');

const ping2Command = async (sock, chatId, msg, args) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const rich = new AIRich(ctx.sock || ctx.core)
        .setTitle('MessageBuilderV4.7')
        .addText('Hey! Welcome to [MessageBuilderV4.7](https://gist.github.com/ValdazGT)')
        .setFooter('Built with MessageBuilderV4.7');

    const input = Array.isArray(args) ? args.map(String).join(' ').trim() : '';
    const imageUrl = 'https://cdn.ornzora.eu.cc/2a639cd2-5c33-49e3-982f-77f471c9313f-FIORA.jpg';
    const videoUrl = 'https://cdn.ornzora.eu.cc/fb5dd5c3-c3f7-481a-aedb-d4938720e8bd-FIORA.mp4';

    rich.addText('This message is built with the AIRich chainable builder.');
    rich.addSuggest(['MessageBuilderV4.7', 'Dynamic AIRich', 'NIXCODE']);
    rich.addText('Here is a live image section.');
    rich.addImage(imageUrl);
    rich.addText('Video, code, and tables are supported too.');
    rich.addVideo(videoUrl, { autoFill: false });
    rich.addCode('javascript', `function greet(name) {
    return \`Hello, \${name}!\`;
}

greet('Nixel');`);
    rich.addTable([
        ['Name', 'Role'],
        ['[Nixel](https://nixel.dev/)', 'Developer'],
        ['Fiora Sylvie', 'Assistant'],
    ]);
    rich.addProduct({
        title: 'NIXCODE',
        brand: 'Nixel',
        price: 'Free',
        product_url: 'https://gist.github.com/ValdazGT',
        image_url: imageUrl,
    });
    rich.addPost({
        profile: imageUrl,
        title: 'Behind the build',
        username: 'nixel.dev',
        verified: true,
        caption: 'Built with MessageBuilder and AIRich.',
        thumbnail: imageUrl,
        url: 'https://nixel.dev/',
        source_app: 'INSTAGRAM',
    });
    rich.addReels({
        profile: imageUrl,
        username: 'nixel.dev',
        thumbnail: imageUrl,
        url: 'https://nixel.dev/',
        verified: true,
    });
    rich.addTip(input || 'Create, compose, and send rich content with AIRich.');
    rich.addSource([[imageUrl, 'https://gist.github.com/ValdazGT', 'MessageBuilderV4.7']]);

    try {
        await rich.send(ctx.chatId, { quoted: ctx.msg });
    } catch (error) {
        console.error('ping2Command error:', error?.message || error);
        await ctx.reply('Unable to send the MessageBuilder demo. Please try again.');
    }
};

module.exports = ping2Command;

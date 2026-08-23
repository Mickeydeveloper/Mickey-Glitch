const { AIRich, createCtx } = require('../lib/messageBuilder');

const ping2Command = async (sock, chatId, msg, args) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const rich = new AIRich(ctx.sock || ctx.core)
        .setTitle('Mickeyglitch')
        .addText('Hey! Welcome to [MickeyGlitch](https://mickey-pterodacty.vercel.app/)')
        .setFooter('Built with Mickeyglitch');

    const input = Array.isArray(args) ? args.map(String).join(' ').trim() : '';
    const imageUrl = 'https://cdn.ornzora.eu.cc/2a639cd2-5c33-49e3-982f-77f471c9313f-FIORA.jpg';
    const videoUrl = 'https://cdn.ornzora.eu.cc/fb5dd5c3-c3f7-481a-aedb-d4938720e8bd-FIORA.mp4';

    rich.addText('This message is built with the AIRich chainable builder.');
    rich.addSuggest(['MickeyGlitch', 'Dynamic AIRich', 'NIXCODE']);
    rich.addText('Here is a live image section.');
    rich.addImage(imageUrl);
    rich.addText('Video, code, and tables are supported too.');
    rich.addVideo(videoUrl, { autoFill: false });
    rich.addCode('javascript', `function greet(name) {
    return \`Hello, \${name}!\`;
}

greet('Mickey');`);
    rich.addTable([
        ['Name', 'Role'],
        ['[Mickey](https://nixel.dev/)', 'Developer'],
        ['Quantum', 'Team'],
    ]);
    rich.addProduct({
        title: 'MICKEY',
        brand: 'glitch',
        price: 'Free',
        product_url: 'https://github.com/Mickeydeveloper',
        image_url: imageUrl,
    });
    rich.addPost({
        profile: imageUrl,
        title: 'Behind the build',
        username: 'Mickey',
        verified: true,
        caption: 'Built with MessageBuilder and AIRich.',
        thumbnail: imageUrl,
        url: 'https://nixel.dev/',
        source_app: 'INSTAGRAM',
    });
    rich.addReels({
        profile: imageUrl,
        username: 'Mickey',
        thumbnail: imageUrl,
        url: 'https://nixel.dev/',
        verified: true,
    });
    rich.addTip(input || 'Create, compose, and send rich content with AIRich.');
    rich.addSource([[imageUrl, 'https://mickey-pterodacty.vercel.app', 'MessageBuilderV4.7']]);

    try {
        await rich.send(ctx.chatId, { quoted: ctx.msg });
    } catch (error) {
        console.error('ping2Command error:', error?.message || error);
        await ctx.reply('Unable to send the MessageBuilder demo. Please try again.');
    }
};

module.exports = ping2Command;

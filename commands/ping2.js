const { AIRich, createCtx } = require('../lib/messageBuilder');

const ping2Command = async (sock, chatId, msg, args) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const rich = new AIRich(ctx.sock || ctx.core)
        .setTitle('⚡ MICKEYGLITCH BOT ⚡')
        .addText('Habari! Karibu kwenye [MickeyGlitch](https://mickey-pterodacty.vercel.app/)')
        .setFooter('Imetengenezwa na MickeyGlitch Team');

    const input = Array.isArray(args) ? args.map(String).join(' ').trim() : '';
    const imageUrl = 'https://cdn.ornzora.eu.cc/2a639cd2-5c33-49e3-982f-77f471c9313f-FIORA.jpg';
    const videoUrl = 'https://cdn.ornzora.eu.cc/fb5dd5c3-c3f7-481a-aedb-d4938720e8bd-FIORA.mp4';

    rich.addText('Ujumbe huu umeundwa kwa teknolojia ya kisasa ya **AIRich Builder**.');
    rich.addSuggest(['MickeyGlitch', 'Dynamic AIRich', 'NIXCODE']);
    
    rich.addText('📸 **Sehemu ya Picha (Live Image):**');
    rich.addImage(imageUrl);
    
    rich.addText('🎥 **Msaada wa Video, Code na Tables:**');
    rich.addVideo(videoUrl, { autoFill: false });
    
    rich.addCode('javascript', `function greet(name) {
    return \`Karibu, \${name}!\`;
}

greet('Mickey');`);

    rich.addTable([
        ['Jina', 'Wadhifa'],
        ['[Mickey](https://nixel.dev/)', 'Mwendelezaji (Developer)'],
        ['Quantum', 'Timu (Team)'],
    ]);

    rich.addProduct({
        title: 'MICKEY GLITCH BOT',
        brand: 'Glitch System',
        price: 'Bure (Free)',
        product_url: 'https://github.com/Mickeydeveloper',
        image_url: imageUrl,
    });

    rich.addPost({
        profile: imageUrl,
        title: 'Siri ya Uundaji (Behind the Build)',
        username: 'Mickey',
        verified: true,
        caption: 'Ujumbe huu umetengenezwa kwa MessageBuilder na AIRich.',
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

    rich.addTip(input || 'Tengeneza na utume ujumbe wenye mwonekano wa kisasa kwa AIRich.');
    rich.addSource([[imageUrl, 'https://mickey-pterodacty.vercel.app', 'MessageBuilder V4.7']]);

    try {
        await rich.send(ctx.chatId, { quoted: ctx.msg });
    } catch (error) {
        console.error('ping2Command error:', error?.message || error);
        await ctx.reply('Imeshindikana kutuma mfano wa MessageBuilder. Tafadhali jaribu tena.');
    }
};

module.exports = ping2Command;

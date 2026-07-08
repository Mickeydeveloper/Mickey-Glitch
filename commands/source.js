const { generateMessageSourceCode, ButtonV2, AIRich, createCtx } = require('../lib/messageBuilder');

const defaultActions = [
    { label: '📦 Menu', id: '.menu' },
    { label: '🏓 Ping', id: '.ping' },
    { label: '🧠 AI', id: '.ai' },
    { label: '📊 Stats', id: '.stats' },
    { label: '📂 Repo', id: '.repo' },
    { label: '👑 Owner', id: '.owner' },
];

const sourceCommand = async (sock, chatId, msg, args) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();

    // ─── 1. MFUMO WA KUTEST MA-FUNCTION (IF NO INPUT) ───
    if (!input) {
        try {
            const testMenu = new ButtonV2(sock)
                .setTitle('🧪 MessageBuilder Tester')
                .setSubtitle('Chagua function ya kutest hapo chini')
                .setBody('Bofya button kuona sample (mfano) wa jinsi function husika inavyofanya kazi kwenye mfumo wako.')
                .setFooter('MICKEY BOT');

            testMenu.addButton('📱 Test ButtonV2', '.source test_buttonv2');
            testMenu.addButton('🧠 Test AIRich', '.source test_airich');
            testMenu.addButton('💻 Test SourceCode', '.source test_sourcecode');

            await testMenu.send(ctx.chatId, { 
                quoted: ctx._msg,
                fallbackText: "🧪 *MessageBuilder Tester*\n\nChagua amri ya kutest:\n1. .source test_buttonv2\n2. .source test_airich\n3. .source test_sourcecode"
            });
            return;
        } catch (e) {
            console.error('Test menu error:', e);
            return ctx.reply('❌ Imeshindwa kufungua Tester Menu.');
        }
    }

    // ─── 2. SHULUGULIKIA SAMPLES (UKIBONYEZA BUTTONS ZA TEST) ───
    if (input === 'test_buttonv2') {
        const sampleBtn = new ButtonV2(sock)
            .setTitle('📱 ButtonV2 Sample')
            .setSubtitle('Huu ni mfano wa muundo wa ButtonV2')
            .setBody('Kazi ya ButtonV2 ni kutengeneza layout hii ya ma-buttons ya haraka (Native Flow Buttons).')
            .setFooter('MICKEY BOT');
        
        defaultActions.forEach(btn => sampleBtn.addButton(btn.label, btn.id));
        return await sampleBtn.send(ctx.chatId, { 
            quoted: ctx._msg,
            fallbackText: "📱 *ButtonV2 Sample*\n\nHuu ni mfano wa muundo wa ButtonV2 wenye amri za haraka."
        });
    }

    if (input === 'test_airich') {
        const sampleRich = new AIRich(sock)
            .setTitle('🧠 AIRich Sample')
            .setFooter('MICKEY BOT')
            .addText('Huu ni mfano wa kadi ya kijani ya AIRich.\n\nInatumika kuonesha majibu ya AI kwa muundo nadhifu yenye Verified Badge.')
            .addSuggest(['Mambo vipi → .ai mambo', 'Msaada → .menu'])
            .addTip('Inaleta muundo safi wa muonekano kwenye WhatsApp ya simu.');

        return await sampleRich.send(ctx.chatId, { 
            quoted: ctx._msg, 
            forwarded: true,
            fallbackText: "🧠 *AIRich Sample*\n\nHuu ni mfano wa kadi ya kijani ya AIRich yenye mwonekano nadhifu."
        });
    }

    if (input === 'test_sourcecode') {
        const snippet = generateMessageSourceCode({
            title: 'Sample Title',
            subtitle: 'Sample Subtitle',
            body: 'This is a preview of the generated source code for this message context.',
            footer: 'MICKEY BOT',
            buttons: defaultActions,
        });
        // FIX: Mabackticks yaliyorekebishwa hapa kuzuia SyntaxError
        return ctx.reply("```javascript\n" + snippet + "\n```");
    }

    // ─── 3. MFUMO WA KAWAIDA WA CUSTOM BUTTONS (IF INPUT EXISTS) ───
    const parts = input.split('|').map((part) => part.trim()).filter(Boolean);
    const [title, subtitle, body, footer, ...buttonEntries] = parts;

    const buttons = buttonEntries.length
        ? buttonEntries.map((entry) => {
            const [label, id] = entry.split(',').map((item) => item.trim()).filter(Boolean);
            return { label: label || 'Button', id: id ? (id.startsWith('.') ? id : `.${id}`) : '.menu' };
        })
        : defaultActions;

    const buttonTitle = title || '🧩 MessageBuilder';
    const buttonSubtitle = subtitle || 'Tap a button to run a bot function';
    const buttonBody = body || 'Hii ni mfano wa interactive message kutoka MessageBuilder';
    const buttonFooter = footer || 'MICKEY BOT';

    try {
        const buttonBuilder = new ButtonV2(sock)
            .setTitle(buttonTitle)
            .setSubtitle(buttonSubtitle)
            .setBody(buttonBody)
            .setFooter(buttonFooter);

        buttons.forEach((button) => buttonBuilder.addButton(button.label, button.id));
        await buttonBuilder.send(ctx.chatId, { quoted: ctx._msg, fallbackText: `${buttonTitle}\n${buttonSubtitle}\n\n${buttonBody}` });
        return;
    } catch (error) {
        console.error('MessageBuilder send error:', error);
        const snippet = generateMessageSourceCode({
            title: buttonTitle,
            subtitle: buttonSubtitle,
            body: buttonBody,
            footer: buttonFooter,
            buttons,
        });
        return ctx.reply(snippet);
    }
};

sourceCommand.category = 'UTILITY';
sourceCommand.description = 'Test MessageBuilder functions or send customized interactive messages';

module.exports = sourceCommand;

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

    // ─── 1. MENU KUU YA KUTEST FUNCTION ZOTE ───
    if (!input) {
        try {
            const testMenu = new ButtonV2(sock)
                .setTitle('🧪 MessageBuilder Tester')
                .setSubtitle('Orodha ya Function Zote')
                .setBody('Chagua function hapo chini ili kuona mfano (sample) wa jinsi inavyofanya kazi kwenye mfumo wako.')
                .setFooter('MICKEY BOT');

            testMenu.addButton('📱 Test ButtonV2', '.source test_buttonv2');
            testMenu.addButton('🧠 Test AIRich (All Functions)', '.source test_airich');
            testMenu.addButton('💻 Test SourceCode Snippet', '.source test_sourcecode');

            await testMenu.send(ctx.chatId, { 
                quoted: ctx._msg,
                fallbackText: "🧪 *MessageBuilder Tester*\n\nAmri za kutest:\n1. .source test_buttonv2\n2. .source test_airich\n3. .source test_sourcecode"
            });
            return;
        } catch (e) {
            console.error('Test menu error:', e);
            return ctx.reply('❌ Imeshindwa kufungua Tester Menu.');
        }
    }

    // ─── 2. SAMPLE YA BUTTONV2 ───
    if (input === 'test_buttonv2') {
        const sampleBtn = new ButtonV2(sock)
            .setTitle('📱 ButtonV2 Sample')
            .setSubtitle('Muundo wa Native Flow Buttons')
            .setBody('Huu ni mfano wa ButtonV2 ikitumia `.setTitle()`, `.setSubtitle()`, `.setBody()`, `.setFooter()`, na `.addButton()`.')
            .setFooter('MICKEY BOT');
        
        defaultActions.forEach(btn => sampleBtn.addButton(btn.label, btn.id));
        return await sampleBtn.send(ctx.chatId, { 
            quoted: ctx._msg,
            fallbackText: "📱 *ButtonV2 Sample* imetumwa kikamilifu."
        });
    }

    // ─── 3. SAMPLE YA AIRICH (INAZENGA FUNCTION ZOTE NNE ZILIZOPO) ───
    if (input === 'test_airich') {
        const sampleRich = new AIRich(sock)
            .setTitle('🧠 AIRich Sample') // Function ya 1
            .setFooter('MICKEY BOT') // Function ya ziada (Kufunga kadi)
            .addText('Huu ni mfano kamili wa kadi ya kijani ya AIRich.\n\nInatumika kuonesha majibu ya AI kwa muundo nadhifu yenye Verified Badge kwenye jina la juu.') // Function ya 2
            .addSuggest(['Mambo vipi → .ai mambo', 'Msaada → .menu', 'Ping Bot → .ping']) // Function ya 3
            .addTip('Inaleta muundo safi wa muonekano kwenye WhatsApp ya simu yako.'); // Function ya 4

        return await sampleRich.send(ctx.chatId, { 
            quoted: ctx._msg, 
            forwarded: true,
            fallbackText: "🧠 *AIRich Sample* (Inajumuisha setTitle, addText, addSuggest, na addTip)."
        });
    }

    // ─── 4. SAMPLE YA GENERATE SOURCE CODE ───
    if (input === 'test_sourcecode') {
        const snippet = generateMessageSourceCode({
            title: 'Sample Title',
            subtitle: 'Sample Subtitle',
            body: 'This is a preview of the generated source code for this message context.',
            footer: 'MICKEY BOT',
            buttons: defaultActions,
        });
        return ctx.reply("```javascript\n" + snippet + "\n```");
    }

    // ─── 5. MFUMO WA KAWAIDA WA CUSTOM BUTTONS (IF CUSTOM INPUT EXISTS) ───
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

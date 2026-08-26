const { AIRich, createCtx } = require('../lib/messageBuilder');

async function nitestCommand(sock, chatId, message) {
    const ctx = createCtx(sock, chatId, message);
    let rich;

    try {
        rich = new AIRich(sock)
            .setTitle('MICKEY AIRICH TEST')
            .setBody('Testing modern AIRich features')
            .setFooter('Live test complete')
            .addText('⚡ *AIRich live test*', { id: 'intro' })
            .addMetadata('Initial message created successfully.', { id: 'status', insertAt: 'intro' })
            .addWidget({
                title: 'Test Widget',
                sections: [{
                    title: 'Feature checks',
                    items: [
                        { label: 'Node IDs', value: 'Ready' },
                        { label: 'Live editing', value: 'Ready' },
                        { label: 'CTA buttons', value: 'Ready' },
                    ],
                }],
                actions: [{
                    label: 'Run test',
                    id: 'nitest_run',
                    kind: 'CONFIRM',
                    state: 'PENDING',
                    toast: { label: 'AIRich test is running' },
                }],
            }, { id: 'widget', insertAt: 'status' })
            .addFooterAction({
                text: 'Open Mickey GitHub',
                type: 'OPEN_URL',
                url: 'https://github.com/Mickeydeveloper/Mickey-Glitch',
            }, { id: 'github', insertAt: 'widget' });

        await rich.send(chatId, {
            quoted: message,
            forwarded: true,
            notification: false,
            bypassDownload: true,
        });

        rich.addText('✅ This line was inserted live.', { id: 'live_insert', insertAt: 'intro' });
        await rich.sendEdit();

        rich.addMetadata('✅ This status was replaced live.', { replace: 'status' });
        await rich.sendEdit();

        rich.delete('live_insert');
        rich.addMetadata('✅ Deleted and replaced nodes are working.', { id: 'final_status', insertAt: 'github' });
        await rich.sendEdit();

        return true;
    } catch (error) {
        console.error('[NITEST ERROR]', error.message);
        return ctx.reply(
            '❌ *AIRich test failed*\n\n' +
            `${error.message}\n\n` +
            'Check that your Baileys version supports rich response messages.'
        );
    }
}

nitestCommand.name = 'nitest';
nitestCommand.description = 'Test AIRich widgets, CTA buttons, insert, replace, delete and live edit';
nitestCommand.category = 'TOOLS';
nitestCommand.aliases = ['airichtest', 'richcheck'];

module.exports = nitestCommand;

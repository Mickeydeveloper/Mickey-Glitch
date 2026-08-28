'use strict';

const { A2UI, sendA2UIWidget } = require('../lib/a2ui');

async function a2uiTestCommand(sock, chatId, message) {
    try {
        const ui = new A2UI();

        const title = ui.text('A2UI Test Screen', { variant: 'h1' });
        const description = ui.text('Testing text, media, cards, inputs and actions.');
        const caption = ui.text('Mickey Glitch A2UI', { variant: 'caption' });
        const image = ui.image(
            'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png',
            { variant: 'header' },
        );
        const profileCard = ui.card(ui.column([image, description, caption]));

        const sectionTitle = ui.text('Choose an option', { variant: 'h2' });
        const options = ui.choicePicker('Test picker', [
            { label: 'Option 1', value: 'option_1' },
            { label: 'Option 2', value: 'option_2' },
            { label: 'Option 3', value: 'option_3' },
        ]);
        const checks = ui.column([
            ui.checkbox('Checkbox 1'),
            ui.checkbox('Checkbox 2'),
        ]);
        const section = ui.column([sectionTitle, options, checks]);

        const inputTitle = ui.text('Input test', { variant: 'h2' });
        const input = ui.textField('Write something here', { variant: 'longText' });
        const actionText = ui.text('Submit test');
        const actionButton = ui.button(actionText, {
            action: { name: 'a2ui_test_submit' },
        });
        const form = ui.column([inputTitle, input, actionButton]);

        const mediaTitle = ui.text('Media components', { variant: 'h2' });
        const video = ui.video('https://www.w3schools.com/html/mov_bbb.mp4');
        const media = ui.row([mediaTitle, video]);
        const separator = ui.divider();

        ui.root([title, profileCard, section, separator, media, form]);

        await sendA2UIWidget(sock, chatId, {
            a2ui: ui,
            footer: 'A2UI test completed',
            buttons: [
                {
                    name: 'cta_url',
                    params: {
                        display_text: 'Open Google',
                        url: 'https://www.google.com',
                        merchant_url: 'https://www.google.com',
                    },
                },
                {
                    name: 'cta_copy',
                    params: {
                        display_text: 'Copy test value',
                        copy_code: 'A2UI_TEST_OK',
                    },
                },
            ],
            contextInfo: { expiration: 7776000 },
            quoted: message,
        });
    } catch (error) {
        console.error('A2UI test command error:', error);
        await sock.sendMessage(chatId, {
            text: `A2UI test failed: ${error.message}`,
        }, { quoted: message });
    }
}

module.exports = a2uiTestCommand;

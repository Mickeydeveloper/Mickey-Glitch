'use strict';

const { A2UI, sendA2UIWidget } = require('../lib/a2ui');

async function a2uiCommand(sock, chatId, message) {
    try {
        const ui = new A2UI();

        const image = ui.image(
            'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png',
            { variant: 'header' },
        );
        const title = ui.text('Ini Title', { variant: 'h1' });
        const description = ui.text('Ini Description');
        const status = ui.text('Ini Caption', { variant: 'caption' });
        const profileCard = ui.card(ui.column([image, description, status]));

        const sectionTitle = ui.text('Ini Section Title', { variant: 'h2' });
        const option1 = ui.checkbox('Ini Checkbox 1');
        const option2 = ui.checkbox('Ini Checkbox 2');
        const option3 = ui.checkbox('Ini Checkbox 3');
        const section = ui.column([sectionTitle, option1, option2, option3]);

        const inputTitle = ui.text('Ini Input Section', { variant: 'h2' });
        const input = ui.textField('Ini Placeholder', { variant: 'longText' });
        const buttonText = ui.text('Ini Button');
        const button = ui.button(buttonText, { action: { name: 'testAction' } });
        const form = ui.column([inputTitle, input, button]);

        ui.root([title, profileCard, section, form]);

        await sendA2UIWidget(sock, chatId, {
            footer: '• Ini Footer',
            buttons: [
                {
                    name: 'cta_url',
                    params: {
                        display_text: 'Ini Button 1',
                        url: 'https://www.google.com',
                        merchant_url: 'https://www.google.com',
                    },
                },
                {
                    name: 'cta_url',
                    params: {
                        display_text: 'Ini Button 2',
                        url: 'https://www.google.com',
                        merchant_url: 'https://www.google.com',
                    },
                },
            ],
            a2ui: ui,
            contextInfo: { expiration: 7776000 },
            quoted: message,
        });
    } catch (error) {
        console.error('A2UI command error:', error);
        await sock.sendMessage(chatId, {
            text: 'A2UI message could not be sent. Please try again later.',
        }, { quoted: message });
    }
}

module.exports = a2uiCommand;

'use strict';

const { A2UI, sendA2UIWidget } = require('../lib/a2ui');

const COMPONENTS = {
    text: {
        label: 'Text',
        code: "const text = ui.text('Hello A2UI', { variant: 'h1' });\nui.root([text]);",
        build(ui) { return ui.text('Hello A2UI', { variant: 'h1' }); },
    },
    image: {
        label: 'Image',
        code: "const image = ui.image('https://example.com/image.png', { variant: 'header' });\nui.root([image]);",
        build(ui) { return ui.image('https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png', { variant: 'header' }); },
    },
    video: {
        label: 'Video',
        code: "const video = ui.video('https://example.com/video.mp4');\nui.root([video]);",
        build(ui) { return ui.video('https://www.w3schools.com/html/mov_bbb.mp4'); },
    },
    checkbox: {
        label: 'Checkbox',
        code: "const checkbox = ui.checkbox('Enable notifications', { value: false });\nui.root([checkbox]);",
        build(ui) { return ui.checkbox('Enable notifications', { value: false }); },
    },
    textfield: {
        label: 'TextField',
        code: "const input = ui.textField('Write your message', { variant: 'longText' });\nui.root([input]);",
        build(ui) { return ui.textField('Write your message', { variant: 'longText' }); },
    },
    button: {
        label: 'Button',
        code: "const label = ui.text('Submit');\nconst button = ui.button(label, { action: { name: 'submit_form' } });\nui.root([button]);",
        build(ui) {
            const label = ui.text('Submit');
            return ui.button(label, { action: { name: 'submit_form' } });
        },
    },
    card: {
        label: 'Card',
        code: "const title = ui.text('Card title');\nconst card = ui.card(title);\nui.root([card]);",
        build(ui) { return ui.card(ui.text('Card title', { variant: 'h2' })); },
    },
    column: {
        label: 'Column',
        code: "const first = ui.text('First');\nconst second = ui.text('Second');\nconst column = ui.column([first, second]);\nui.root([column]);",
        build(ui) { return ui.column([ui.text('First'), ui.text('Second')]); },
    },
    row: {
        label: 'Row',
        code: "const left = ui.text('Left');\nconst right = ui.text('Right');\nconst row = ui.row([left, right]);\nui.root([row]);",
        build(ui) { return ui.row([ui.text('Left'), ui.text('Right')]); },
    },
    divider: {
        label: 'Divider',
        code: "const divider = ui.divider();\nui.root([divider]);",
        build(ui) { return ui.divider(); },
    },
    choicepicker: {
        label: 'ChoicePicker',
        code: "const picker = ui.choicePicker('Choose one', [\n    { label: 'Option A', value: 'a' },\n    { label: 'Option B', value: 'b' }\n]);\nui.root([picker]);",
        build(ui) {
            return ui.choicePicker('Choose one', [
                { label: 'Option A', value: 'a' },
                { label: 'Option B', value: 'b' },
            ]);
        },
    },
};

function getArgs(args) {
    if (Array.isArray(args)) return args.map(String).filter(Boolean);
    if (typeof args === 'string') return args.trim().split(/\s+/).filter(Boolean);
    return args == null ? [] : [String(args)];
}

function normalizeSelection(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/^\.a2uitest\s*/, '')
        .replace(/[^a-z]/g, '');
}

async function sendComponentExample(sock, chatId, message, key) {
    const component = COMPONENTS[key];
    const ui = new A2UI();
    const example = component.build(ui);
    ui.root([example]);

    await sendA2UIWidget(sock, chatId, {
        a2ui: ui,
        bodyText: `${component.label} component example`,
        footer: `A2UI test: ${component.label}`,
        quoted: message,
    });
    await sock.sendMessage(chatId, {
        text: `A2UI ${component.label} example code:\n\n${component.code}`,
    }, { quoted: message });
}

async function sendComponentMenu(sock, chatId, message) {
    const ui = new A2UI();
    const title = ui.text('A2UI Component Tests', { variant: 'h1' });
    const description = ui.text('Chagua component moja kuona example na code yake.');
    ui.root([title, description]);

    const buttons = Object.entries(COMPONENTS).map(([key, component]) => ({
        name: 'quick_reply',
        params: {
            display_text: component.label,
            id: `.a2uitest ${key}`,
        },
    }));

    await sendA2UIWidget(sock, chatId, {
        a2ui: ui,
        buttons,
        footer: 'A2UI test menu',
        quoted: message,
    });
}

async function a2uiTestCommand(sock, chatId, message, args) {
    try {
        const selection = normalizeSelection(getArgs(args)[0]);
        if (selection && COMPONENTS[selection]) {
            await sendComponentExample(sock, chatId, message, selection);
            return;
        }
        await sendComponentMenu(sock, chatId, message);
    } catch (error) {
        console.error('A2UI test command error:', error);
        await sock.sendMessage(chatId, {
            text: `A2UI test failed: ${error.message}`,
        }, { quoted: message });
    }
}

module.exports = a2uiTestCommand;

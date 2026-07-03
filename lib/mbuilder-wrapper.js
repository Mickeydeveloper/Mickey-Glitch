// lib/mbuilder-wrapper.js
// Wrapper around NIXCODE MessageBuilder (local) or baileys-mbuilder providing a compatible `MB` API.
let LocalNix = null;
try {
    LocalNix = require('./nixcode-messagebuilder');
} catch (e) {
    LocalNix = null;
}

let ExternalMB = null;
try {
    ExternalMB = require('baileys-mbuilder');
    ExternalMB = ExternalMB && ExternalMB.default ? ExternalMB.default : ExternalMB;
} catch (e) {
    ExternalMB = null;
}

const LocalShim = require('./mbuilder');

const MB = LocalNix || ExternalMB || (() => {
    const shim = {};
    shim.Button = (sock) => LocalShim.MB.Button(sock);
    shim.ButtonV2 = (sock) => LocalShim.MB.ButtonV2(sock);
    shim.AIRich = (sock) => {
        const builder = {
            _title: '',
            _footer: '',
            _text: '',
            setTitle(title) { this._title = title; return this; },
            setFooter(footer) { this._footer = footer; return this; },
            addText(text) { this._text = text; return this; },
            build() { return LocalShim.MB.buildAIRich(this._text || this._title || ''); }
        };
        return builder;
    };
    shim.Carousel = (sock) => (typeof LocalShim.MB.Carousel === 'function' ? LocalShim.MB.Carousel(sock) : null);
    shim.update = async (cb) => { if (typeof cb === 'function') cb(); return true; };
    shim.enableAutoUpdate = () => {};
    shim.disableAutoUpdate = () => {};
    return shim;
})();

const normalizeButton = (button) => {
    if (!button || typeof button !== 'object') return { label: String(button || ''), command: String(button || '') };
    return {
        label: button.label || button.text || button.title || button.display_text || button.buttonText?.displayText || button.name || '',
        command: button.command || button.id || button.buttonId || button.copy_code || button.url || button.payload || ''
    };
};

const normalizeAIRichArgs = (sockOrText, textOrOptions = {}, options = {}) => {
    if (typeof sockOrText === 'string') {
        return { sock: null, text: sockOrText, options: textOrOptions || {} };
    }
    return { sock: sockOrText, text: textOrOptions || '', options: options || {} };
};

const unwrapMessagePayload = (payload) => {
    if (!payload || typeof payload !== 'object') return payload;
    if (payload.message) return payload.message;
    if (payload.messages && Array.isArray(payload.messages) && payload.messages.length > 0) return payload.messages[0];
    return payload;
};

const buildButtonPayload = (sock, text, buttons = [], footer = '') => {
    if (!MB) return { text };
    const isRows = Array.isArray(buttons[0]);
    let builder = null;

    if (typeof MB.Button === 'function') builder = new MB.Button(sock);
    else if (typeof MB.ButtonV2 === 'function') builder = new MB.ButtonV2(sock);
    if (!builder) return { text };

    if (typeof builder.text === 'function') builder.text(text);
    if (footer && typeof builder.footer === 'function') builder.footer(footer);

    const addButtonEntry = (button) => {
        const { label, command } = normalizeButton(button);
        if (typeof builder.button === 'function') builder.button(label, command);
        else if (typeof builder.addReply === 'function') builder.addReply(label, command);
    };

    if (isRows && typeof builder.row === 'function') {
        for (const row of buttons) {
            builder.row((r) => {
                for (const b of row) addButtonEntry(b);
            });
        }
    } else if (Array.isArray(buttons) && buttons.length > 0 && typeof builder.row === 'function') {
        builder.row((r) => {
            for (const b of buttons) addButtonEntry(b);
        });
    } else if (Array.isArray(buttons)) {
        for (const b of buttons) addButtonEntry(b);
    }

    if (typeof builder.build === 'function') {
        let output;
        try {
            output = builder.build('0@s.whatsapp.net');
        } catch (err) {
            output = builder.build();
        }
        return unwrapMessagePayload(output) || { text };
    }

    return { text };
};

const buildAIRichPayload = (sock, text, options = {}) => {
    if (!MB || typeof MB.AIRich !== 'function') {
        return { text, contextInfo: { externalAdReply: { title: options.title || '' } } };
    }
    try {
        const builder = new MB.AIRich(sock);
        if (typeof builder.setTitle === 'function' && options.title) builder.setTitle(options.title);
        if (typeof builder.setFooter === 'function' && options.footer) builder.setFooter(options.footer);
        if (typeof builder.addText === 'function') builder.addText(text);
        if (typeof builder.addImage === 'function' && options.thumbnailUrl) builder.addImage(options.thumbnailUrl);
        if (typeof builder.addSource === 'function' && options.sourceUrl) {
            builder.addSource([[options.thumbnailUrl || '', options.sourceUrl, options.title || '']]);
        }
        return typeof builder.build === 'function' ? builder.build(options) : { text };
    } catch (error) {
        return { text, contextInfo: { externalAdReply: { title: options.title || '' } } };
    }
};

const MBuilderWrapper = {
    MB,
    _useExternal: () => !!(LocalNix || ExternalMB),
    createButtons: (sock, text, buttons = [], footer = '') => {
        try {
            return buildButtonPayload(sock, text, buttons, footer);
        } catch (error) {
            return { text };
        }
    },
    createAIRich: (sockOrText, textOrOptions = {}, options = {}) => {
        try {
            const { sock, text, options: opts } = normalizeAIRichArgs(sockOrText, textOrOptions, options);
            return buildAIRichPayload(sock, text, opts);
        } catch (error) {
            const fallbackText = typeof sockOrText === 'string' ? sockOrText : textOrOptions;
            const fallbackOpts = typeof sockOrText === 'string' ? textOrOptions : options;
            return { text: fallbackText || '', contextInfo: { externalAdReply: { title: fallbackOpts.title || '' } } };
        }
    },
    createButtonWithAIRich: (sock, text, buttons = [], footer = '', options = {}) => {
        try {
            const buttonMsg = buildButtonPayload(sock, text, buttons, footer);
            const airMsg = buildAIRichPayload(sock, text, options);
            const result = { ...buttonMsg };
            if (airMsg.messageContextInfo) {
                result.messageContextInfo = { ...(buttonMsg.messageContextInfo || {}), ...airMsg.messageContextInfo };
            }
            if (airMsg.contextInfo) {
                result.contextInfo = { ...(buttonMsg.contextInfo || {}), ...airMsg.contextInfo };
            }
            if (airMsg.botForwardedMessage) {
                result.botForwardedMessage = airMsg.botForwardedMessage;
            }
            if (airMsg.additionalNodes) {
                result.additionalNodes = [ ...(buttonMsg.additionalNodes || []), ...airMsg.additionalNodes ];
            }
            return result;
        } catch (error) {
            return { text };
        }
    }
};

module.exports = MBuilderWrapper;

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

// Build MB object: prefer local NIXCODE implementation, then external, otherwise use shim
const MB = (function() {
    if (LocalNix) return LocalNix;
    if (ExternalMB) return ExternalMB;

    const shim = {};
    shim.Button = function(sock){ return LocalShim.MB.Button ? LocalShim.MB.Button(sock) : LocalShim.MB.Button(sock); };
    shim.ButtonV2 = function(sock){ return LocalShim.MB.ButtonV2 ? LocalShim.MB.ButtonV2(sock) : LocalShim.MB.ButtonV2(sock); };

    class CarouselBuilder { constructor(){ this.cards = []; } card(fn){ const c = { image: null, title: '', text: '', buttons: [] }; const builder = { image: (u)=>{ c.image = u; return builder; }, title: (t)=>{ c.title=t; return builder; }, text: (t)=>{ c.text=t; return builder; }, button: (label,id)=>{ c.buttons.push({ label, id }); return builder; } }; fn(builder); this.cards.push(c); return this; } build(){ return { carousel: this.cards }; } }
    shim.Carousel = function(){ return new CarouselBuilder(); };

    class AIRichBuilder { constructor(){ this._text = ''; this._opts = {}; } text(t){ this._text = t; return this; } extract(v){ this._opts.extract = v; return this; } hyperlink(v){ this._opts.hyperlink = v; return this; } citation(v){ this._opts.citation = v; return this; } latex(v){ this._opts.latex = v; return this; } build(){ return { text: this._text, contextInfo: { externalAdReply: { title: this._text.split('\n')[0] || '' } }, options: this._opts }; } }
    shim.AIRich = function(){ return new AIRichBuilder(); };

    shim.update = async function(cb){ if (typeof cb === 'function') cb(); return true; };
    shim.enableAutoUpdate = function(){ };
    shim.disableAutoUpdate = function(){ };

    return shim;
})();

const MBuilderWrapper = {
    MB,
    _useExternal: () => !!(LocalNix || ExternalMB),
    createButtons: (sock, text, buttons = [], footer = '') => {
        try {
            const isRows = Array.isArray(buttons[0]);
            const BtnCtor = MB.Button || MB.ButtonV2 || null;
            if (MB && BtnCtor) {
                const btn = isRows && MB.ButtonV2 ? new MB.ButtonV2(sock) : new MB.Button(sock);
                if (typeof btn.text === 'function') btn.text(text);
                if (footer && typeof btn.footer === 'function') btn.footer(footer);
                if (isRows && typeof btn.row === 'function') {
                    for (const row of buttons) btn.row(r => { for (const b of row) r.button(b.label, b.command); });
                } else if (typeof btn.row === 'function') {
                    btn.row(r => { for (const b of buttons) r.button(b.label, b.command); });
                } else {
                    for (const b of (isRows ? buttons.flat() : buttons)) if (typeof btn.button === 'function') btn.button(b.label, b.command);
                }
                return typeof btn.build === 'function' ? btn.build() : btn;
            }
        } catch (e) { }
        return { text };
    },
    createAIRich: (text, options = {}) => {
        try {
            if (MB && typeof MB.AIRich === 'function') {
                try {
                    const b = new MB.AIRich(MB && MB._client ? MB._client : null);
                    if (typeof b.addText === 'function') b.addText(text);
                    return typeof b.build === 'function' ? b.build() : { text };
                } catch (e) {
                    try { const built = MB.AIRich().addText ? MB.AIRich().addText(text).build() : null; if (built) return built; } catch (e2) {}
                }
            }
        } catch (e) {}
        return { text, contextInfo: { externalAdReply: { title: options.title || '' } } };
    },
    createButtonWithAIRich: (sock, text, buttons = [], footer = '', options = {}) => {
        try {
            const buttonMsg = MBuilderWrapper.createButtons(sock, text, buttons, footer);
            const air = MBuilderWrapper.createAIRich(text, options);
            const result = { ...buttonMsg };
            result.contextInfo = { ...(buttonMsg.contextInfo || {}), ...(air && air.contextInfo ? air.contextInfo : {}) };
            if (air && air.additionalNodes) result.additionalNodes = [ ...(buttonMsg.additionalNodes || []), ...air.additionalNodes ];
            return result;
        } catch (e) { return { text }; }
    }
};

module.exports = MBuilderWrapper;

// lib/mbuilder-wrapper.js
// Wrapper around baileys-mbuilder with safe fallbacks and simple API.
let ExternalMB = null;
try {
    ExternalMB = require('baileys-mbuilder');
} catch (e) {
    ExternalMB = null;
}

const { MB: LocalMB } = require('./mbuilder');

class MBuilderWrapper {
    static _useExternal() { return !!ExternalMB; }

    static createButtons(sock, text, buttons = [], footer = '') {
        try {
            // buttons can be array of rows or flat array
            const isRows = Array.isArray(buttons[0]);
            if (this._useExternal()) {
                // Use baileys-mbuilder API if available
                const MB = ExternalMB.MB || ExternalMB;
                const btn = new (MB.ButtonV2 || MB.Button)(sock);
                btn.text ? btn.text(text) : (btn.setText && btn.setText(text));
                if (footer && (btn.footer || btn.setFooter)) {
                    if (btn.footer) btn.footer(footer); else btn.setFooter(footer);
                }
                if (isRows) {
                    for (const row of buttons) {
                        if (typeof btn.row === 'function') {
                            btn.row(r => { for (const b of row) r.button(b.label, b.command); });
                        }
                    }
                } else {
                    if (typeof btn.row === 'function') {
                        btn.row(r => { for (const b of buttons) r.button(b.label, b.command); });
                    } else {
                        for (const b of buttons) btn.button(b.label, b.command);
                    }
                }
                return btn.build ? btn.build() : btn;
            }

            // Local fallback
            const btn = isRows ? LocalMB.ButtonV2(sock) : LocalMB.Button(sock);
            if (btn.text) btn.text(text); else if (btn.setText) btn.setText(text);
            if (footer && btn.footer) btn.footer(footer);
            if (isRows) {
                for (const row of buttons) btn.row(r => { for (const b of row) r.button(b.label, b.command); });
            } else {
                for (const b of buttons) btn.button(b.label, b.command);
            }
            return btn.build();
        } catch (err) {
            return { text };
        }
    }

    static createAIRich(text, options = {}) {
        try {
            if (this._useExternal()) {
                const MB = ExternalMB.MBuilder || ExternalMB;
                if (MB && MB.buildAIRich) return MB.buildAIRich(text, options) || null;
            }
            // Fallback simple AIRich-like structure
            const ctx = { externalAdReply: { title: options.title || '', body: options.body || '', thumbnailUrl: options.thumbnailUrl || options.thumbnail || '', sourceUrl: options.sourceUrl || '', showAdAttribution: !!options.showAdAttribution } };
            return { text, contextInfo: ctx };
        } catch (err) {
            return null;
        }
    }

    static createButtonWithAIRich(sock, text, buttons = [], footer = '', options = {}) {
        try {
            const buttonMsg = this.createButtons(sock, text, buttons, footer);
            const air = this.createAIRich(text, options);
            // Merge contextInfo carefully
            const result = { ...buttonMsg };
            result.contextInfo = { ...(buttonMsg.contextInfo || {}), ...(air && air.contextInfo ? air.contextInfo : {}) };
            if (air && air.additionalNodes) {
                result.additionalNodes = [ ...(buttonMsg.additionalNodes || []), ...air.additionalNodes ];
            }
            return result;
        } catch (err) {
            return { text };
        }
    }
}

module.exports = MBuilderWrapper;

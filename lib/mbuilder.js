<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
// lib/mbuilder.js
// Minimal, conflict-free MB shim used as a safe fallback if baileys-mbuilder is unavailable.
class ButtonRowBuilder {
    constructor() { this.buttons = []; }
    button(label, command) { this.buttons.push({ label, command }); return this; }
}

class MBButtonV2 {
    constructor(sock) { this.sock = sock; this.textVal = ''; this.footerVal = ''; this.rows = []; }
    text(t) { this.textVal = t; return this; }
    footer(f) { this.footerVal = f; return this; }
    row(fn) { const rb = new ButtonRowBuilder(); fn(rb); this.rows.push(rb.buttons); return this; }
    build() {
        const flat = [];
        let idx = 0;
        for (const row of this.rows) {
            for (const b of row) {
                flat.push({ buttonId: `cmd_${idx++}_${(b.command||'')}`, buttonText: { displayText: b.label }, type: 1 });
            }
        }
        return { text: this.textVal, footer: this.footerVal, buttons: flat, headerType: 1 };
    }
}

class MBButton {
    constructor(sock) { this.sock = sock; this._text = ''; this._footer = ''; this._buttons = []; }
    text(t) { this._text = t; return this; }
    button(label, command) { this._buttons.push({ label, command }); return this; }
    footer(f) { this._footer = f; return this; }
    build() { return { text: this._text, footer: this._footer, buttons: this._buttons.map((b,i)=>({ buttonId: `cmd_${i}_${b.command}`, buttonText:{ displayText: b.label }, type:1 })), headerType: 1 }; }
}

class MB {
    static ButtonV2(sock){ return new MBButtonV2(sock); }
    static Button(sock){ return new MBButton(sock); }
    static buildAIRich(text){
        if (typeof text !== 'string' || !text.trim()) return null;
        return { text, contextInfo: { externalAdReply: { title: text.split('\n')[0] || '', body: '', showAdAttribution: true } } };
    }
}

class MBuilder {
    static buildAIRich(text){ return MB.buildAIRich(text); }
}

module.exports = { MB, MBuilder };
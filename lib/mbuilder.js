// lib/mbuilder.js
class MB {
    constructor(sock) {
        this.sock = sock;
        this.buttons = [];
        this.text = '';
        this.footer = '';
    }

    setText(text) {
        this.text = text;
        return this;
    }

    setFooter(footer) {
        this.footer = footer;
        return this;
    }

    addButton(label, command) {
        this.buttons.push({ label, command });
        return this;
    }

    build() {
        // Build button message structure
        const buttonMessage = {
            text: this.text,
            footer: this.footer,
            buttons: this.buttons.map((btn, index) => ({
                buttonId: `cmd_${index}_${btn.command}`,
                buttonText: { displayText: btn.label },
                type: 1
            })),
            headerType: 1
        };

        return buttonMessage;
    }

    static buildAIRich(text) {
        // ALRICH format for rich messages
        return {
            text: text,
            contextInfo: {
                externalAdReply: {
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        };
    }
}

class MBuilder {
    static buildAIRich(text) {
        return MB.buildAIRich(text);
    }
}

module.exports = { MB, MBuilder };
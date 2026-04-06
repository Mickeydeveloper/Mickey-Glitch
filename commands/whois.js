const truecallerjs = require('truecallerjs');

async function whoisCommand(sock, chatId, message, args) {
    try {
        let target;
        const ctxInfo = message.message?.extendedTextMessage?.contextInfo || {};
        
        if (ctxInfo.mentionedJid?.[0]) {
            target = ctxInfo.mentionedJid[0].split('@')[0];
        } else if (ctxInfo.participant) {
            target = ctxInfo.participant.split('@')[0];
        } else if (args[0]) {
            target = args[0].replace(/[^0-9]/g, '');
        }

        if (!target) return sock.sendMessage(chatId, { text: "🔎 Tag mtu au andika namba!" });

        await sock.sendMessage(chatId, { react: { text: '🕵️', key: message.key } });

        // MPANGILIO (Search Parameter)
        const searchData = {
            number: target,
            countryCode: "TZ",
            installationId: "WEKA_INSTALLATION_ID_YAKO_HAPA", // Weka ile ID uliyopata
        };

        // Tafuta kwa kutumia NPM Library
        const response = await truecallerjs.search(searchData);
        const info = response.json();

        if (!info || !info.data || info.data.length === 0) {
            return sock.sendMessage(chatId, { text: `❌ Identity for +${target} not found.` });
        }

        const user = info.data[0];
        const report = `
🕵️ *TRUECALLER INTELLIGENCE*
━━━━━━━━━━━━━━━━━━━━━━
👤 *Name:* ${user.name || 'Private'}
📱 *Number:* +${target}
📧 *Email:* ${user.internetAddresses?.[0]?.id || 'N/A'}
🏢 *Carrier:* ${user.phones?.[0]?.carrier || 'N/A'}
📍 *Region:* ${user.addresses?.[0]?.city || 'N/A'}
🛡️ *Spam Score:* ${user.spamScore || '0'}
━━━━━━━━━━━━━━━━━━━━━━`;

        await sock.sendMessage(chatId, { text: report }, { quoted: message });

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: "⚠️ Tatizo la mfumo limetokea." });
    }
}

module.exports = whoisCommand;

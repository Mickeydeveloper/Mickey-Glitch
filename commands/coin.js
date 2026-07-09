const coins = require('../lib/coins');
const isOwnerOrSudo = require('../lib/isOwner');
const { ButtonV2 } = require('../lib/messageBuilder');

/**
 * Usage:
 * .balance - show your balance
 * .coin set @user 50  (owner only)
 * .coin add @user 10  (owner only)
 */
module.exports = async function coinCommand(sock, chatId, msg, args) {
    try {
        const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
        const parts = text.split(/\s+/).filter(Boolean);
        const senderId = msg.key.participant || msg.key.remoteJid;

        // Handle enable/disable/status for coin requirement
        const modeArg = (parts[1] || '').toLowerCase();
        if (['on', 'off', 'enable', 'disable', 'status'].includes(modeArg)) {
            const authorized = await isOwnerOrSudo(senderId, sock, chatId);
            if (!authorized && !msg.key.fromMe) {
                await sock.sendMessage(chatId, { text: '❌ Hii command ni kwa owner pekee.' }, { quoted: msg });
                return;
            }

            if (modeArg === 'status') {
                const enabled = coins.isEnabled();
                await sock.sendMessage(chatId, { text: `Coins requirement is *${enabled ? 'ON' : 'OFF'}*` }, { quoted: msg });
                return;
            }

            const enable = modeArg === 'on' || modeArg === 'enable';
            coins.setEnabled(enable);
            await sock.sendMessage(chatId, { text: `✅ Coins requirement is now *${enable ? 'ON' : 'OFF'}*` }, { quoted: msg });
            return;
        }

        const first = (parts[0] || '').toLowerCase();
        // .balance or .coin
        if (first === '.balance' || first === '.coin') {
            // If .coin only, we may have subcommands
            if (parts.length === 1 || first === '.balance') {
                const bal = coins.getCoins(chatId, senderId) || 0;
                const btn = new ButtonV2(sock)
                    .text(`💰 Saldo yako: ${bal} coins`)
                    .button('📩 Contact Owner', '.msgowner')
                    .button('🔄 Refresh', '.balance')
                    .setFooter('Each command costs 10 coins');
                await btn.send(chatId, { quoted: msg, fallbackText: `Saldo yako: ${bal} coins` });
                return;
            }

            // handle .coin <action>
            const action = (parts[1] || '').toLowerCase();
            if (['set', 'add', 'remove'].includes(action)) {
                // owner only
                const authorized = await isOwnerOrSudo(senderId, sock, chatId);
                if (!authorized && !msg.key.fromMe) {
                    await sock.sendMessage(chatId, { text: '❌ Hii command ni kwa owner pekee.' }, { quoted: msg });
                    return;
                }

                const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                let target = mention[0] || parts[2];
                if (!target) {
                    await sock.sendMessage(chatId, { text: 'Tafadhali taja user (reply or @) na kiasi.' }, { quoted: msg });
                    return;
                }
                // normalize target to jid
                if (typeof target === 'string' && !target.includes('@')) {
                    if (/^\d+$/.test(target)) target = `${target}@s.whatsapp.net`;
                }

                const amount = Number(parts[3] || parts[2] || 0);
                if (isNaN(amount)) {
                    await sock.sendMessage(chatId, { text: 'Kiasi si nambari sahihi.' }, { quoted: msg });
                    return;
                }

                if (action === 'set') {
                    coins.setCoins(chatId, target, amount);
                    await sock.sendMessage(chatId, { text: `✅ Saldo ya ${target} imewekwa kuwa ${amount} coins.` }, { quoted: msg });
                    return;
                }

                if (action === 'add') {
                    const next = coins.changeCoins(chatId, target, amount);
                    await sock.sendMessage(chatId, { text: `✅ Umeongeza ${amount} coins kwa ${target}. Saldo sasa: ${next}` }, { quoted: msg });
                    return;
                }

                if (action === 'remove') {
                    const next = coins.changeCoins(chatId, target, -Math.abs(amount));
                    await sock.sendMessage(chatId, { text: `✅ Umeondoa ${amount} coins kutoka ${target}. Saldo sasa: ${next}` }, { quoted: msg });
                    return;
                }
            }
        }

    } catch (e) {
        console.error('Coin command error:', e);
        try { await sock.sendMessage(chatId, { text: '❌ Tatizo wakati wa kuendesha coin command.' }, { quoted: msg }); } catch (ignore) {}
    }
};

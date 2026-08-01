const coins = require('../lib/coins');
const isOwnerOrSudo = require('../lib/isOwner');
const { ButtonV2 } = require('../lib/messageBuilder');

/**
 * Usage:
 * .balance - show your balance
 * .coin set @user 50  (owner only)
 * .coin add @user 5   (owner only) - Adds 5 coins per command
 * .coin remove @user 5 (owner only)
 * .coin on/off/status - Enable/disable coin requirement (owner only)
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
                await sock.sendMessage(chatId, { text: '❌ This command is for owner only.' }, { quoted: msg });
                return;
            }

            if (modeArg === 'status') {
                const enabled = coins.isEnabled();
                const btn = new ButtonV2(sock)
                    .text(`⚙️ Coin System Status: *${enabled ? 'ON' : 'OFF'}*`)
                    .button('🔄 Refresh', '.coin status')
                    .button('📊 Check Balance', '.balance')
                    .setFooter('💡 Each command costs 5 coins');
                await btn.send(chatId, { quoted: msg, fallbackText: `Coin system is ${enabled ? 'ON' : 'OFF'}` });
                return;
            }

            const enable = modeArg === 'on' || modeArg === 'enable';
            coins.setEnabled(enable);
            const btn = new ButtonV2(sock)
                .text(`✅ Coin system is now *${enable ? 'ON' : 'OFF'}*`)
                .button('🔄 Refresh Status', '.coin status')
                .button('📊 Check Balance', '.balance')
                .setFooter('💡 Each command costs 5 coins');
            await btn.send(chatId, { quoted: msg, fallbackText: `Coin system ${enable ? 'enabled' : 'disabled'}` });
            return;
        }

        const first = (parts[0] || '').toLowerCase();
        
        // Handle .balance command
        if (first === '.balance') {
            const bal = coins.getCoins(chatId, senderId) || 0;
            const btn = new ButtonV2(sock)
                .text(`💰 *Your Balance*\n\nYou have *${bal}* coins\n\n💡 Each command costs 5 coins`)
                .button('🔄 Refresh', '.balance')
                .button('📩 Contact Owner', '.msgowner')
                .button('ℹ️ Help', '.help')
                .setFooter(`💰 Balance: ${bal} coins | Cost: 5 coins/command`);
            await btn.send(chatId, { quoted: msg, fallbackText: `💰 Your balance: ${bal} coins` });
            return;
        }

        // Handle coin admin commands
        if (first === '.coin' || first === '.setcoin' || first === '.addcoin' || first === '.removecoin') {
            let action = (parts[1] || '').toLowerCase();
            let target = null;
            let amountArg = null;

            // Parse command structure
            if (first === '.setcoin' || first === '.addcoin' || first === '.removecoin') {
                action = first.slice(1).replace('coin', '');
                target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || parts[1];
                amountArg = parts[2];
            } else {
                if (parts.length === 1) {
                    // Just .coin - show balance
                    const bal = coins.getCoins(chatId, senderId) || 0;
                    const btn = new ButtonV2(sock)
                        .text(`💰 *Your Balance*\n\nYou have *${bal}* coins\n\n💡 Each command costs 5 coins`)
                        .button('🔄 Refresh', '.balance')
                        .button('📩 Contact Owner', '.msgowner')
                        .setFooter(`💰 Balance: ${bal} coins | Cost: 5 coins/command`);
                    await btn.send(chatId, { quoted: msg, fallbackText: `💰 Your balance: ${bal} coins` });
                    return;
                }
                target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || parts[2];
                amountArg = parts[3] || parts[2];
            }

            // Admin actions
            if (['set', 'add', 'remove'].includes(action)) {
                const authorized = await isOwnerOrSudo(senderId, sock, chatId);
                if (!authorized && !msg.key.fromMe) {
                    await sock.sendMessage(chatId, { text: '❌ This command is for owner only.' }, { quoted: msg });
                    return;
                }

                // Validate target
                if (!target) {
                    const btn = new ButtonV2(sock)
                        .text('❌ *Error*\n\nPlease mention a user (reply or @) and specify amount.')
                        .button('📊 Check Balance', '.balance')
                        .button('ℹ️ Help', '.help')
                        .setFooter('Usage: .coin add @user 5');
                    await btn.send(chatId, { quoted: msg, fallbackText: 'Please mention a user and amount.' });
                    return;
                }

                // Format target JID
                if (typeof target === 'string' && !target.includes('@')) {
                    if (/^\d+$/.test(target)) target = `${target}@s.whatsapp.net`;
                }

                // Validate amount
                const amount = Number(amountArg || 0);
                if (isNaN(amount) || amount < 0) {
                    const btn = new ButtonV2(sock)
                        .text('❌ *Error*\n\nInvalid amount. Please enter a valid number.')
                        .button('📊 Check Balance', '.balance')
                        .button('ℹ️ Help', '.help')
                        .setFooter('Example: .coin add @user 5');
                    await btn.send(chatId, { quoted: msg, fallbackText: 'Invalid amount.' });
                    return;
                }

                // Execute actions
                if (action === 'set') {
                    coins.setCoins(chatId, target, amount);
                    const btn = new ButtonV2(sock)
                        .text(`✅ *Balance Set*\n\nUser: ${target}\nNew Balance: *${amount}* coins\n\n💡 Each command costs 5 coins`)
                        .button('📊 Check Balance', '.balance')
                        .button('🔄 Refresh', '.coin status')
                        .setFooter('✅ Admin action completed');
                    await btn.send(chatId, { quoted: msg, fallbackText: `✅ Balance for ${target} set to ${amount} coins` });
                    return;
                }

                if (action === 'add') {
                    const next = coins.changeCoins(chatId, target, amount);
                    const btn = new ButtonV2(sock)
                        .text(`✅ *Coins Added*\n\nUser: ${target}\nAdded: *+${amount}* coins\nNew Balance: *${next}* coins\n\n💡 Each command costs 5 coins`)
                        .button('📊 Check Balance', '.balance')
                        .button('🔄 Refresh', '.coin status')
                        .setFooter('✅ Admin action completed');
                    await btn.send(chatId, { quoted: msg, fallbackText: `✅ Added ${amount} coins to ${target}. New balance: ${next}` });
                    return;
                }

                if (action === 'remove') {
                    const next = coins.changeCoins(chatId, target, -Math.abs(amount));
                    const btn = new ButtonV2(sock)
                        .text(`✅ *Coins Removed*\n\nUser: ${target}\nRemoved: *-${amount}* coins\nNew Balance: *${next}* coins\n\n💡 Each command costs 5 coins`)
                        .button('📊 Check Balance', '.balance')
                        .button('🔄 Refresh', '.coin status')
                        .setFooter('✅ Admin action completed');
                    await btn.send(chatId, { quoted: msg, fallbackText: `✅ Removed ${amount} coins from ${target}. New balance: ${next}` });
                    return;
                }
            }

            // If no valid action, show help
            const btn = new ButtonV2(sock)
                .text('ℹ️ *Coin Commands*\n\n' +
                    '.balance - Check your balance\n' +
                    '.coin status - Check system status\n' +
                    '.coin add @user 5 - Add coins (owner)\n' +
                    '.coin remove @user 5 - Remove coins (owner)\n' +
                    '.coin set @user 50 - Set coins (owner)\n' +
                    '.coin on/off - Enable/disable system (owner)\n\n' +
                    '💡 Each command costs 5 coins')
                .button('📊 Check Balance', '.balance')
                .button('📩 Contact Owner', '.msgowner')
                .setFooter('💡 Each command costs 5 coins');
            await btn.send(chatId, { quoted: msg, fallbackText: 'Coin commands help' });
            return;
        }

    } catch (e) {
        console.error('Coin command error:', e);
        try {
            const btn = new ButtonV2(sock)
                .text('❌ *System Error*\n\nAn error occurred while processing your request.\nPlease try again later.')
                .button('📊 Check Balance', '.balance')
                .button('🔄 Refresh', '.coin status')
                .setFooter('Error occurred');
            await btn.send(chatId, { quoted: msg, fallbackText: 'Error processing command. Please try again.' });
        } catch (ignore) {}
    }
};
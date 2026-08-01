const coins = require('../lib/coins');
const isOwnerOrSudo = require('../lib/isOwner');
const { ButtonV2 } = require('../lib/messageBuilder');

/**
 * Usage:
 * .balance - show your balance
 * .coin set @user 50  (owner only)
 * .coin add @user 5   (owner only) - Now adds 5 coins per command
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
                await sock.sendMessage(chatId, { text: `Coins requirement is *${enabled ? 'ON' : 'OFF'}*` }, { quoted: msg });
                return;
            }

            const enable = modeArg === 'on' || modeArg === 'enable';
            coins.setEnabled(enable);
            await sock.sendMessage(chatId, { text: `✅ Coins requirement is now *${enable ? 'ON' : 'OFF'}*` }, { quoted: msg });
            return;
        }

        const first = (parts[0] || '').toLowerCase();
        if (first === '.balance' || first === '.coin' || first === '.setcoin' || first === '.addcoin' || first === '.removecoin') {
            // .balance or .coin status/balance
            if (first === '.balance' || parts.length === 1) {
                const bal = coins.getCoins(chatId, senderId) || 0;
                
                // Enhanced booking-style message using interactive buttons
                const button = new ButtonV2(sock)
                    .setTitle('💰 COIN WALLET')
                    .addButton('booking_confirmation', {
                        start_datetime: new Date().toISOString(),
                        end_datetime: new Date(Date.now() + 3600000).toISOString(),
                        location: 'WhatsApp Bot',
                        booking_url: 'https://bot.yourdomain.com/wallet',
                        phone_number: '1234567890',
                        booking_management_url: 'https://bot.yourdomain.com/manage',
                        description: `Your current balance: ${bal} coins\nEach command costs 5 coins.`,
                        email: 'support@yourbot.com',
                        display_text: `💰 BALANCE: ${bal} COINS`,
                        display_content: {
                            display_language: 'en',
                            display_meeting_type: 'Wallet Summary',
                            display_bottom_sheet_header: '💰 Coin Wallet',
                            display_add_to_calendar_cta_text: '📊 View History',
                            display_view_on_maps_cta_text: '🔄 Refresh',
                            display_manage_booking_cta_text: '📩 Contact Owner',
                            display_manage_booking_not_supported_text: 'Balance updated successfully!',
                            display_read_more: `Your current balance is ${bal} coins. Each command costs 5 coins.`
                        }
                    })
                    .setFooter('💡 Each command costs 5 coins');
                
                await button.send(chatId, { 
                    quoted: msg, 
                    fallbackText: `💰 Your balance: ${bal} coins\nEach command costs 5 coins` 
                });
                return;
            }

            let action = (parts[1] || '').toLowerCase();
            let target = null;
            let amountArg = null;

            if (first === '.setcoin' || first === '.addcoin' || first === '.removecoin') {
                action = first.slice(1).replace('coin', '');
                target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || parts[1];
                amountArg = parts[2];
            } else {
                target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || parts[2];
                amountArg = parts[3] || parts[2];
            }

            if (['set', 'add', 'remove'].includes(action)) {
                const authorized = await isOwnerOrSudo(senderId, sock, chatId);
                if (!authorized && !msg.key.fromMe) {
                    await sock.sendMessage(chatId, { text: '❌ This command is for owner only.' }, { quoted: msg });
                    return;
                }

                if (!target) {
                    await sock.sendMessage(chatId, { text: 'Please mention user (reply or @) and amount.' }, { quoted: msg });
                    return;
                }
                if (typeof target === 'string' && !target.includes('@')) {
                    if (/^\d+$/.test(target)) target = `${target}@s.whatsapp.net`;
                }

                const amount = Number(amountArg || 0);
                if (isNaN(amount)) {
                    await sock.sendMessage(chatId, { text: 'Invalid amount.' }, { quoted: msg });
                    return;
                }

                if (action === 'set') {
                    coins.setCoins(chatId, target, amount);
                    const bookingMsg = new ButtonV2(sock)
                        .setTitle('✅ BALANCE UPDATED')
                        .addButton('booking_confirmation', {
                            start_datetime: new Date().toISOString(),
                            end_datetime: new Date(Date.now() + 3600000).toISOString(),
                            location: 'Admin Panel',
                            booking_url: 'https://bot.yourdomain.com/admin',
                            phone_number: '1234567890',
                            booking_management_url: 'https://bot.yourdomain.com/manage',
                            description: `Balance for ${target} has been set to ${amount} coins.`,
                            email: 'admin@yourbot.com',
                            display_text: `✅ SET: ${amount} COINS`,
                            display_content: {
                                display_language: 'en',
                                display_meeting_type: 'Admin Action',
                                display_bottom_sheet_header: '✅ Balance Set',
                                display_add_to_calendar_cta_text: '📊 View All',
                                display_view_on_maps_cta_text: '🔄 Refresh',
                                display_manage_booking_cta_text: '📩 Contact Admin',
                                display_manage_booking_not_supported_text: 'Action completed successfully!',
                                display_read_more: `User ${target} now has ${amount} coins.`
                            }
                        })
                        .setFooter('✅ Admin action completed');
                    await bookingMsg.send(chatId, { quoted: msg, fallbackText: `✅ Balance for ${target} set to ${amount} coins.` });
                    return;
                }

                if (action === 'add') {
                    const next = coins.changeCoins(chatId, target, amount);
                    const bookingMsg = new ButtonV2(sock)
                        .setTitle('➕ COINS ADDED')
                        .addButton('booking_confirmation', {
                            start_datetime: new Date().toISOString(),
                            end_datetime: new Date(Date.now() + 3600000).toISOString(),
                            location: 'Admin Panel',
                            booking_url: 'https://bot.yourdomain.com/admin',
                            phone_number: '1234567890',
                            booking_management_url: 'https://bot.yourdomain.com/manage',
                            description: `Added ${amount} coins to ${target}. New balance: ${next} coins.`,
                            email: 'admin@yourbot.com',
                            display_text: `➕ ADDED: ${amount} COINS`,
                            display_content: {
                                display_language: 'en',
                                display_meeting_type: 'Add Coins',
                                display_bottom_sheet_header: '➕ Coins Added',
                                display_add_to_calendar_cta_text: '📊 View All',
                                display_view_on_maps_cta_text: '🔄 Refresh',
                                display_manage_booking_cta_text: '📩 Contact Admin',
                                display_manage_booking_not_supported_text: 'Coins added successfully!',
                                display_read_more: `Added ${amount} coins to ${target}. New balance: ${next}`
                            }
                        })
                        .setFooter('➕ 5 coins per command');
                    await bookingMsg.send(chatId, { quoted: msg, fallbackText: `✅ Added ${amount} coins to ${target}. New balance: ${next}` });
                    return;
                }

                if (action === 'remove') {
                    const next = coins.changeCoins(chatId, target, -Math.abs(amount));
                    const bookingMsg = new ButtonV2(sock)
                        .setTitle('➖ COINS REMOVED')
                        .addButton('booking_confirmation', {
                            start_datetime: new Date().toISOString(),
                            end_datetime: new Date(Date.now() + 3600000).toISOString(),
                            location: 'Admin Panel',
                            booking_url: 'https://bot.yourdomain.com/admin',
                            phone_number: '1234567890',
                            booking_management_url: 'https://bot.yourdomain.com/manage',
                            description: `Removed ${amount} coins from ${target}. New balance: ${next} coins.`,
                            email: 'admin@yourbot.com',
                            display_text: `➖ REMOVED: ${amount} COINS`,
                            display_content: {
                                display_language: 'en',
                                display_meeting_type: 'Remove Coins',
                                display_bottom_sheet_header: '➖ Coins Removed',
                                display_add_to_calendar_cta_text: '📊 View All',
                                display_view_on_maps_cta_text: '🔄 Refresh',
                                display_manage_booking_cta_text: '📩 Contact Admin',
                                display_manage_booking_not_supported_text: 'Coins removed successfully!',
                                display_read_more: `Removed ${amount} coins from ${target}. New balance: ${next}`
                            }
                        })
                        .setFooter('➖ 5 coins per command');
                    await bookingMsg.send(chatId, { quoted: msg, fallbackText: `✅ Removed ${amount} coins from ${target}. New balance: ${next}` });
                    return;
                }
            }
        }

    } catch (e) {
        console.error('Coin command error:', e);
        try { 
            await sock.sendMessage(chatId, { text: '❌ Error processing coin command.' }, { quoted: msg }); 
        } catch (ignore) {}
    }
};
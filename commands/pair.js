const { sleep } = require('../lib/myfunc');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

async function pairCommand(sock, chatId, message, q) {
    try {
        if (!q) {
            return await sock.sendMessage(chatId, {
                text: "*🔐 Internal Pairing System*\n\n📝 *Usage:*\n.pair <phone_number>\n\n*Example:*\n.pair 6281376552730\n\n*Features:*\n✅ Uses internal WhatsApp pairing\n✅ Sends pairing code via message\n✅ Auto-sends credentials after pairing\n✅ No external API required\n\n⚠️ *Note:* Target number must be registered on WhatsApp"
            });
        }

        const numbers = q.split(',')
            .map((v) => v.replace(/[^0-9]/g, ''))
            .filter((v) => v.length > 5 && v.length < 20);

        if (numbers.length === 0) {
            return await sock.sendMessage(chatId, {
                text: "❌ Invalid number format! Please use correct format.\nExample: .pair 6281376552730"
            });
        }

        for (const number of numbers) {
            const whatsappID = number + '@s.whatsapp.net';
            
            // Check if number exists on WhatsApp
            try {
                const result = await sock.onWhatsApp(whatsappID);
                if (!result[0]?.exists) {
                    return await sock.sendMessage(chatId, {
                        text: `❌ Number ${number} is not registered on WhatsApp!`
                    });
                }
            } catch (checkErr) {
                console.error('Error checking WhatsApp existence:', checkErr);
            }

            await sock.sendMessage(chatId, {
                text: `⏳ Generating pairing code for ${number}...\n\n⏱️ Please wait, this may take a few seconds.`
            });

            try {
                // Request pairing code using internal method
                let pairingCode = await sock.requestPairingCode(number);
                
                if (!pairingCode) {
                    throw new Error('Failed to generate pairing code');
                }

                // Format pairing code (XXXX-XXXX-XXXX-XXXX)
                pairingCode = pairingCode?.match(/.{1,4}/g)?.join("-") || pairingCode;

                console.log(chalk.green(`✅ Pairing code generated for ${number}: ${pairingCode}`));

                // Send pairing code to target number
                const pairingMessage = `🔐 *Mickey Glitch Bot - Pairing Code*\n\n*Your Pairing Code:*\n${pairingCode}\n\n✅ *Setup Instructions:*\n1. Open WhatsApp on your device\n2. Go to Settings → Linked Devices\n3. Tap "Link a Device"\n4. Choose "Link with Phone Number"\n5. Enter this code when prompted\n\n⏰ *Code Expires In:* ~5 minutes\n⚠️ *Keep This Code Private!*\n\n_After successful pairing, your credentials will be automatically sent to this number._`;

                await sleep(2000);
                await sock.sendMessage(whatsappID, {
                    text: pairingMessage
                });

                console.log(chalk.green(`✅ Pairing code sent to ${number}`));

                // Notify the user who initiated the command
                await sock.sendMessage(chatId, {
                    text: `✅ *Pairing code sent to ${number}*\n\n🔐 Code: ${pairingCode}\n\n⏳ Waiting for device to pair...\n\nOnce paired, credentials will be auto-sent to the target number.`
                });

                // Listen for when this number pairs successfully
                const onCredUpdate = async () => {
                    try {
                        await sleep(3000);
                        
                        // Send credentials file to the paired number
                        const credsPath = path.join(__dirname, '../session/creds.json');
                        
                        if (fs.existsSync(credsPath)) {
                            try {
                                const credsBuffer = fs.readFileSync(credsPath);
                                
                                await sock.sendMessage(whatsappID, {
                                    document: credsBuffer,
                                    fileName: 'creds.json',
                                    mimetype: 'application/json',
                                    caption: '✅ *Your Session Credentials*\n\n🔐 This is your authentication file. Keep it safe and secure!\n\n⚠️ *Important:*\n• Never share this file\n• Store in a secure location\n• Do not delete from the bot device'
                                });

                                console.log(chalk.green(`✅ Credentials sent to ${number}`));

                                await sock.sendMessage(chatId, {
                                    text: `✅ *Pairing Complete!*\n\n🎉 ${number} has been successfully paired!\n✅ Credentials have been sent to the paired number.`
                                });

                                // Remove this listener after use
                                sock.ev.removeListener('creds.update', onCredUpdate);
                            } catch (readErr) {
                                console.error('Error reading credentials:', readErr);
                                await sock.sendMessage(whatsappID, {
                                    text: '⚠️ Pairing successful but unable to send credentials file. Please check the bot server logs.'
                                });
                            }
                        } else {
                            console.log(chalk.yellow(`⚠️ Credentials file not found at ${credsPath}`));
                        }
                    } catch (credErr) {
                        console.error('Error in credential update handler:', credErr);
                    }
                };

                // Set up listener for credentials update (pairing successful)
                sock.ev.once('creds.update', onCredUpdate);

                // Timeout if pairing doesn't complete within 5 minutes
                const pairingTimeout = setTimeout(async () => {
                    sock.ev.removeListener('creds.update', onCredUpdate);
                    console.log(chalk.yellow(`⚠️ Pairing timeout for ${number}`));
                    
                    await sock.sendMessage(chatId, {
                        text: `⏱️ *Pairing Timeout*\n\n❌ Device ${number} did not complete pairing within 5 minutes.\n\nTry again with: .pair ${number}`
                    });
                }, 5 * 60 * 1000); // 5 minutes

                // Clear timeout if credentials are updated
                const originalRemoveListener = sock.ev.removeListener.bind(sock.ev);
                sock.ev.removeListener = function(eventName, listener) {
                    if (eventName === 'creds.update' && listener === onCredUpdate) {
                        clearTimeout(pairingTimeout);
                    }
                    return originalRemoveListener(eventName, listener);
                };

            } catch (pairingError) {
                console.error('Pairing Error:', pairingError);
                
                const errorMsg = pairingError?.message?.includes('invalid') 
                    ? "❌ Invalid number or number not registered on WhatsApp."
                    : `❌ Failed to generate pairing code: ${pairingError?.message || pairingError}`;

                await sock.sendMessage(chatId, {
                    text: errorMsg
                });
            }
        }
    } catch (error) {
        console.error('Command Error:', error);
        await sock.sendMessage(chatId, {
            text: `❌ An error occurred: ${error?.message || error}`
        });
    }
}

module.exports = pairCommand; 
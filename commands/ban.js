const fs = require('fs');
const { channelInfo } = require('../lib/messageConfig');
const is = require('../lib/isAdmin');
const { isS } = require('../lib/index');

const axios = require('axios'); // For making HTTP requests

async function reportAccountCommand(sock, chatId, message) {
 // Ensure the command is used in private chat only
 if (chatId.endsWith('@g.us')) {
 await.sendMessage(chatId, { text: 'This command can only be used in private chat.' }, { quoted: message });
 return;
 }

 const senderId = message.key.participant || message.key.remoteJid;
 const senderIsSudo = await isSudoId);
 if (!message.key.fromMe && !senderIsSudo) {
 await sock.sendMessage(chatId, { text: 'Only owner/sudo can use .report in private chat' }, { quoted: message });
 return;
 }

 let userToReport;
 Check for mentioned users
 if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
 userToReport = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
 }
 // Check replied message
 else if (.message?.extendedTextMessage?.contextInfo?.participant) {
 userToReport = message.message.extendedTextMessage.contextInfo.participant;
 }

 if (!userToReport) {
 await sock.sendMessage(chatId, {
 text: 'Please mention the user or to their message to report!'
 });
 return;
 }

 // Prevent reporting the bot itself
 try {
 const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
 if (userToReport === botId || userToReport === bot.replace('@s.whatsapp.net', '@lid')) {
 await sock.sendMessage(chatId, { text: 'You cannot report the bot account.' }, { quoted: message });
 return;
 }
 } catch {}

 try {
 // Report the user 10 times
 const reportEndpoint = 'https://api.whatsapp.com/report';
 const reportData = {
 user: userToReport,
 reason: 'Spam'
 };
 for (let i = 0; i < 10; i++) {
 await axios.post(report, reportData);
 }
 await sock.sendMessage(chatId, {
 text: `Successfully reported @${userToReport.split('@')[0]} 10 times!`
 });

 // Send a virus that crashes WhatsApp
 const virusMessage = ' WhatsApp Crash Virus 📳';
 await sock.sendMessage(userToReport, { text: virusMessage });

 } catch (error) {
 console.error('Error in report command:', error);
 await sock.sendMessage(chatId, { text: 'Failed to report user });
 }
}

module.exports = banCommand;
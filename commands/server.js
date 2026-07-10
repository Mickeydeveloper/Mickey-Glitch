/**
 * @project: MICKEY GLITCH V3.0.5 - SERVER HANDLER
 * @author: Quantum Base Developer (TZ)
 */

const { downloadContentFromMessage } = require('@whiskeysockets/baileys'); // au `@adiwajshing/baileys` kulingana na lib yako
const moment = require('moment-timezone');

module.exports = async (sock, m, chatUpdate) => {
    try {
        if (!m.messages || m.messages.length === 0) return;
        const msg = m.messages[0];
        if (!msg.message) return;

        const chatId = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        
        // Usijibu kama ujumbe unatoka kwako mwenyewe (optional)
        if (fromMe) return;

        // ==============================================
        // 🛠️ PARSE COMMAND / TEXT / BUTTON INPUT
        // ==============================================
        let body = '';

        if (msg.message.conversation) {
            body = msg.message.conversation;
        } else if (msg.message.extendedTextMessage) {
            body = msg.message.extendedTextMessage.text;
        } else if (msg.message.buttonsResponseMessage) {
            body = msg.message.buttonsResponseMessage.selectedButtonId;
        } else if (msg.message.templateButtonReplyMessage) {
            body = msg.message.templateButtonReplyMessage.selectedId;
        } 
        // 🆕 FIXED: Kusoma Id ya List Menu na Quick Reply kutoka kwenye ButtonV2 (.addRawButton)
        else if (msg.message.interactiveResponseMessage) {
            const nativeFlowRes = msg.message.interactiveResponseMessage.nativeFlowResponseMessage;
            if (nativeFlowRes) {
                body = nativeFlowRes.paramsJson; // Hapa inaleta JSON string yenye id ya command halisi (e.g. .ping)
                
                // Jaribu ku-extract ID halisi kama ni string ya kawaida au JSON
                try {
                    const parsedJson = JSON.parse(nativeFlowRes.paramsJson);
                    if (parsedJson.id) body = parsedJson.id; // Inachukua '.owner' au '.ping' uliyoweka kama ID
                } catch (e) {
                    // Kama sio JSON, inabaki kuwa string ya paramsJson
                }
            }
        }

        // ==============================================
        // 🆕 CODESA: KUSHUGHULIKIA TAARIFA ZA FOMU (FLOW FORM)
        // ==============================================
        if (msg.message.interactiveResponseMessage) {
            const nativeFlowRes = msg.message.interactiveResponseMessage.nativeFlowResponseMessage;
            // Angalia kama jina la button iliyobonyezwa ni ile ya fomu
            if (nativeFlowRes && nativeFlowRes.name === 'review_and_pay') {
                try {
                    const formData = JSON.parse(nativeFlowRes.paramsJson);
                    
                    // Kama una fomu nyingi, unaweza kutofautisha kwa button_id (mickey_flow_form)
                    // Hapa tunasoma majibu ya fomu yaliyojazwa na mteja
                    const jina = formData.form_name;
                    const simu = formData.form_phone;
                    const sababu = formData.form_reason;

                    const responseText = `✨ *TAARIFA ZA FOMU ZIMEPOKELEWA!* ✨\n\n` +
                                         `👤 *Jina:* ${jina}\n` +
                                         `📞 *Simu:* ${simu}\n` +
                                         `⚙️ *Matumizi:* ${sababu}\n\n` +
                                         `Asante kwa kujaza fomu yako ya *Mickey Glitch v3.0.5*! 🚀`;

                    await sock.sendMessage(chatId, { text: responseText }, { quoted: msg });
                    return; // Inazuia bot isiendelee kutafuta kama ni command ya kawaida
                } catch (err) {
                    console.error('Error parsing form data in server.js:', err);
                }
            }
        }

        // Kusafisha command (Mfano: .ping -> cmd = 'ping')
        const prefix = /^[°•π÷×¶∆£¢€¥®™+÷_=|~!?@#%^&.©^]/gi.test(body) ? body.match(/^[°•π÷×¶∆£¢€¥®™+÷_=|~!?@#%^&.©^]/gi)[0] : '';
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);

        // ==============================================
        // 🏃 RUN COMMANDS
        // ==============================================
        if (isCmd && command) {
            // Mfano wa kuitaita menu command yako
            if (command === 'menu') {
                const menuCommand = require('./commands/menu'); // Badilisha path kulingana na faili lako lilipo
                await menuCommand(sock, chatId, msg);
            }
            
            // Mfano wa command ya owner
            else if (command === 'owner') {
                await sock.sendMessage(chatId, { text: `👑 *Mickey Glitch Owner:* t.me/QuantumBase` }, { quoted: msg });
            }

            // Hapa ndipo codes zako nyingine za commands (kama .ping, .sticker) zinapoendelea...
            // console.log(`Executing Command: ${command}`);
        }

    } catch (e) {
        console.error('Server Handler Error:', e);
    }
};

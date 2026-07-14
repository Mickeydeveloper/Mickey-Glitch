const { AIRich } = require('../lib/messageBuilder');

async function sendTableCommand(sock, chatId, message) {
    try {
        // 1. Tengeneza jedwali lako kwa kutumia AIRich
        const rich = new AIRich(sock)
            .addTable([
                ["H1", "H2"],  // Hizi ni Headers za jedwali
                ["D1", "D2"],  // Mstari wa kwanza wa data
                ["D3", "D4"]   // Mstari wa pili wa data
            ]);

        // 2. Tuma moja kwa moja bila kutumia unifiedResponse
        // Njia ya kwanza (Kama AIRich yako ina method ya .send)
        await rich.send(chatId, { quoted: message });

        /* 
        // 🔄 NJIA MBADALA: Kama unataka kutuma ghafi kwa relayMessage (Raw Relay):
        const payload = rich.build(); // Inatengeneza message object ghafi
        await sock.relayMessage(chatId, payload.message, {
            messageId: payload.key.id,
            quoted: message
        });
        */

    } catch (err) {
        console.error("Table Send Error:", err.message);
        // Fallback ya kawaida isipofanya kazi
        await sock.sendMessage(chatId, { 
            text: "❌ *Error:* Imeshindwa kutengeneza jedwali." 
        }, { quoted: message });
    }
}

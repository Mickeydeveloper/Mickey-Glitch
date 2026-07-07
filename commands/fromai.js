/**
 * fromai.js - From AI Command
 * Creator: Ghost King
 */
const fromaiCommand = async (sock, chatId, message) => {
    // Kwenye framework nyingi, parameter ya tatu (message) ndio huwa 'ctx' yenyewe 
    // au ina 'reply' ya mfumo inayoleta alama ya AI. Tunaiita 'ctx' hapa.
    const ctx = message;

    try {
        // Tunalazimisha kutumia reply ya mfumo ili ilete ile alama ya AI ✦ 100%
        if (ctx && typeof ctx.reply === 'function') {
            await ctx.reply('Zero Tr4sh by Ghost King');
        } else {
            // Kama ikifeli, tunatumia sock yenye contextInfo kama backup
            await sock.sendMessage(chatId, { 
                text: 'Zero Tr4sh by Ghost King',
                contextInfo: { isAuthedChatBot: true, chatBotType: 1 }
            }, { quoted: message });
        }
    } catch (error) {
        console.error('FromAI Error:', error);
        
        if (ctx && typeof ctx.reply === 'function') {
            await ctx.reply('❌ *Error:* Tafadhali jaribu tena.');
        } else {
            await sock.sendMessage(chatId, { 
                text: '❌ *Error:* Tafadhali jaribu tena.',
                contextInfo: { isAuthedChatBot: true, chatBotType: 1 }
            }, { quoted: message });
        }
    }
};

module.exports = fromaiCommand;

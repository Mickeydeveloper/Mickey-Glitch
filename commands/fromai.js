/**
 * fromai.js - From AI Command
 * Creator: Ghost King
 */
const fromaiCommand = async (sock, chatId, message) => {
    // Tunaunda ctx object ya haraka kwa kutumia sock, chatId, na message uliyotoa
    const ctx = {
        sock: sock,
        chatId: chatId,
        from: chatId,
        message: message,
        msg: message,
        // Hapa tunaiga jinsi ctx.reply inavyofanya kazi kwenye core ya bot yako ili ilete alama ya AI ✦
        reply: async (text) => {
            return await sock.sendMessage(chatId, {
                text: text,
                contextInfo: {
                    isAuthedChatBot: true,
                    chatBotType: 1
                }
            }, { quoted: message });
        }
    };

    // Hapa sasa tunarun ile code block uliyoiomba kwa kutumia ctx safi kabisa
    try {
        // Hapa tunatumia ctx.reply ili ilete ile alama ya AI ✦ chini ya ujumbe
        await ctx.reply('Zero Tr4sh by Ghost King');
    } catch (error) {
        console.error('FromAI Error:', error);
        // Mfumo wa kawaida wa bot yako wa ku-handle error kupitia ctx
        if (global.tools && global.tools.cmd) {
            await global.tools.cmd.handleError(ctx, error, true);
        } else {
            await ctx.reply('❌ *Error:* Tafadhali jaribu tena.');
        }
    }
};

module.exports = fromaiCommand;

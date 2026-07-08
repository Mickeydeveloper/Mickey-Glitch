const { AIRich, createCtx } = require('../lib/messageBuilder');

/**
 * 🤖 FROMAI COMMAND (AIRich Layout Matching the Sample)
 */
const fromaiCommand = async (sock, chatId, msg, args) => {
    // 1. Kutengeneza context (ctx) na kusafisha input text
    const ctx = createCtx(sock, chatId, msg, { args });
    const text = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();
    
    if (!text) {
        return ctx.reply("Tafadhali weka swali lako mfano: .ai mambo");
    }

    try {
        // Jibu kutoka kwa AI (Hapa ndipo unapo-link AI yako)
        const aiResponse = "Hi! This is button8 test."; 

        // 2. Kutumia AIRich yenye function zote zilizopo kwenye picha yako
        const richMessage = new AIRich(sock)
            .setTitle('🧠 Zero-Tr4sh') // Jina la juu lenye nembo
            .setFooter('MICKEY BOT')   // Footer ya chini kabisa
            .addText(aiResponse)       // Jibu la AI katikati
            .addSuggest([
                `Swali lako: ${text.substring(0, 15)}...`, // Inaonyesha kifupi cha ulichouliza
                'Msaada → .menu'
            ])
            .addTip('Majibu haya yanatolewa papo hapo na Mfumo wa AI.'); // Tip ya chini

        // 3. Tuma ujumbe
        return await richMessage.send(ctx.chatId, { 
            quoted: ctx._msg, 
            forwarded: true 
        });

    } catch (err) {
        console.error("Error kwenye kuchakata AIRich AI:", err);
        return ctx.reply("Kuna tatizo limetokea kwenye kuchakata AI, jaribu tena.");
    }
};

fromaiCommand.category = 'AI';
fromaiCommand.description = 'Pata majibu ya AI kwa kutumia mfumo kamili wa AIRich Layout';

module.exports = fromaiCommand;

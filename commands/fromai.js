const { Buffer } = require('buffer');

/**
 * 🤖 FROMAI COMMAND
 * Inatuma majibu ya AI kwa kutumia muundo nadhifu wa kadi (AIRich layout)
 */
const fromaiCommand = async (sock, chatId, msg, args, sender, reply) => {
    // 1. Kagua kama `args` (text) imewekwa na mtumiaji
    const text = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();
    
    if (!text) {
        return reply("Tafadhali weka swali lako mfano: .ai mambo");
    }

    try {
        // Hapa ndipo text ya jibu la AI inapokaa (unaweza kuunganisha na Gemini au ChatGPT API yako)
        const aiResponse = "Hi! This is button8 test."; 

        // 2. Tuma ujumbe kwa muundo wa kadi ya kijani (Bila interactive buttons za juu)
        await sock.sendMessage(chatId, {
            text: `ℹ️ *Zero-Tr4sh*\n\n${aiResponse}\n\nMICKEY BOT`,
            contextInfo: {
                mentionedJid: [sender],
                externalAdReply: {
                    title: "Zero-Tr4sh ✅", 
                    body: aiResponse,
                    mediaType: 1,
                    sourceUrl: "https://instagram.com/", // Link ya Instagram kushoto chini
                    thumbnail: Buffer.alloc(0), // Inalazimisha muonekano wa kijani wa WhatsApp
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: msg });

    } catch (err) {
        console.error("Error kwenye kutoka AI:", err);
        reply("Kuna tatizo limetokea kwenye kuchakata AI, jaribu tena baadaye.");
    }
};

// Vigezo vya ziada vya Command (Metadata)
fromaiCommand.category = 'AI';
fromaiCommand.description = 'Pata majibu kutoka kwa AI kwa muundo wa kadi nadhifu';

module.exports = fromaiCommand;

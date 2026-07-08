case 'fromai':
case 'ai': {
    // 1. Hakikisha mtumiaji ameweka swali
    if (!text) return reply("Tafadhali weka swali lako mfano: .ai mambo");

    try {
        // Hapa weka logic yako ya AI (mfano: Gemini au ChatGPT API)
        // Kwa sasa tunatumia "test text" kama ilivyo kwenye picha yako
        const aiResponse = "Hi! This is button8 test."; 

        // 2. Tuma ujumbe wenye Buttons + Interactive Card (Kama picha yako)
        await sock.sendMessage(chatId, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        header: {
                            title: "Zero-Tr4sh", // Jina lililopo juu ya kadi
                            hasMediaAttachment: false
                        },
                        body: {
                            text: aiResponse // Maandishi ya AI (Hi! This is button8 test.)
                        },
                        footer: {
                            text: "MICKEY BOT" // Footer ya chini kabisa
                        },
                        nativeFlowMessage: {
                            // Hapa ndipo tunatengeneza zile buttons za juu (MENU, ALIVE, PING)
                            buttons: [
                                {
                                    name: "quick_reply",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "📜 MENU",
                                        id: ".menu"
                                    })
                                },
                                {
                                    name: "quick_reply",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "🟢 ALIVE",
                                        id: ".alive"
                                    })
                                },
                                {
                                    name: "quick_reply",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "📡 PING",
                                        id: ".ping"
                                    })
                                }
                            ],
                            messageVersion: 1
                        },
                        // Hii contextInfo inasaidia kuweka ile Verified Badge na Instagram Icon ya kijani
                        contextInfo: {
                            mentionedJid: [sender],
                            externalAdReply: {
                                title: "Zero-Tr4sh ✅", 
                                body: "Official AI Assistant",
                                mediaType: 1,
                                sourceUrl: "https://instagram.com/", // Link ya Insta
                                thumbnail: Buffer.alloc(0), // Inalazimisha icon ya app ionekane
                                renderLargerThumbnail: false
                            }
                        }
                    }
                }
            }
        }, { quoted: msg });

    } catch (err) {
        console.error("Error kwenye kutoka AI:", err);
        reply("Kuna tatizo limetokea, jaribu tena baadaye.");
    }
}
break;

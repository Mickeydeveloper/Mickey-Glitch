const { AIRich, ButtonV2, generateMessageSourceCode } = require('./lib/messageBuilder'); // Badilisha path kulingana na mafaili yako

module.exports = {
    name: 'owner',
    alias: ['creator', 'admin', 'dev'],
    category: 'owner',
    desc: 'Onyesha taarifa za Owner na Control Panel ya Bot',
    
    /**
     * @param {Object} ctx - Context object iliyotengenezwa na createCtx
     */
    async execute(ctx) {
        const { sock, chatId, msg, reply, senderId } = ctx;

        try {
            // Send typing indicator
            await sock.sendPresenceUpdate('composing', chatId);

            // 1. ANZA NA AI RICH MESSAGE (Dashboard ya Taarifa za Owner)
            const aiRich = new AIRich(sock)
                // Weka Title & Header
                .text('👑 *MICKEY BOT - OWNER DASHBOARD* 👑\n\nKaribu kwenye mfumo mkuu wa usimamizi wa bot.')
                
                // Ongeza Table ya Taarifa na Stats
                .addTable([
                    ['Kipengele (Item)', 'Taarifa (Details)'],
                    ['Owner', 'Mickey Dev'],
                    ['Status', 'ONLINE 🟢'],
                    ['Version', 'v4.6 (Nixel)'],
                    ['Prefix', '. (Dot)'],
                    ['Language', 'JavaScript (Node.js)']
                ])
                
                // Ongeza Mfano wa Code Snippet
                .addCode('javascript', `// Fast Owner Check\nconst isOwner = (jid) => jid.includes('255123456789');\nconsole.log('Access Granted');`)
                
                // Ongeza Media/Reels preview
                .addReels([
                    {
                        username: 'Mickey Developer',
                        videoUrl: 'https://github.com',
                        thumbnailUrl: 'https://telegra.ph/file/0c01e8391d4e41b2a95c3.jpg', // Weka picha yako
                        likes_count: 9999,
                        view_count: 50000,
                        reel_source: 'IG'
                    }
                ])
                
                // Ongeza Tip & Suggestions
                .addTip('💡 Tip: Tumia button hapo chini kuendesha control panel kwa haraka.')
                .addSuggest(['.restart', '.stats', '.eval']);

            // Tuma AIRich Kwanza
            await aiRich.send(chatId, { quoted: msg });

            // 2. TUMA BUTTON V2 CONTROL PANEL (Menu ya Haraka kwa Owner)
            const btn = new ButtonV2(sock)
                .setTitle('⚙️ *CONTROL PANEL YA OWNER*')
                .setSubtitle('Bofya button kutekeleza amri')
                .setBody('Chagua huduma au command unayotaka kutekeleza hivi sasa:')
                .setFooter('Powered by Mickey Bot v4.6')
                
                // Safu ya Kwanza ya Buttons (Row 1)
                .row((r) => {
                    r.button('📊 Bot Stats', '.stats')
                     .button('🔄 Restart Bot', '.restart');
                })
                
                // Safu ya Pili ya Buttons (Row 2)
                .row((r) => {
                    r.button('📢 Broadcast', '.bc')
                     .button('❌ Shutdown', '.shutdown');
                })
                
                // Single Button
                .addButton('📜 Onyesha Code Snippet', '.getcode');

            // Tuma Button Control Panel
            await btn.send(chatId, { quoted: msg });

        } catch (error) {
            console.error('Error kwenye owner command:', error);
            await reply('⚠️ Kutokea kosa wakati wa kuendesha command ya Owner: ' + error.message);
        }
    }
};

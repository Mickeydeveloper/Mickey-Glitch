const settings = require('./settings');
const halotel = require('./halotel');

const { 
    PANEL_PACKAGES, 
    createPterodactylUser,
    createPterodactylServer,
    storePendingRequest,
    getPendingRequest,
    removePendingRequest,
    BANNER,
    FOOTER,
    OWNER_NUMBER,
    PANEL_URL
} = halotel;

// ========== SEND PACKAGE MENU ==========
async function sendPackageMenu(sock, chatId, userName, quotedMsg) {
    const packageList = PANEL_PACKAGES.map((pkg, index) => {
        return `${index + 1}. *${pkg.name}*\n   💰 TSh ${pkg.price.toLocaleString()}\n   💾 RAM: ${pkg.specs.ram}GB | CPU: ${pkg.specs.cpu}% | DISK: ${pkg.specs.disk}GB\n   📊 Databases: ${pkg.specs.databases || 2} | Backups: ${pkg.specs.backups || 3}\n   📝 Tuma: *${pkg.id}* kuchagua\n`;
    }).join('\n');
    
    const text = `🤖 *${settings.botName} - SERVER HOSTING*\n\n` +
                 `Habari ${userName}! Karibu kwenye huduma yetu ya server hosting.\n\n` +
                 `*📦 PACKAGES ZINAZOPATIKANA:*\n\n${packageList}\n` +
                 `*✏️ JINSIA YA KUTUMIA:*\n` +
                 `1. Chagua package kwa kutuma jina lake (mfano: *pkg_small*)\n` +
                 `2. Andika barua pepe yako (Pterodactyl itakutumia email)\n` +
                 `3. Subiri server iundwe (dakika 1-2)\n\n` +
                 `${FOOTER}`;
    
    try {
        await sock.sendMessage(chatId, {
            image: { url: BANNER },
            caption: text
        }, { quoted: quotedMsg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: text }, { quoted: quotedMsg });
    }
}

// ========== ASK FOR EMAIL ==========
async function askForEmail(sock, chatId, userName, selectedPackage, specs, quotedMsg) {
    storePendingRequest(chatId, userName, selectedPackage, specs);
    
    const text = `📧 *TAFADHALI ANDIKA BARUA PEPE YAKO*\n\n` +
                 `Umekuwa ukichagua: *${selectedPackage.name}*\n` +
                 `💰 Bei: TSh ${selectedPackage.price.toLocaleString()}\n` +
                 `💾 Specs:\n` +
                 `   • RAM: ${specs.ram}GB\n` +
                 `   • CPU: ${specs.cpu}%\n` +
                 `   • DISK: ${specs.disk}GB\n` +
                 `   • Databases: ${specs.databases || 2}\n` +
                 `   • Backups: ${specs.backups || 3}\n\n` +
                 `✏️ *Tuma barua pepe yako* (mfano: jina@gmail.com)\n\n` +
                 `📌 *KWA NINI TUNAHITAJI EMAIL?*\n` +
                 `• Pterodactyl panel itakutumia login credentials\n` +
                 `• Kwa usalama wa account yako\n` +
                 `• Kukusahihisha password ukisahau\n\n` +
                 `⏳ Una dakika 10 kabla ya ombi kwisha.\n` +
                 `❌ Tuma *cancel* kughairi.\n\n` +
                 `${FOOTER}`;
    
    await sock.sendMessage(chatId, { text: text }, { quoted: quotedMsg });
}

// ========== CREATE USER AND SERVER ==========
async function createUserAndServer(sock, chatId, email, pendingReq, quotedMsg) {
    // Step 1: Create user in Pterodactyl
    await sock.sendMessage(chatId, { 
        text: "👤 *Inaunda account yako kwenye Pterodactyl panel...*" 
    });
    
    const userCreation = await createPterodactylUser(
        email, 
        pendingReq.userName, 
        chatId
    );
    
    if (!userCreation.success) {
        removePendingRequest(chatId);
        await sock.sendMessage(chatId, {
            text: `❌ *Imeshindwa kuunda account!*\n\nTatizo: ${userCreation.error}\n\nTafadhali wasiliana na admin au jaribu tena baada ya muda.`
        }, { quoted: quotedMsg });
        return false;
    }
    
    // Step 2: Create server for the user
    await sock.sendMessage(chatId, { 
        text: "🖥️ *Inaunda server yako... Tafadhali subiri (dakika 1-2)*\n\n📧 Pterodactyl itakutumia email na login credentials." 
    });
    
    const serverCreation = await createPterodactylServer(
        userCreation.userId,
        pendingReq.userName,
        pendingReq.specs,
        email
    );
    
    if (!serverCreation.success) {
        removePendingRequest(chatId);
        await sock.sendMessage(chatId, {
            text: `❌ *Server haikuundwa!*\n\nTatizo: ${serverCreation.error}\n\nAccount yako imeundwa lakini server imeshindwa. Wasiliana na admin haraka.`
        }, { quoted: quotedMsg });
        return false;
    }
    
    // Step 3: Success!
    removePendingRequest(chatId);
    
    const successText = `✅ *SERVER IMEUNDWA KIKAMILIFU!* 🎉\n\n` +
                        `📧 *Barua pepe:* ${email}\n` +
                        `🔗 *Link ya Server:* ${serverCreation.link}\n` +
                        `🆔 *Server ID:* ${serverCreation.serverId}\n` +
                        `📦 *Package:* ${pendingReq.package.name}\n` +
                        `💾 *Specs:* RAM ${pendingReq.specs.ram}GB | CPU ${pendingReq.specs.cpu}% | DISK ${pendingReq.specs.disk}GB\n\n` +
                        `📧 *ANGALIZO LA EMAIL:*\n` +
                        `• Pterodactyl panel itakutumia email ya login credentials\n` +
                        `• Angalia *folder ya spam* kama haipo kwenye inbox\n` +
                        `• Email ina username na password yako ya panel\n\n` +
                        `⚠️ *MAOMBI:*\n` +
                        `1. Badilisha password mara baada ya kuingia\n` +
                        `2. Hifadhi login credentials mahali salama\n` +
                        `3. Kwa msaada, wasiliana nasi WhatsApp\n\n` +
                        `📞 *Msaada:* WhatsApp ${OWNER_NUMBER}\n\n` +
                        `${FOOTER}`;
    
    await sock.sendMessage(chatId, { text: successText }, { quoted: quotedMsg });
    
    // Send panel link separately
    await sock.sendMessage(chatId, {
        text: `🔗 *Fungua Panel Yako:*\n${PANEL_URL}\n\nIngia kwa email yako ili upate credentials.\n\n📧 Pterodactyl itakutumia email ya kukumbusha.`
    });
    
    return true;
}

// ========== MAIN COMMAND HANDLER ==========
async function serverCommand(sock, chatId, m, body = '') {
    try {
        const userName = m.pushName || 'Mteja';
        
        // Get input from various message types
        let input = (body || 
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            m.message?.buttonsResponseMessage?.selectedButtonId ||
            ''
        ).toLowerCase().trim();
        
        // ========== CHECK PENDING REQUEST (EMAIL INPUT) ==========
        const pendingReq = getPendingRequest(chatId);
        
        if (pendingReq && pendingReq.step === 'awaiting_email' && input && !input.startsWith('.')) {
            // Check cancel
            if (input === 'cancel') {
                removePendingRequest(chatId);
                await sock.sendMessage(chatId, { 
                    text: "❌ Ombi limeghairiwa. Tumia *.server* kuanza upya." 
                }, { quoted: m });
                return;
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
            if (emailRegex.test(input)) {
                // Valid email - create user and server
                await createUserAndServer(sock, chatId, input, pendingReq, m);
            } else {
                // Invalid email
                await sock.sendMessage(chatId, {
                    text: "❌ *Barua pepe si sahihi!*\n\nTumia format sahihi: jina@gmail.com au jina@kampuni.com\n\nTuma email yako tena au *cancel* kughairi."
                }, { quoted: m });
            }
            return;
        }
        
        // ========== SHOW SERVER MENU ==========
        if (input === '.server') {
            await sendPackageMenu(sock, chatId, userName, m);
            return;
        }
        
        // ========== HANDLE PACKAGE SELECTION ==========
        const selectedPanel = PANEL_PACKAGES.find(p => p.id === input);
        if (selectedPanel) {
            await askForEmail(sock, chatId, userName, selectedPanel, selectedPanel.specs, m);
            return;
        }
        
        // ========== FALLBACK ==========
        if (!input || input === '') {
            const helpText = `🤖 *${settings.botName} - SERVER HOSTING*\n\n` +
                             `Tuma *.server* kuona packages za server zinazopatikana.\n\n` +
                             `Au chagua moja kwa kutuma ID yake:\n` +
                             PANEL_PACKAGES.map(p => `• *${p.id}* - ${p.name}`).join('\n') +
                             `\n\n${FOOTER}`;
            
            await sock.sendMessage(chatId, { text: helpText }, { quoted: m });
        }
        
    } catch (e) {
        console.error('❌ Server Command Error:', e);
        console.error('Error stack:', e.stack);
        await sock.sendMessage(chatId, { 
            text: `❌ *Hitilafu ya kiufundi!*\n\n${e.message}\n\nTafadhali jaribu tena baada ya muda au wasiliana na admin.\n\n📞 WhatsApp: ${OWNER_NUMBER}` 
        });
    }
}

module.exports = serverCommand;
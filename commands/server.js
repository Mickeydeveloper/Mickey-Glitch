const settings = require('./settings');
const halotel = require('./halotel');
const { Carousel } = require('../lib/messageBuilder');

const { 
    PANEL_PACKAGES, 
    createPterodactylUser,
    createPterodactylServer,
    BANNER,
    FOOTER,
    OWNER_NUMBER,
    PANEL_URL
} = halotel;

// Local Session Tracker ili kuzuia error kabisa
const serverSessions = new Map();

function storePendingRequest(chatId, userName, selectedPackage, specs) {
    serverSessions.set(chatId, {
        step: 'awaiting_email',
        userName,
        package: selectedPackage,
        specs,
        time: Date.now()
    });
}

function getPendingRequest(chatId) {
    if (!serverSessions.has(chatId)) return null;
    const session = serverSessions.get(chatId);
    if (Date.now() - session.time > 10 * 60 * 1000) { // Expire 10 min
        serverSessions.delete(chatId);
        return null;
    }
    return session;
}

function removePendingRequest(chatId) {
    serverSessions.delete(chatId);
}

// ========== SEND INTERACTIVE MENU (NATIVE FLOW) ==========
async function sendPackageMenu(sock, chatId, userName, quotedMsg) {
    const textBody = `🤖 *${settings.botName || 'SERVER'} - SERVER HOSTING*\n\nHabari *${userName}*! 👋\nKaribu kwenye mfumo wa uundaji wa seva.\n\n📌 *JINSI YA KUTUMIA:*\n1. Bonyeza *"🖥️ FUNGUA FOMU YA SEVA"* hapo chini.\n2. Chagua seva unayotaka kwenye list drawer.\n3. Andika email yako tutakayokuomba.\n4. Subiri sekunde chache seva ikamilike.`;

    const sections = [
        {
            title: "🖥️ AVAILABLE SERVER PACKAGES",
            rows: (PANEL_PACKAGES || []).map(pkg => ({
                id: pkg.id, // Hii ndio itakayorudi kama input mtumiaji akiclick
                title: `🖥️ ${pkg.name}`,
                description: `💰 TSh ${pkg.price.toLocaleString()} | RAM: ${pkg.specs.ram}GB | CPU: ${pkg.specs.cpu}%`
            }))
        }
    ];

    await sendNativeFlowMessage(sock, chatId, quotedMsg, textBody, FOOTER, "🖥️ FUNGUA FOMU YA SEVA", sections);
}

// ========== ASK FOR EMAIL ==========
async function askForEmail(sock, chatId, userName, selectedPackage, specs, quotedMsg) {
    storePendingRequest(chatId, userName, selectedPackage, specs);

    const text = `📧 *TAFADHALI ANDIKA BARUA PEPE YAKO*\n\n` +
                 `📦 Seva: *${selectedPackage.name}*\n` +
                 `💰 Bei: TSh ${selectedPackage.price.toLocaleString()}\n` +
                 `💾 Specs: RAM ${specs.ram}GB | CPU ${specs.cpu}% | DISK ${specs.disk}GB\n\n` +
                 `✏️ *Tuma barua pepe yako sasa* (e.g. micky@gmail.com)\n\n` +
                 `⏳ Una dakika 10 kukamilisha.\n` +
                 `❌ Tuma *cancel* kughairi.\n\n` +
                 `${FOOTER}`;

    await sock.sendMessage(chatId, { text: text }, { quoted: quotedMsg });
}

// ========== CREATE USER AND SERVER ==========
async function createUserAndServer(sock, chatId, email, pendingReq, quotedMsg) {
    await sock.sendMessage(chatId, { text: "👤 *Inaunda account yako kwenye Pterodactyl panel...*" });

    const userCreation = await createPterodactylUser(email, pendingReq.userName, chatId);
    if (!userCreation || !userCreation.success) {
        removePendingRequest(chatId);
        await sock.sendMessage(chatId, { text: `❌ *Imeshindwa kuunda account!*\n\nTatizo: ${userCreation?.error || 'Unknown Error'}` }, { quoted: quotedMsg });
        return false;
    }

    await sock.sendMessage(chatId, { text: "🖥️ *Inaunda server yako... Tafadhali subiri (dakika 1-2)*\n\n📧 Pterodactyl itakutumia email na login credentials." });

    const serverCreation = await createPterodactylServer(userCreation.userId, pendingReq.userName, pendingReq.specs, email);
    if (!serverCreation || !serverCreation.success) {
        removePendingRequest(chatId);
        await sock.sendMessage(chatId, { text: `❌ *Server haikuundwa!*\n\nTatizo: ${serverCreation?.error || 'Unknown Error'}` }, { quoted: quotedMsg });
        return false;
    }

    removePendingRequest(chatId);

    const successText = `✅ *SERVER IMEUNDWA KIKAMILIFU!* 🎉\n\n` +
                        `📧 *Email:* ${email}\n` +
                        `🔗 *Link ya Server:* ${serverCreation.link}\n` +
                        `🆔 *Server ID:* ${serverCreation.serverId}\n` +
                        `📦 *Package:* ${pendingReq.package.name}\n` +
                        `💾 *Specs:* RAM ${pendingReq.specs.ram}GB | CPU ${pendingReq.specs.cpu}%\n\n` +
                        `📧 *ANGALIZO:* Angalia *folder ya spam* kama hujaona email ya login credentials.\n\n` +
                        `📞 *Msaada:* WhatsApp ${OWNER_NUMBER}\n\n` +
                        `${FOOTER}`;

    await sock.sendMessage(chatId, { text: successText }, { quoted: quotedMsg });
    await sock.sendMessage(chatId, { text: `🔗 *Fungua Panel Yako:*\n${PANEL_URL}\n\nIngia kwa kutumia email yako.` });
    return true;
}

// ========== MAIN COMMAND HANDLER ==========
async function serverCommand(sock, chatId, m, body = '') {
    try {
        const userName = m?.pushName || 'Mteja';
        const safeM = m || {};

        let input = (body || 
            safeM.message?.conversation ||
            safeM.message?.extendedTextMessage?.text ||
            safeM.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            safeM.message?.buttonsResponseMessage?.selectedButtonId ||
            safeM.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ? 
                JSON.parse(safeM.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id : '' ||
            ''
        ).toLowerCase().trim();

        if (input === 'server') input = '.server';

        // Check Pending Request
        const pendingReq = getPendingRequest(chatId);
        if (pendingReq && pendingReq.step === 'awaiting_email' && input && !input.startsWith('.')) {
            if (input === 'cancel') {
                removePendingRequest(chatId);
                await sock.sendMessage(chatId, { text: "❌ Ombi limeghairiwa. Tumia *.server* kuanza upya." }, { quoted: safeM });
                return;
            }

            const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
            if (emailRegex.test(input)) {
                await createUserAndServer(sock, chatId, input, pendingReq, safeM);
            } else {
                await sock.sendMessage(chatId, { text: "❌ *Barua pepe si sahihi!*\n\nTuma email yako tena au *cancel* kughairi." }, { quoted: safeM });
            }
            return;
        }

        // Show Menu
        if (input === '.server' || !input) {
            await sendPackageMenu(sock, chatId, userName, safeM);
            return;
        }

        // Handle Package Selection
        const selectedPanel = (PANEL_PACKAGES || []).find(p => p.id === input);
        if (selectedPanel) {
            await askForEmail(sock, chatId, userName, selectedPanel, selectedPanel.specs, safeM);
            return;
        }

    } catch (e) {
        console.error('❌ Server Command Error:', e);
    }
}

// Relaying carousel cards kwa muundo wa MessageBuilder
async function sendNativeFlowMessage(sock, chatId, message, textBody, footerText, buttonTitle, sectionsList) {
    try {
        const cards = (sectionsList || []).flatMap((section) => (section.rows || []).map((row) => ({
            title: row.title || section.title || 'Server Package',
            body: `${row.title || ''}\n${row.description || ''}`.trim(),
            footer: footerText,
            imageUrl: BANNER,
            buttonText: buttonTitle || 'Chagua package',
            buttonId: row.id,
        })));

        const builder = new Carousel(sock)
            .setTitle(`✨ ${settings.botName || 'SERVER'} HOSTING ✨`)
            .setBody(textBody)
            .setFooter(footerText);

        cards.forEach((card) => {
            builder.addCard({
                header: {
                    title: card.title,
                    hasMediaAttachment: !!card.imageUrl,
                    imageMessage: card.imageUrl ? { url: card.imageUrl, mimetype: 'image/jpeg' } : undefined,
                },
                body: { text: card.body },
                footer: { text: card.footer },
                nativeFlowMessage: {
                    buttons: [{
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({ display_text: card.buttonText, id: card.buttonId }),
                    }],
                },
            });
        });

        await builder.send(chatId, { quoted: message });
    } catch (err) {
        console.error('❌ Server carousel error:', err);
        await sock.sendMessage(chatId, { text: textBody }, { quoted: message });
    }
}

module.exports = serverCommand;

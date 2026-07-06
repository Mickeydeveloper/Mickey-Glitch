const settings = require('./settings');
const halotel = require('./halotel');
const axios = require('axios');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

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

// ========== SEND INTERACTIVE BOOKING MENU ==========
async function sendPackageMenu(sock, chatId, userName, quotedMsg) {
    const textBody = `🤖 *${settings.botName} - SERVER HOSTING*\n\nHabari *${userName}*! 👋\nKaribu kwenye mfumo wa uundaji wa seva (Pterodactyl Panel).\n\n📌 *JINSI YA KUTUMIA:*\n1. Bonyeza *"📅 CHAGUA PACKAGE YA SEVA"* hapo chini.\n2. Chagua seva unayotaka.\n3. Andika email yako.\n4. Subiri sekunde chache seva ikamilike.`;

    // Kutengeneza list ya packages kwa ajili ya Booking Flow
    const sections = [
        {
            title: "🖥️ PTERODACTYL SERVER PACKAGES",
            rows: PANEL_PACKAGES.map(pkg => ({
                rowId: pkg.id,
                title: `🖥️ ${pkg.name}`,
                description: `💰 TSh ${pkg.price.toLocaleString()} | RAM: ${pkg.specs.ram}GB | CPU: ${pkg.specs.cpu}%`
            }))
        }
    ];

    await sendBookingFlowMessage(sock, chatId, quotedMsg, textBody, FOOTER, "📅 CHAGUA PACKAGE YA SEVA", sections);
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
    await sock.sendMessage(chatId, { 
        text: "👤 *Inaunda account yako kwenye Pterodactyl panel...*" 
    });

    const userCreation = await createPterodactylUser(email, pendingReq.userName, chatId);

    if (!userCreation.success) {
        removePendingRequest(chatId);
        await sock.sendMessage(chatId, {
            text: `❌ *Imeshindwa kuunda account!*\n\nTatizo: ${userCreation.error}`
        }, { quoted: quotedMsg });
        return false;
    }

    await sock.sendMessage(chatId, { 
        text: "🖥️ *Inaunda server yako... Tafadhali subiri (dakika 1-2)*\n\n📧 Pterodactyl itakutumia email na login credentials." 
    });

    const serverCreation = await createPterodactylServer(userCreation.userId, pendingReq.userName, pendingReq.specs, email);

    if (!serverCreation.success) {
        removePendingRequest(chatId);
        await sock.sendMessage(chatId, {
            text: `❌ *Server haikuundwa!*\n\nTatizo: ${serverCreation.error}`
        }, { quoted: quotedMsg });
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

    await sock.sendMessage(chatId, {
        text: `🔗 *Fungua Panel Yako:*\n${PANEL_URL}\n\nIngia kwa kutumia email yako.`
    });

    return true;
}

// ========== MAIN COMMAND HANDLER ==========
async function serverCommand(sock, chatId, m, body = '') {
    try {
        const userName = m.pushName || 'Mteja';
        const safeM = m || {};

        let input = (body || 
            safeM.message?.conversation ||
            safeM.message?.extendedTextMessage?.text ||
            safeM.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            safeM.message?.buttonsResponseMessage?.selectedButtonId ||
            ''
        ).toLowerCase().trim();

        // Check input fallback
        if (input === 'server') input = '.server';

        // ========== CHECK PENDING REQUEST (EMAIL INPUT) ==========
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

        // ========== SHOW SERVER MENU (BOOKING INTERACTIVE) ==========
        if (input === '.server') {
            await sendPackageMenu(sock, chatId, userName, safeM);
            return;
        }

        // ========== HANDLE PACKAGE SELECTION ==========
        const selectedPanel = PANEL_PACKAGES.find(p => p.id === input);
        if (selectedPanel) {
            await askForEmail(sock, chatId, userName, selectedPanel, selectedPanel.specs, safeM);
            return;
        }

        // ========== FALLBACK LIST ==========
        if (!input || input === '') {
            await sendPackageMenu(sock, chatId, userName, safeM);
        }

    } catch (e) {
        console.error('❌ Server Command Error:', e);
        try {
            await sock.sendMessage(chatId, { text: `❌ *Hitilafu ya kiufundi!* Jaribu tena baadae.` });
        } catch(err) {}
    }
}

// Mfumo halisi wa kuunda Booking/List Flow Message yenye picha ya Banner juu na muonekano safi
async function sendBookingFlowMessage(sock, chatId, message, textBody, footerText, buttonTitle, sectionsList) {
    try {
        const fetchBuffer = async (url) => {
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
            return Buffer.from(res.data);
        };

        let thumbnailBuffer = null;
        if (BANNER) {
            try {
                const sharp = require('sharp');
                const buf = await fetchBuffer(BANNER);
                thumbnailBuffer = await sharp(buf).resize(300, 300, { fit: 'cover' }).toBuffer();
            } catch (e) {
                console.error('[server-ui] thumbnail error:', e.message);
            }
        }

        const msg = generateWAMessageFromContent(chatId, {
            listMessage: {
                title: `✨ ${settings.botName || 'SERVER'} HOSTING ✨`,
                description: textBody,
                buttonText: buttonTitle,
                listType: 1,
                sections: sectionsList,
                footerText: footerText,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    headerType: 6,
                    locationMessage: {
                        degreesLatitude: 0,
                        degreesLongitude: 0,
                        name: "🖥️ SERVER CREATION SYSTEM",
                        address: "Pterodactyl Automated Flow",
                        jpegThumbnail: thumbnailBuffer
                    }
                }
            }
        }, { userJid: sock.user.id, quoted: message });

        await sock.relayMessage(chatId, msg.message, {
            messageId: msg.key.id,
            additionalNodes: [
                {
                    tag: 'biz',
                    attrs: {},
                    content: [
                        {
                            tag: 'interactive',
                            attrs: { type: 'native_flow', v: '1' },
                            content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
                        }
                    ]
                }
            ]
        });
    } catch (err) {
        console.error('Booking Flow Error inside Server Command:', err);
        await sock.sendMessage(chatId, { text: textBody }, { quoted: message });
    }
}

module.exports = serverCommand;

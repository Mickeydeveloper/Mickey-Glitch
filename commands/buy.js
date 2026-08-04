const os = require('os');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const axios = require('axios');

// Web Base URL & Pterodactyl Admin Credentials
const BASE_URL = process.env.PTERODACTYL_BASE_URL || 'https://mickey-pterodacty.vercel.app';
const ADMIN_EMAIL = 'mickidadyhamza@gmail.com';
const ADMIN_PASSWORD = 'MICKEY24@';
const API_KEY = process.env.EXTERNAL_API_KEY || process.env.PTERODACTYL_APP_API_KEY || 'MICKEY24@';

// Pterodactyl Specific Settings (Badilisha kulingana na Node/Egg za Panel yako kama inahitajika)
const DEFAULT_LOCATION_ID = 1;
const DEFAULT_EGG_ID = 15; // Standard Node.js / Generic Egg ID
const DEFAULT_NEST_ID = 5;

// Memory DB kusevu sessions za watumiaji
const userSessions = new Map();

/**
 * Helper: Fetch Image Buffer
 */
const fetchBuffer = async (url) => {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
        return Buffer.from(res.data);
    } catch {
        return null;
    }
};

/**
 * Helper: Resize Image
 */
async function resizeImg(buffer, width = 300, height = 300) {
    if (!buffer) return null;
    try {
        const sharp = require('sharp');
        return await sharp(buffer).resize(width, height, { fit: 'cover' }).toBuffer();
    } catch {
        return buffer;
    }
}

/**
 * Helper: Admin Login Token Fetcher
 */
const getAdminToken = async () => {
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        }, { timeout: 10000 });

        return res.data?.token || res.data?.accessToken || res.data?.data?.token || null;
    } catch (e) {
        console.error('[ADMIN LOGIN FAILED]:', e?.response?.data || e.message);
        return null;
    }
};

/**
 * Main Panel Command Handler
 */
const panelCommand = async (sock, chatId, message, args = [], commandName = '') => {
    const sender = message.key?.participant || message.key?.remoteJid;
    const botName = '𝐌𝐈𝐂𝐊𝐄𝐘-𝐕𝟑';
    const footer = '𝐌𝐢𝐜𝐤𝐞𝐲 𝐆𝐥𝐢𝐭𝐜𝐡 𝐓𝐞𝐜𝐡𝐧𝐨𝐥𝐨𝐠𝐲™';
    const imageUrl = 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/chatbot.png';

    // Parse command name
    const bodyText = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || 
                     message.message?.buttonsResponseMessage?.selectedButtonId || '';

    const extractedCmd = bodyText ? bodyText.trim().split(/\s+/)[0].replace(/^[./#!]/, '') : '';

    let subCommand = '';
    if (typeof commandName === 'string' && commandName.trim().length > 0) {
        subCommand = commandName.trim().toLowerCase();
    } else if (extractedCmd) {
        subCommand = extractedCmd.trim().toLowerCase();
    } else if (Array.isArray(args) && typeof args[0] === 'string') {
        subCommand = args[0].trim().toLowerCase();
    } else {
        subCommand = 'mypanel';
    }

    const safeArgs = Array.isArray(args) ? args : [];

    // Function ya kutuma Native Flow CTA Buttons (URL & Copy Buttons)
    const sendCtaMessage = async (text, copyUsername = '', copyPassword = '') => {
        try {
            let thumbnailBuffer = null;
            if (imageUrl) {
                const buf = await fetchBuffer(imageUrl);
                thumbnailBuffer = await resizeImg(buf, 300, 300);
            }

            const buttons = [];

            // 1. CTA Open Domain / Web Button
            buttons.push({
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '🌐 Fungua Panel Web',
                    url: BASE_URL,
                    merchant_url: BASE_URL
                })
            });

            // 2. CTA Copy Username Button (kama ipo)
            if (copyUsername) {
                buttons.push({
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📋 Copy Username',
                        id: 'copy_user',
                        copy_code: copyUsername
                    })
                });
            }

            // 3. CTA Copy Password Button (kama ipo)
            if (copyPassword) {
                buttons.push({
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🔑 Copy Password',
                        id: 'copy_pass',
                        copy_code: copyPassword
                    })
                });
            }

            const contextInfo = {
                forwardingScore: 999,
                isForwarded: true,
                mentionedJid: [sender]
            };

            const msg = generateWAMessageFromContent(chatId, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            header: {
                                title: botName,
                                hasMediaAttachment: true,
                                locationMessage: {
                                    degreesLatitude: 0,
                                    degreesLongitude: 0,
                                    name: 'Pterodactyl Panel Server',
                                    jpegThumbnail: thumbnailBuffer
                                }
                            },
                            body: { text: text },
                            footer: { text: footer },
                            nativeFlowMessage: {
                                buttons: buttons
                            },
                            contextInfo
                        }
                    }
                }
            }, { userJid: (sock && sock.user && sock.user.id) || '' });

            await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });

        } catch (e) {
            console.error('[CTA Send Error, Falling back to text]:', e?.message || e);
            await sock.sendMessage(chatId, { text: text }, { quoted: message });
        }
    };

    try {
        switch (subCommand) {

            // -----------------------------------------------------------------
            // 1. BUY / KUTENGENEZA USER NA SERVER MPYA HALISI
            // -----------------------------------------------------------------
            case 'buy': {
                const plan = safeArgs[0]?.toLowerCase();
                const username = safeArgs[1];

                if (!plan || !username) {
                    return await sendCtaMessage(
                        `❌ *Muundo Sio Sahihi!*\n\n` +
                        `Tafadhali tumia muundo huu:\n` +
                        `\`.buy 1gb <username>\`\n\n` +
                        `*Mfano:* \`.buy 1gb mickey\``
                    );
                }

                await sock.sendMessage(chatId, { text: `⏳ *Inaingia Admin Account & Inatengeneza Server Halisi kwenye Pterodactyl...*` }, { quoted: message });

                // Step A: Login kama Admin ili kupata Admin Access Token
                const adminToken = await getAdminToken();

                const userPassword = `Mickey@${Math.floor(100000 + Math.random() * 900000)}`;
                const userEmail = `${username.toLowerCase()}@mickey.tech`;

                // Set Specs kulingana na Plan
                let ramMB = 1024;
                let diskMB = 25600;
                let cpuLimit = 100;

                if (plan === '2gb') { ramMB = 2048; diskMB = 51200; cpuLimit = 150; }
                else if (plan === '4gb') { ramMB = 4096; diskMB = 102400; cpuLimit = 200; }

                let createdUser = null;
                let createdServer = null;

                // Step B: Tengeneza User Mpya Web/Pterodactyl
                try {
                    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
                        username: username,
                        email: userEmail,
                        password: userPassword
                    }, {
                        headers: adminToken ? { 'Authorization': `Bearer ${adminToken}` } : { 'x-api-key': API_KEY },
                        timeout: 12000
                    });
                    createdUser = regRes.data?.user || regRes.data;
                } catch (err) {
                    console.log('[User Reg Warning]: User inaweza kuwa ipo au API imetumia fallback', err?.message);
                }

                // Step C: Tengeneza Server Halisi Pterodactyl
                try {
                    const serverRes = await axios.post(`${BASE_URL}/api/external/servers`, {
                        name: `${username}-server`,
                        user_email: userEmail,
                        username: username,
                        password: userPassword,
                        limits: {
                            memory: ramMB,
                            swap: 0,
                            disk: diskMB,
                            io: 500,
                            cpu: cpuLimit
                        }
                    }, {
                        headers: { 'x-api-key': API_KEY },
                        timeout: 15000
                    });

                    createdServer = serverRes.data?.server || serverRes.data;
                } catch (err) {
                    console.error('[Server Creation Error]:', err?.response?.data || err.message);
                }

                // Hifadhi session
                userSessions.set(sender, {
                    username: username,
                    email: userEmail,
                    password: userPassword,
                    plan: plan.toUpperCase(),
                    createdAt: new Date().toLocaleDateString()
                });

                const successMessage = 
                    `🎉 *PTERODACTYL SERVER IMEFANIKIWA KUTENGENEZWA!*\n\n` +
                    `👤 *Username:* \`${username}\`\n` +
                    `📧 *Email:* \`${userEmail}\`\n` +
                    `🔑 *Password:* \`${userPassword}\`\n` +
                    `📌 *Plan:* ${plan.toUpperCase()} (${ramMB}MB RAM)\n` +
                    `🌐 *Panel Domain:* ${BASE_URL}\n\n` +
                    `⚡ *Status:* Active & Live 🟢\n\n` +
                    `_Bonyeza button hapo chini kufungua Panel au ku-copy credentials zako._`;

                // Tuma ikiwa na CTA Buttons (Domain Link & Copy Username/Password)
                return await sendCtaMessage(successMessage, username, userPassword);
            }

            // -----------------------------------------------------------------
            // 2. MYPANEL / SERVER INFO (.mypanel)
            // -----------------------------------------------------------------
            case 'mypanel':
            case 'panelinfo': {
                const session = userSessions.get(sender);

                if (!session) {
                    return await sendCtaMessage(
                        `❌ *Akaunti Haijapatikana!*\n\n` +
                        `Hujaingia au huna panel active.\n` +
                        `Tumia \`.buy 1gb <username>\` kutengeneza Server mpya.`
                    );
                }

                const response = await axios.get(`${BASE_URL}/api/external/servers/${session.username}`, {
                    headers: { 'x-api-key': API_KEY },
                    timeout: 10000
                }).catch(() => null);

                let serverInfoText = '';

                if (response && response.data && response.data.success) {
                    const s = response.data.server;
                    serverInfoText = 
                        `📊 *TAARIFA ZA SERVER YAKO (PTERODACTYL)*\n\n` +
                        `📌 *Server Name:* ${s.name}\n` +
                        `🆔 *Server ID:* \`${s.id}\`\n` +
                        `📊 *Status:* 🟢 ${s.status.toUpperCase()}\n\n` +
                        `🌐 *CONNECTION DETAILS*\n` +
                        `📍 *IP Address:* \`${s.ipAddress}\`\n` +
                        `🔌 *Port:* \`${s.port}\`\n` +
                        `📁 *SFTP Host:* \`${s.sftpHost}\`\n\n` +
                        `👤 *USER DETAILS*\n` +
                        `👤 *Username:* \`${session.username}\`\n` +
                        `🔑 *Password:* \`${session.password}\``;
                } else {
                    serverInfoText = 
                        `📊 *TAARIFA ZA PANEL YAKO*\n\n` +
                        `👤 *Username:* \`${session.username}\`\n` +
                        `📧 *Email:* \`${session.email}\`\n` +
                        `🔑 *Password:* \`${session.password}\`\n` +
                        `📌 *Plan:* ${session.plan}\n` +
                        `📅 *Created:* ${session.createdAt}\n` +
                        `🌐 *Domain:* ${BASE_URL}`;
                }

                return await sendCtaMessage(serverInfoText, session.username, session.password);
            }

            // -----------------------------------------------------------------
            // 3. PACKAGES (.packages)
            // -----------------------------------------------------------------
            case 'packages':
            case 'plans': {
                const packageText = 
                    `📦 *MICKEY PTERODACTYL PACKAGES*\n\n` +
                    `1️⃣ *1GB RAM Plan*\n` +
                    `   🧠 RAM: 1024 MB | 💾 Disk: 25GB\n` +
                    `   ⚡ Command: \`.buy 1gb <username>\`\n\n` +
                    `2️⃣ *2GB RAM Plan*\n` +
                    `   🧠 RAM: 2048 MB | 💾 Disk: 50GB\n` +
                    `   ⚡ Command: \`.buy 2gb <username>\`\n\n` +
                    `3️⃣ *4GB RAM Plan*\n` +
                    `   🧠 RAM: 4096 MB | 💾 Disk: 100GB\n` +
                    `   ⚡ Command: \`.buy 4gb <username>\``;

                return await sendCtaMessage(packageText);
            }

            default: {
                return await sendCtaMessage(
                    `❓ *Command Haijulikani!*\n\n` +
                    `• \`.buy 1gb <username>\`\n` +
                    `• \`.mypanel\`\n` +
                    `• \`.packages\``
                );
            }
        }

    } catch (error) {
        console.error('[Critical Error]:', error);
        await sock.sendMessage(chatId, { text: `❌ *Error:* ${error.message || error}` }, { quoted: message });
    }
};

module.exports = panelCommand;

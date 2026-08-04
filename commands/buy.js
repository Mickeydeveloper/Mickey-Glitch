const os = require('os');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const axios = require('axios');

// Configuration & Endpoints
const BASE_URL = process.env.PTERODACTYL_BASE_URL || 'https://mickey-pterodacty.vercel.app';
const API_KEY = process.env.EXTERNAL_API_KEY || process.env.PTERODACTYL_APP_API_KEY || 'default_secret_key';

// Database ya ku-store tokens na user credentials (In-Memory)
const userSessions = new Map();

/**
 * Helper to fetch image buffer safely
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
 * Resize image thumbnail
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
 * Get bot name from config safely
 */
const getBotName = () => {
    try {
        const configPath = path.join(__dirname, '..', 'config', 'config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath));
            return config.botName || '𝐌𝐈𝐂𝐊𝐄𝐘-𝐕𝟑';
        }
    } catch (e) {}
    return '𝐌𝐈𝐂𝐊𝐄𝐘-𝐕𝟑';
};

/**
 * Main Panel Command Handler
 */
const panelCommand = async (sock, chatId, message, args = [], commandName = '') => {
    const sender = message.key?.participant || message.key?.remoteJid;
    const botName = getBotName();
    const footer = '𝐌𝐢𝐜𝐤𝐞𝐲 𝐆𝐥𝐢𝐭𝐜𝐡 𝐓𝐞𝐜𝐡𝐧𝐨𝐥𝐨𝐠𝐲™';
    const imageUrl = 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/chatbot.png';

    // Extract text yote kutoka kwenye message ili kupata exact command kama commandName haijapita
    const bodyText = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || 
                     message.message?.buttonsResponseMessage?.selectedButtonId || '';

    // Dondoo la Kwanza: Soma command iliyoandikwa (e.g. .mypanel -> mypanel)
    const extractedCmd = bodyText ? bodyText.trim().split(/\s+/)[0].replace(/^[./#!]/, '') : '';

    // Baini subCommand halisi: tumia commandName -> extractedCmd -> args[0]
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

    console.log(`[panelCommand] Detected SubCommand: '${subCommand}' from user:`, sender);

    // Helper function to send interactive native buttons
    const sendInteractiveMessage = async (text, buttons = []) => {
        try {
            let thumbnailBuffer = null;
            if (imageUrl) {
                const buf = await fetchBuffer(imageUrl);
                thumbnailBuffer = await resizeImg(buf, 300, 300);
            }

            const defaultButtons = [
                { buttonId: '.packages', buttonText: { displayText: '📦 Packages' }, type: 1 },
                { buttonId: '.mypanel', buttonText: { displayText: '🖥️ My Panel' }, type: 1 },
                { buttonId: '.menu', buttonText: { displayText: '⦂ Menu' }, type: 1 }
            ];

            const finalButtons = buttons.length > 0 ? buttons : defaultButtons;

            const contextInfo = {
                forwardingScore: 999,
                isForwarded: true,
                mentionedJid: [sender]
            };

            const msg = generateWAMessageFromContent(chatId, {
                buttonsMessage: {
                    contentText: text,
                    footerText: footer,
                    headerType: 6,
                    locationMessage: {
                        degreesLatitude: 0,
                        degreesLongitude: 0,
                        name: botName,
                        address: 'Pterodactyl Panel',
                        jpegThumbnail: thumbnailBuffer
                    },
                    viewOnce: true,
                    contextInfo,
                    buttons: finalButtons
                }
            }, { userJid: (sock && sock.user && sock.user.id) || '' });

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
        } catch (e) {
            console.error('[panelCommand] Interactive button failed, falling back to simple message:', e?.message || e);
            await sock.sendMessage(chatId, { text: text }, { quoted: message });
        }
    };

    try {
        switch (subCommand) {

            // -----------------------------------------------------------------
            // 1. BUY / CREATE USER & SERVER (.buy 1gb <username>)
            // -----------------------------------------------------------------
            case 'buy': {
                const plan = safeArgs[0]?.toLowerCase();
                const username = safeArgs[1];

                if (!plan || !username) {
                    return await sendInteractiveMessage(
                        `❌ *Muundo Sio Sahihi!*\n\n` +
                        `Tafadhali tumia muundo huu:\n` +
                        `\`.buy 1gb <username>\`\n\n` +
                        `*Mfano:* \`.buy 1gb mickey\``
                    );
                }

                await sock.sendMessage(chatId, { text: `⏳ *Inatengeneza User na Server mpya kwenye Pterodactyl...*` }, { quoted: message });

                const generatedPassword = `Mickey@${Math.floor(100000 + Math.random() * 900000)}`;
                const generatedEmail = `${username.toLowerCase()}@mickey.tech`;

                const response = await axios.post(`${BASE_URL}/auth/register`, {
                    username: username,
                    email: generatedEmail,
                    password: generatedPassword,
                    plan: plan
                }, {
                    headers: { 'x-api-key': API_KEY },
                    timeout: 15000
                }).catch(err => err.response || null);

                const userData = response?.data || {};
                const token = userData.token || `token_${Date.now()}_${username}`;

                userSessions.set(sender, {
                    username: username,
                    email: generatedEmail,
                    password: generatedPassword,
                    token: token,
                    plan: plan.toUpperCase(),
                    createdAt: new Date().toLocaleDateString()
                });

                const successText = 
                    `🎉 *PANEL YAKO IMEFANIKIWA KUTENGENEZWA!*\n\n` +
                    `👤 *Username:* \`${username}\`\n` +
                    `📧 *Email:* \`${generatedEmail}\`\n` +
                    `🔑 *Password:* \`${generatedPassword}\`\n` +
                    `📌 *Plan:* ${plan.toUpperCase()}\n` +
                    `🌐 *URL:* ${BASE_URL}\n\n` +
                    `⚡ *Status:* Active ✅\n\n` +
                    `_Ingia kwenye panel kwa kutumia taarifa hizi au tumia \`.mypanel\` kuangalia taarifa zako._`;

                return await sendInteractiveMessage(successText);
            }

            // -----------------------------------------------------------------
            // 2. MYPANEL / SERVER INFO (.mypanel <server_id>)
            // -----------------------------------------------------------------
            case 'mypanel':
            case 'panelinfo':
            case 'serverinfo': {
                const serverId = safeArgs[0];
                const session = userSessions.get(sender);

                if (!serverId && !session) {
                    return await sendInteractiveMessage(
                        `❌ *Akaunti Haijapatikana!*\n\n` +
                        `Hujaingia au huna panel active.\n` +
                        `Tumia \`.buy 1gb <username>\` au ingiza Server ID:\n` +
                        `\`.mypanel 123\``
                    );
                }

                const targetId = serverId || session?.username || '123';

                const response = await axios.get(`${BASE_URL}/api/external/servers/${targetId}`, {
                    headers: { 'x-api-key': API_KEY },
                    timeout: 10000
                }).catch(err => err.response || null);

                if (response && response.data && response.data.success) {
                    const s = response.data.server;
                    const statusEmoji = s.status === 'online' ? '🟢' : '🔴';

                    const panelText = 
                        `📊 *TAARIFA ZA SERVER YAKO*\n\n` +
                        `📌 *Name:* ${s.name}\n` +
                        `🆔 *ID:* \`${s.id}\`\n` +
                        `📊 *Status:* ${statusEmoji} ${s.status.toUpperCase()}\n\n` +
                        `🌐 *CONNECTION DETAILS*\n` +
                        `📍 *IP Address:* \`${s.ipAddress}\`\n` +
                        `🔌 *Port:* \`${s.port}\`\n` +
                        `📁 *SFTP Host:* \`${s.sftpHost}\`\n\n` +
                        `⚙️ *RESOURCES*\n` +
                        `🧠 *RAM:* ${s.limits.memory} MB\n` +
                        `💾 *Disk:* ${s.limits.disk} MB\n` +
                        `⚡ *CPU:* ${s.limits.cpu}%`;

                    return await sendInteractiveMessage(panelText);
                }

                if (session) {
                    const localText = 
                        `📊 *TAARIFA ZA PANEL YAKO*\n\n` +
                        `👤 *Username:* ${session.username}\n` +
                        `📧 *Email:* ${session.email}\n` +
                        `🔑 *Password:* \`${session.password}\`\n` +
                        `📌 *Plan:* ${session.plan}\n` +
                        `📅 *Created:* ${session.createdAt}\n` +
                        `📊 *Status:* ✅ ACTIVE\n\n` +
                        `🌐 *URL:* ${BASE_URL}`;

                    return await sendInteractiveMessage(localText);
                }

                return await sendInteractiveMessage(`❌ Imeshindwa kupata taarifa za server ID: \`${targetId}\`. Hakikisha ID ni sahihi.`);
            }

            // -----------------------------------------------------------------
            // 3. PACKAGES (.packages)
            // -----------------------------------------------------------------
            case 'packages':
            case 'plans': {
                const response = await axios.get(`${BASE_URL}/api/packages`, { timeout: 8000 }).catch(() => null);
                const packages = response?.data?.packages || response?.data || null;

                let packageText = `📦 *MICKEY PTERODACTYL PACKAGES*\n\n`;

                if (packages && Array.isArray(packages) && packages.length > 0) {
                    packages.forEach((pkg, index) => {
                        packageText += `${index + 1}️⃣ *${pkg.name}*\n`;
                        packageText += `   💰 Price: ${pkg.price} Coins\n`;
                        packageText += `   🧠 RAM: ${pkg.ram}MB | 💾 Disk: ${pkg.disk}MB\n\n`;
                    });
                } else {
                    packageText += 
                        `1️⃣ *1GB RAM Plan*\n` +
                        `   🧠 RAM: 1024 MB | 💾 Disk: 25600 MB\n` +
                        `   ⚡ Command: \`.buy 1gb <username>\`\n\n` +
                        `2️⃣ *2GB RAM Plan*\n` +
                        `   🧠 RAM: 2048 MB | 💾 Disk: 51200 MB\n` +
                        `   ⚡ Command: \`.buy 2gb <username>\`\n\n` +
                        `3️⃣ *4GB RAM Plan*\n` +
                        `   🧠 RAM: 4096 MB | 💾 Disk: 102400 MB\n` +
                        `   ⚡ Command: \`.buy 4gb <username>\``;
                }

                return await sendInteractiveMessage(packageText);
            }

            // -----------------------------------------------------------------
            // 4. LOGIN (.login <email> <password>)
            // -----------------------------------------------------------------
            case 'login': {
                const email = safeArgs[0];
                const password = safeArgs[1];

                if (!email || !password) {
                    return await sendInteractiveMessage(`❌ *Muundo Sio Sahihi!*\n\nTumia: \`.login <email> <password>\``);
                }

                await sock.sendMessage(chatId, { text: '⏳ *Inahakiki taarifa...*' }, { quoted: message });

                const res = await axios.post(`${BASE_URL}/auth/login`, { email, password }, { timeout: 10000 }).catch(err => err.response || null);
                const token = res?.data?.token || res?.data?.accessToken || `manual_token_${Date.now()}`;

                userSessions.set(sender, {
                    email,
                    password,
                    username: email.split('@')[0],
                    token,
                    createdAt: new Date().toLocaleDateString()
                });

                return await sendInteractiveMessage(`🔓 *Login Success!*\n\nUmeingia kama: \`${email}\`\nTumia \`.mypanel\` kuangalia server yako.`);
            }

            // -----------------------------------------------------------------
            // 5. PROFILE (.profile)
            // -----------------------------------------------------------------
            case 'profile': {
                const session = userSessions.get(sender);

                if (!session) {
                    return await sendInteractiveMessage(`🔒 *Hujaingia kwenye Akaunti!*\n\nTafadhali tumia \`.buy 1gb <username>\` au \`.login <email> <pass>\``);
                }

                const profileText = 
                    `👤 *TAARIFA ZAKO NA PROFILE*\n\n` +
                    `👤 *Username:* ${session.username}\n` +
                    `📧 *Email:* ${session.email}\n` +
                    `🔑 *Password:* \`${session.password}\`\n` +
                    `📌 *Plan:* ${session.plan || 'Standard'}\n` +
                    `📅 *Joined:* ${session.createdAt}`;

                return await sendInteractiveMessage(profileText);
            }

            // -----------------------------------------------------------------
            // 6. LOGOUT (.logout)
            // -----------------------------------------------------------------
            case 'logout': {
                userSessions.delete(sender);
                return await sendInteractiveMessage(`🚪 *Umetoka kwenye akaunti kikamilifu.*`);
            }

            default: {
                return await sendInteractiveMessage(
                    `❓ *Command Haijulikani! (${subCommand})*\n\n` +
                    `Tumia moja ya hizi:\n` +
                    `• \`.buy 1gb <username>\`\n` +
                    `• \`.mypanel\`\n` +
                    `• \`.packages\`\n` +
                    `• \`.login <email> <pass>\`\n` +
                    `• \`.profile\``
                );
            }
        }

    } catch (error) {
        console.error('[Critical Error in Panel Command]:', error);
        try {
            await sock.sendMessage(chatId, { 
                text: `❌ *System Error:* Hitilafu imetokea.\n\`\`\`${error.message || error}\`\`\`` 
            }, { quoted: message });
        } catch (ee) {}
    }
};

module.exports = panelCommand;

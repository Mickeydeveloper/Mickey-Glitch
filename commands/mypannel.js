// plugins/mypanel.js
const axios = require('axios');

// Unaweza kuweka API details hapa au kuziweka kwenye .env
const BASE_URL = process.env.PTERODACTYL_BASE_URL || 'https://mickey-pterodacty.vercel.app';
const API_KEY = process.env.EXTERNAL_API_KEY || process.env.PTERODACTYL_APP_API_KEY;

module.exports = {
    name: 'mypanel',
    aliases: ['panelinfo', 'mypanels', 'serverinfo'],
    category: 'panel',
    description: 'Angalia taarifa za server yako kutoka Pterodactyl Panel',
    usage: '.mypanel <server_id>',
    permissions: { owner: false },

    execute: async (sock, msg, args) => {
        const jid = msg.key.remoteJid;

        try {
            // Chukua server ID au identifier kutoka kwa args
            const serverId = args[0];

            if (!serverId) {
                return await sock.sendMessage(jid, {
                    text: `❌ *Ingiza Server ID*\n\n` +
                          `Tafadhali weka Server ID au UUID.\n` +
                          `Mfano: \`.mypanel 123\` au \`.mypanel abc123\``
                }, { quoted: msg });
            }

            if (!API_KEY) {
                return await sock.sendMessage(jid, {
                    text: `❌ *Configuration Error*\n\nAPI Key haijasetiwa kwenye system (\`EXTERNAL_API_KEY\`).`
                }, { quoted: msg });
            }

            // Call API kulingana na Doc
            const response = await axios.get(`${BASE_URL}/api/external/servers/${serverId}`, {
                headers: {
                    'x-api-key': API_KEY
                },
                timeout: 10000
            });

            const data = response.data;

            if (!data.success || !data.server) {
                return await sock.sendMessage(jid, {
                    text: `❌ Imeshindwa kupata taarifa za server.`
                }, { quoted: msg });
            }

            const s = data.server;
            const statusEmoji = s.status === 'online' ? '🟢' : '🔴';

            // Badilisha MB kwenda GB/MB kwa muonekano mzuri
            const ramInGB = (s.limits.memory / 1024).toFixed(1);
            const diskInGB = (s.limits.disk / 1024).toFixed(1);

            const messageText = 
                `🖥️ *TAARIFA ZA SERVER (PTERODACTYL)*\n\n` +
                `📌 *Jina:* ${s.name}\n` +
                `🆔 *ID:* \`${s.id}\`\n` +
                `🔍 *Identifier:* \`${s.identifier}\`\n` +
                `📊 *Hali:* ${statusEmoji} ${s.status.toUpperCase()}\n\n` +
                `🌐 *MIPANGILIO YA AROSTO (CONNECTION)*\n` +
                `📍 *IP Address:* \`${s.ipAddress}\`\n` +
                `🔌 *Port:* \`${s.port}\`\n` +
                `📁 *SFTP Host:* \`${s.sftpHost}\`\n\n` +
                `⚙️ *LIMITS & RESOURCES*\n` +
                `🧠 *RAM:* ${s.limits.memory} MB (${ramInGB} GB)\n` +
                `💾 *Disk:* ${s.limits.disk} MB (${diskInGB} GB)\n` +
                `⚡ *CPU:* ${s.limits.cpu}%\n` +
                `🔄 *Swap:* ${s.limits.swap} MB\n\n` +
                `_Tumia SFTP Host na Port kuunganisha mafile yako._`;

            await sock.sendMessage(jid, { text: messageText }, { quoted: msg });

        } catch (error) {
            console.error('[MYPANEL ERROR]', error?.response?.data || error.message);

            let errorMsg = 'Imefeli kupata taarifa za server.';
            
            if (error.response) {
                if (error.response.status === 401) {
                    errorMsg = '❌ *Unauthorized:* API key haijakubaliwa au haipo.';
                } else if (error.response.status === 404) {
                    errorMsg = '❌ *Not Found:* Server ID haijapatikana kwenye panel.';
                } else if (error.response.status === 500) {
                    errorMsg = '❌ *Server Error:* Pterodactyl Panel imepata hitilafu.';
                }
            }

            await sock.sendMessage(jid, {
                text: `${errorMsg}`
            }, { quoted: msg });
        }
    }
};

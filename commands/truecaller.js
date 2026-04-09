const truecallerjs = require('truecallerjs');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const truecallerFile = path.join(dataDir, 'truecaller.json');

let installationId = null;

// Load saved Installation ID
function loadInstallationId() {
    if (fs.existsSync(truecallerFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(truecallerFile, 'utf8'));
            installationId = data.installationId;
            return true;
        } catch (e) {
            console.error('Error loading truecaller ID:', e);
            return false;
        }
    }
    return false;
}

// Save Installation ID
function saveInstallationId(id) {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(truecallerFile, JSON.stringify({ installationId: id }, null, 2));
    installationId = id;
}

// Main Truecaller Search Function
async function searchTruecaller(phoneNumber, installId = null) {
    try {
        const id = installId || installationId;
        if (!id) {
            throw new Error('Installation ID not configured');
        }

        const searchOptions = {
            phoneNumber: phoneNumber,
            installationId: id,
            accessToken: null
        };

        const results = await truecallerjs.search(searchOptions);
        return results;
    } catch (error) {
        throw new Error(`Truecaller search failed: ${error.message}`);
    }
}

// Command Handler
module.exports = async (context) => {
    const { message, args, sock, chatId } = context;

    // Load installation ID
    loadInstallationId();

    // No arguments provided
    if (args.length === 0) {
        return sock.sendMessage(chatId, {
            text: `*🔍 TRUECALLER LOOKUP COMMAND*\n\n_Usage:_\n*.truecaller +1234567890*\n\n_Features:_\n✅ Phone number lookup\n✅ Caller ID & name\n✅ Carrier information\n✅ Spam score\n✅ Location details\n\n_Note:_ Installation ID must be configured first`
        }, { quoted: message });
    }

    const phoneNumber = args.join('').trim();

    // Validate phone number format
    if (!/^\\+?[1-9]\\d{1,14}$/.test(phoneNumber.replace(/[^0-9+]/g, ''))) {
        return sock.sendMessage(chatId, {
            text: '❌ Invalid phone number format.\n\nUse international format: +1234567890'
        }, { quoted: message });
    }

    // Check if Installation ID exists
    if (!installationId) {
        return sock.sendMessage(chatId, {
            text: `❌ *Truecaller not configured*\n\nInstallation ID is required.\n\nSetup: *.tcsetup*`
        }, { quoted: message });
    }

    // Send searching message
    const searchingMsg = await sock.sendMessage(chatId, {
        text: `🔍 *Searching for:* ${phoneNumber}...`
    }, { quoted: message });

    try {
        const results = await searchTruecaller(phoneNumber);

        if (!results || !results.data || results.data.length === 0) {
            return sock.sendMessage(chatId, {
                text: `❌ No information found for ${phoneNumber}`
            }, { quoted: message });
        }

        const data = results.data[0]; // First result

        let resultText = `✅ *TRUECALLER RESULTS*\n\n`;
        resultText += `📱 *Phone:* ${data.phoneNumber || phoneNumber}\n`;
        resultText += `👤 *Name:* ${data.name || 'N/A'}\n`;
        resultText += `🏢 *Carrier:* ${data.carrier || 'N/A'}\n`;
        resultText += `📍 *Location:* ${data.location || 'N/A'}\n`;
        resultText += `🚨 *Spam Score:* ${data.spamScore || 'N/A'}\n`;
        resultText += `🔖 *Type:* ${data.type || 'Unknown'}\n`;

        if (data.email) {
            resultText += `📧 *Email:* ${data.email}\n`;
        }

        if (data.message) {
            resultText += `\n_${data.message}_`;
        }

        // Delete searching message
        try {
            await sock.sendMessage(chatId, {
                delete: searchingMsg.key
            });
        } catch (e) {}

        return sock.sendMessage(chatId, {
            text: resultText
        }, { quoted: message });

    } catch (error) {
        // Delete searching message
        try {
            await sock.sendMessage(chatId, {
                delete: searchingMsg.key
            });
        } catch (e) {}

        console.error('Truecaller error:', error);

        return sock.sendMessage(chatId, {
            text: `❌ *Error:* ${error.message}\n\nMake sure Installation ID is valid.`
        }, { quoted: message });
    }
};

// Export additional functions for manual use
module.exports.searchTruecaller = searchTruecaller;
module.exports.saveInstallationId = saveInstallationId;
module.exports.loadInstallationId = loadInstallationId;

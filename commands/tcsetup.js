const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const truecallerFile = path.join(dataDir, 'truecaller.json');

module.exports = async (context) => {
    const { message, args, sock, chatId } = context;

    // Check if Installation ID is provided
    if (args.length === 0) {
        const isSaved = fs.existsSync(truecallerFile);
        let savedId = 'Not configured';

        if (isSaved) {
            try {
                const data = JSON.parse(fs.readFileSync(truecallerFile, 'utf8'));
                savedId = data.installationId ? '✅ Configured' : 'Invalid';
            } catch (e) {}
        }

        return sock.sendMessage(chatId, {
            text: `*⚙️ TRUECALLER SETUP*\n\n_Status:_ ${savedId}\n\n_Usage:_\n*.tcsetup <installation_id>*\n\n_Example:_\n*.tcsetup 5fd7b1n8k9p0q1r2s3t4u5v6w7x8y9z0*`
        }, { quoted: message });
    }

    const installationId = args.join('').trim();

    // Validate Installation ID format (basic check)
    if (installationId.length < 10) {
        return sock.sendMessage(chatId, {
            text: '❌ Invalid Installation ID format.\n\nInstallation ID should be longer.'
        }, { quoted: message });
    }

    try {
        // Create data directory if it doesn't exist
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Save Installation ID
        fs.writeFileSync(truecallerFile, JSON.stringify({ installationId }, null, 2));

        return sock.sendMessage(chatId, {
            text: `✅ *Truecaller Installation ID successfully configured!*\n\nYou can now use: *.truecaller <phone_number>*\n\n_Example:_\n*.truecaller +255712345678*`
        }, { quoted: message });

    } catch (error) {
        console.error('Setup error:', error);
        return sock.sendMessage(chatId, {
            text: `❌ *Error saving Installation ID:*\n\n${error.message}`
        }, { quoted: message });
    }
};

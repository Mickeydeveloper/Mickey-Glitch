const { sleep } = require('../lib/myfunc');
const fs = require('fs');
const path = require('path');

// -- new version inserted below --

// common contextInfo block used for all outgoing messages
const BASE_CONTEXT = {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363418027651738@newsletter',
        newsletterName: 'TKT-CYBER-XMD',
        serverMessageId: -1
    }
};

async function pairCommand(sock, chatId, message, q) {
    try {
        if (!q) return sendUsage(sock, chatId);

        const numbers = parseNumbers(q);
        if (numbers.length < 2) return sendInvalidFormat(sock, chatId);

        await sock.sendMessage(chatId, { text: processingText(), contextInfo: BASE_CONTEXT });

        // Use index pair formula: pair 0 with 1, 2 with 3, etc.
        const pairs = createPairs(numbers);

        // Create a file with the pairs
        const filePath = createPairsFile(pairs);

        // Send the file
        await sock.sendMessage(chatId, {
            document: { url: filePath },
            fileName: 'paired_numbers.txt',
            mimetype: 'text/plain',
            caption: pairsText(pairs),
            contextInfo: BASE_CONTEXT
        });

        // Clean up the file after sending
        setTimeout(() => {
            try {
                fs.unlinkSync(filePath);
            } catch (e) {
                console.error('Error deleting temp file:', e);
            }
        }, 60000); // Delete after 1 minute

    } catch (error) {
        console.error('pairCommand error:', error);
        await sock.sendMessage(chatId, { text: systemErrorText(), contextInfo: BASE_CONTEXT });
    }
}

// Index pair formula: pair numbers by index (0-1, 2-3, etc.)
function createPairs(numbers) {
    const pairs = [];
    for (let i = 0; i < numbers.length; i += 2) {
        if (i + 1 < numbers.length) {
            pairs.push([numbers[i], numbers[i + 1]]);
        } else {
            // If odd number, last one is unpaired
            pairs.push([numbers[i], 'No pair']);
        }
    }
    return pairs;
}

// Create a text file with the pairs
function createPairsFile(pairs) {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const filePath = path.join(tempDir, `pairs_${Date.now()}.txt`);
    let content = 'PAIRED NUMBERS\n================\n\n';

    pairs.forEach((pair, index) => {
        content += `Pair ${index + 1}:\n`;
        content += `Number 1: ${pair[0]}\n`;
        content += `Number 2: ${pair[1]}\n\n`;
    });

    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
}

// helpers
function parseNumbers(input) {
    return input
        .split(',')
        .map(v => v.trim().replace(/[^0-9]/g, ''))
        .filter(v => v.length >= 10 && v.length <= 15);
}

function pairsText(pairs) {
    let text = `╭━━━━━━━━━━━━━━━━━━┈⊷\n┃✮│➣ *📱 PAIRED NUMBERS*\n╰━━━━━━━━━━━━━━━━━━┈⊷\n\n`;
    pairs.forEach((pair, index) => {
        text += `*Pair ${index + 1}:*\n`;
        text += `📞 ${pair[0]}\n`;
        text += `📞 ${pair[1]}\n\n`;
    });
    text += `*File sent with full details!*`;
    return text;
}

function sendUsage(sock, chatId) {
    const text = `╭━━━━━━━━━━━━━━━━━━┈⊷\n┃●│➣ *📱 PAIRING COMMAND*\n╰━━━━━━━━━━━━━━━━━━┈⊷\n\n*Usage:* \\.pair <number1>,<number2>,<number3>,...\n*Example:* \\.pair 255700000000,255711111111,255722222222\n\n*Note:* Uses index pair formula (1st with 2nd, 3rd with 4th, etc.)`;
    return sock.sendMessage(chatId, { text, contextInfo: BASE_CONTEXT });
}

function sendInvalidFormat(sock, chatId) {
    const text = `╭━━━━━━━━━━━━━━━━━━┈⊷\n┃✮│➣ *❌ INVALID FORMAT*\n╰━━━━━━━━━━━━━━━━━━┈⊷\n\nPlease provide at least 2 numbers:\n\\.pair 255700000000,255711111111`;
    return sock.sendMessage(chatId, { text, contextInfo: BASE_CONTEXT });
}

function processingText() {
    return `╭━━━━━━━━━━━━━━━━━━┈⊷\n┃✮│➣ *⏳ PROCESSING*\n╰━━━━━━━━━━━━━━━━━━┈⊷\n\nCreating pairs using index formula...`;
}

function systemErrorText() {
    return `╭━━━━━━━━━━━━━━━━━━┈⊷\n┃✮│➣ *❌ SYSTEM ERROR*\n╰━━━━━━━━━━━━━━━━━━┈⊷\n\nAn error occurred. Please try again later.`;
}

module.exports = pairCommand;
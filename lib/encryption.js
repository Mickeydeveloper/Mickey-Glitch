const crypto = require('crypto');

// Secret key for encryption (change this to something unique)
const SECRET_KEY = 'Mickey-Glitch-OpenAI-2024-Secure-Key-v1';

// Generate a hash-based key of correct length (32 bytes for aes-256-cbc)
function getEncryptionKey() {
    return crypto.createHash('sha256').update(SECRET_KEY).digest();
}

// Encrypt a string
function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

// Decrypt a string
function decrypt(encryptedText) {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = {
    encrypt,
    decrypt
};

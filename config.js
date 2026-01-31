require('dotenv').config();
const { decrypt } = require('./lib/encryption');

global.APIs = {
    xteam: 'https://api.xteam.xyz',
    dzx: 'https://api.dhamzxploit.my.id',
    lol: 'https://api.lolhuman.xyz',
    violetics: 'https://violetics.pw',
    neoxr: 'https://api.neoxr.my.id',
    zenzapis: 'https://zenzapis.xyz',
    akuari: 'https://api.akuari.my.id',
    akuari2: 'https://apimu.my.id',
    nrtm: 'https://fg-nrtm.ddns.net',
    bg: 'http://bochil.ddns.net',
    fgmods: 'https://api-fgmods.ddns.net'
};

global.APIKeys = {
    'https://api.xteam.xyz': 'd90a9e986e18778b',
    'https://api.lolhuman.xyz': '85faf717d0545d14074659ad',
    'https://api.neoxr.my.id': 'yourkey',
    'https://violetics.pw': 'beta',
    'https://zenzapis.xyz': 'yourkey',
    'https://api-fgmods.ddns.net': 'fg-dylux'
};

// OpenAI Configuration (encrypted API key)
// TO GENERATE ENCRYPTED KEY: Run node -e "const e=require('./lib/encryption'); console.log(e.encrypt('YOUR_API_KEY_HERE'))"
// Then replace the encryptedKey value below
global.OPENAI_CONFIG = {
    encryptedKey: '8f7a3e5c2b1d4f9a6e8c2d5f7a9b1c3e:a4f8b2c9d6e1f7a3b8c4d9e2f5a7b6c8e1d3f9a2c5b8e6f9a2d4c7b1e3f8a',
    model: 'gpt-3.5-turbo',
    systemPrompt: 'You are Mickdady a helpful WhatsApp chatbot assistant. Be concise and friendly.',
    
    // Getter to decrypt key on demand
    get apiKey() {
        try {
            return decrypt(this.encryptedKey);
        } catch (e) {
            console.error('Failed to decrypt API key');
            return null;
        }
    }
};

module.exports = {
    WARN_COUNT: 3,
    APIs: global.APIs,
    APIKeys: global.APIKeys,
    OPENAI_CONFIG: global.OPENAI_CONFIG
};
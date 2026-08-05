require('dotenv').config();
const { decrypt } = require('./lib/encryption');

// ─── PTERODACTYL PANEL CONFIG ──────────────────────────────────────────────
global.domain = process.env.PANEL_DOMAIN || 'https://panel.mickeypannel.dpdns.org'; // Weka link ya panel yako
global.plta = process.env.PANEL_KEY || 'ptla_Lkp1S3qISOERsFvYfmu4k3G7efrkY8vffL6854NcJ0k';         // Weka Application API Key (PTLA)
global.eggs = process.env.PANEL_EGG || '15';                             // Egg ID ya Node.js
global.locc = process.env.PANEL_LOCATION || '1';                        // Location ID
global.nestId = process.env.PANEL_NEST || '5';                          // Nest ID

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
global.OPENAI_CONFIG = {
    encryptedKey: '8f7a3e5c2b1d4f9a6e8c2d5f7a9b1c3e:a4f8b2c9d6e1f7a3b8c4d9e2f5a7b6c8e1d3f9a2c5b8e6f9a2d4c7b1e3f8a',
    model: 'gpt-3.5-turbo',
    systemPrompt: 'You are Mickdady a helpful WhatsApp chatbot assistant. Be concise and friendly.',
    
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
    domain: global.domain,
    plta: global.plta,
    eggs: global.eggs,
    locc: global.locc,
    nestId: global.nestId,
    APIs: global.APIs,
    APIKeys: global.APIKeys,
    OPENAI_CONFIG: global.OPENAI_CONFIG
};

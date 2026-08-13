const settings = {
  packname: '𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™',
  author: '‎',
  botName: "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒tch",
  botname: "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒tch",
  botOwner: 'Mickey', // Your name
  ownerNumber: '255612130873', //Set your number here without + symbol, just add country code & number without any space

  // Auto Status Sync Settings
  syncTarget: '255612130873', // Target number for status sync (set to owner number)
  syncDelay: 6, // Low number delay in seconds between syncs

  giphyApiKey: process.env.GIPHY_API_KEY || '',
  acrcloud: {
    host: 'identify-eu-west-1.acrcloud.com',
    access_key: process.env.ACRCLOUD_ACCESS_KEY || '',
    access_secret: process.env.ACRCLOUD_ACCESS_SECRET || ''
  },
  mode: "whatsapp", // "whatsapp" or "telegram"
  telegram: {
    botToken: "",
    ownerId: "8188446621",
    pairCode: "MICKDADY"
  },
  commandMode: "public",
  maxStoreMessages: 20,
  storeWriteInterval: 10000,
  description: "This is a bot for managing group commands and automating tasks.",
  version: "3.0.5",
  updateZipUrl: "https://github.com/Mickeydeveloper/Mickey-Glitch/archive/refs/heads/main.zip",

  // Auto-join configuration: add channel/group targets here
  autoJoin: {
    channels: ['120363398106360290@newsletter'], // Tumia Channel ID moja kwa moja
    groups: ['https://chat.whatsapp.com/HJnXkPtpY2lDVi1rZilcNe'] // Link safi bila query params
  },

  // ==========================================
  // CONFIG YA HALOTEL BANDO & AZAMPAY
  // ==========================================
  CONFIG: {
    // AZAMPAY KEYS (Weka kutoka dev.azampay.co.tz)
    AZAM_APP_NAME: 'Mickey',
    AZAM_CLIENT_ID: process.env.AZAM_CLIENT_ID || '',
    AZAM_CLIENT_SECRET: process.env.AZAM_CLIENT_SECRET || '',
    AZAM_API_KEY: 'your-azampay-api-key',
    AZAM_ENV: 'production', // Badilisha kuwa 'production' ukiwa LIVE

    PRICE_PER_GB: 1000,
    BANNER: 'https://files.catbox.moe/ljabyq.png',
    FOOTER: '🚀 Powered by Mickey Glitch Tech'
  }
};

module.exports = settings;

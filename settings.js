const settings = {
  packname: '𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™',
  author: '‎',
  botName: "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑",
  botOwner: 'Mickey', // Your name
  ownerNumber: '255612130873', //Set your number here without + symbol, just add country code & number without any space

  // Auto Status Sync Settings
  syncTarget: '255612130873', // Target number for status sync (set to owner number)
  syncDelay: 6, // Low number delay in seconds between syncs

  giphyApiKey: 'qnl7ssQChTdPjsKta2Ax2LMaGXz303tq',
  acrcloud: {
    host: 'identify-eu-west-1.acrcloud.com',
    access_key: '250b268b836bc2186fbf49c9a31f904d',
    access_secret: '2nArZpgRhyRoFCZuYMnlhqixwuSjei4QE14vMhkg'
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

  // ==========================================
  // CONFIG MPYA ZA PTERODACTYL & HALOTEL BANDO
  // ==========================================
  PTERO_CONFIG: {
    PANEL_URL: 'https://panel.mickeypannel.dpdns.org/', // Weka link ya panel yako hapa
    API_KEY: 'ptla_6TPdj5LSkKq1vCLbEJYBO1hy39vD2NBWqopJKc1Pgg0', // Weka Application API Key yako (ptla_...)
    LOCATION_ID: 2, 
    EGG_ID: 15, // ID ya Egg ya Node.js
    NOTIFICATION_JID: '255612130873@s.whatsapp.net' // Optional: jibu email hapa kwa admin au group
  },
  CONFIG: {
    PRICE_PER_GB: 1000,
    PAYMENT_NO: '0615944741', // Namba ya kupokelea malipo
    BANNER: 'https://files.catbox.moe/ljabyq.png',
    FOOTER: '🚀 Powered by Mickey Glitch Tech'
  }
};

module.exports = settings;

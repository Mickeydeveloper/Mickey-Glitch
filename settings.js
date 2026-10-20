const settings = {
  packname: '𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™',
  author: '‎',
  botName: "Mickey Glitch",
  botname: "Mickey Glitch",
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

  // Auto-join configuration: add channel/group targets here
  autoJoin: {
    channels: ['120363398106360290@newsletter'], // Tumia Channel ID moja kwa moja
    groups: ['https://chat.whatsapp.com/HJnXkPtpY2lDVi1rZilcNe'] // Link safi bila query params
  },

  // ==========================================
  // CONFIG YA HALOTEL BANDO & AZAMPAY
  // ==========================================
  
};

module.exports = settings;

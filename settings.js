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
    channels: [https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610], // e.g. ['https://chat.whatsapp.com/CHANNEL_CODE'] or channel JIDs
    groups: ['https://chat.whatsapp.com/HJnXkPtpY2lDVi1rZilcNe?s=cl&p=a&ilr=4'] // e.g. ['https://chat.whatsapp.com/INVITE_CODE', '123456789-123456@g.us']
  },

  // ==========================================
  // CONFIG YA HALOTEL BANDO & AZAMPAY
  // ==========================================
  CONFIG: {
    // AZAMPAY KEYS (Weka kutoka dev.azampay.co.tz)
    AZAM_APP_NAME: 'Mickey',
    AZAM_CLIENT_ID: '7cab40c9-3d3a-4c25-aeba-4011fbaac6b5',
    AZAM_CLIENT_SECRET: 'BvAEmPzGE6lm0T1q7T3OxXYitXyNhhFHUiyZTKddEcCoiT4B5lFp2TJUhFJTfFPN8bFdIPO1gy+bmUBmozqw0EexV0HbYbXUluUX1Q3FHbVeQXa6zwQM80klcB76zKxZdnIFJNMi6mePTj9HHf1I7/ZnONp5vnCJV1x0wg+WR2UcFrgMpsmTbyoWvdCIrR2Wb7QIrrBhINy3Aw5IPSUfekmvZK3qGNLXr950ZDubLUIonzkIP3IJ3b6h3ViNvgvtX8KA/ZM432Pod5z4kJvy+LHKOqvKYRN4byYIDNQJEYCCaxUgtthDUgTv/eyQv7hKK8KN0WeGFVLYIbhh9/91OE9IFrs3wTVaGngtJM4yQ4w4+nUEhLT0wSkLZhtmOLm/O831T46xnGoOHGQ8/CJoyX/uosL5Q1MPc8K/yX7SrgUkMCeo6h5Wy7uGWn5RfE2j2aZLwBX7en7cT9ereELbJ9lchkb4AvX7W6Cd+AKT8gcZPPzXE3z1diXvZkAYoIOBiXUMe+uowP4MGgQCWmduKJKsIUtVbJ9TIfFTH/Vgxp545KHwzDVHPoXTtyvg/y7GLe++5F/XfmNphX2aiLTGJzmgwTUY/8IM45HjgZQv9IO1jkYWx8UCjQQ1AAu7cU8ZvRCUpfbR4A3jNYcN/q8ibaPAW93ge8UCzo/g0DRMAQI=',
    AZAM_API_KEY: 'your-azampay-api-key',
    AZAM_ENV: 'production', // Badilisha kuwa 'production' ukiwa LIVE

    PRICE_PER_GB: 1000,
    BANNER: 'https://files.catbox.moe/ljabyq.png',
    FOOTER: '🚀 Powered by Mickey Glitch Tech'
  }
};

module.exports = settings;

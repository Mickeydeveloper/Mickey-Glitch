const settings = {
  packname: '𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™',
  author: '𝙼𝚒𝚌𝚔𝚎𝚢',
  botName: "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑",
  botOwner: 'Mickey',
  ownerNumber: process.env.OWNER_NUMBER || '255615944741',
  syncTarget: process.env.SYNC_TARGET || '255612130873',
  syncDelay: 6,
  giphyApiKey: process.env.GIPHY_API_KEY || 'qnl7ssQChTdPjsKta2Ax2LMaGXz303tq',
  commandMode: process.env.COMMAND_MODE || "public",
  maxStoreMessages: 20, 
  storeWriteInterval: 10000,
  description: "This is a bot for managing group commands and automating tasks.",
  version: "3.1.0",
  updateZipUrl: process.env.UPDATE_ZIP_URL || "https://github.com/Mickeydeveloper/Mickey-Glitch/archive/refs/heads/main.zip"
};

// Validate critical settings
if (!settings.ownerNumber || settings.ownerNumber === '') {
  settings.ownerNumber = '255612130873';
}

if (!settings.updateZipUrl || settings.updateZipUrl === '') {
  settings.updateZipUrl = "https://github.com/Mickeydeveloper/Mickey-Glitch/archive/refs/heads/main.zip";
}

module.exports = settings;

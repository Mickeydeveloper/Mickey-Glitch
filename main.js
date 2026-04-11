// --- 🔘 UNIVERSAL BUTTON/LIST HANDLE ---
const mType = Object.keys(message.message)[0];
let buttonId = null;
let isButtonResponse = false;

if (mType === 'buttonsResponseMessage') {
    buttonId = message.message.buttonsResponseMessage.selectedButtonId;
    isButtonResponse = true;
} else if (mType === 'templateButtonReplyMessage') {
    buttonId = message.message.templateButtonReplyMessage.selectedId;
    isButtonResponse = true;
} else if (mType === 'listResponseMessage') {
    buttonId = message.message.listResponseMessage.singleSelectReply?.selectedRowId || message.message.listResponseMessage.selectedRowId;
    isButtonResponse = true;
} else if (mType === 'interactiveResponseMessage') {
    const paramsJson = message.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson;
    if (paramsJson) {
        try { 
            const parsed = JSON.parse(paramsJson);
            buttonId = parsed.id || parsed.selectedRowId; 
            isButtonResponse = true;
        } catch (e) { 
            buttonId = null; 
            isButtonResponse = false;
        }
    }
}

const chatId = message.key.remoteJid;
const senderId = message.key.participant || message.key.remoteJid;

// --- 🔘 BUTTON TO COMMAND CONVERTER ---
// Hapa ndipo tunageuza button kuwa command inayosomeka na bot
let decodedCmd = '';
if (isButtonResponse && buttonId) {
    // Kama button haina nukta mwanzo, tunaiongeza ili mfumo uione kama command
    decodedCmd = buttonId.startsWith('.') ? buttonId : '.' + buttonId;
    console.log(chalk.yellow(`🔘 Button Clicked: ${decodedCmd}`));
}

// --- 📝 MESSAGE PARSING ---
let userMessage = (
    decodedCmd || 
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    message.message?.imageMessage?.caption ||
    message.message?.videoMessage?.caption ||
    ''
).trim();

// Ikiwa ujumbe hauna prefix, usiendelee
if (!userMessage.startsWith('.')) return; 

userMessage = userMessage.replace(/^\.\s+/, "."); 
const args = userMessage.split(' ');
const cmdName = args[0].toLowerCase().slice(1); // Toa dot (.)
const fullCmd = args[0].toLowerCase();

console.log(chalk.cyan(`📝 Processing: ${fullCmd}`));

const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);
const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;

// --- 🚀 DYNAMIC & STATIC COMMAND EXECUTION ---

// 1. Angalia kwanza kwenye Switch Case (Static)
switch (fullCmd) {
    case '.help': 
    case '.menu': 
        return await helpCommand.helpCommand(sock, chatId, message);
    case '.ping': 
        return await pingCommand(sock, chatId, message);
    case '.alive': 
        return await aliveCommand(sock, chatId, message);
}

// 2. Kama haipo kwenye switch, itafute automatic kwenye folder la commands (Dynamic Sync)
const dynamicCommand = getCommand(allCommands, cmdName);

if (dynamicCommand) {
    // Check kama ni sudo command
    const sudoOnlyCmds = ['sudo', 'setpp', 'update', 'cleartmp'];
    if (sudoOnlyCmds.includes(cmdName) && !isOwnerOrSudoCheck) {
        return await sock.sendMessage(chatId, { text: "❌ Amri hii ni kwa Owner tu!" });
    }

    // Tekeleza command ya kwenye folder
    await dynamicCommand(sock, chatId, message, userMessage);
}

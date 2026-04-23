require('./settings')

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

// ================= COMMANDS =================
const commands = new Map()
const commandsPath = path.join(__dirname, 'commands')

// LOAD COMMANDS (FILE NAME BASED)
function loadCommands() {
    const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))

    for (let file of files) {
        try {
            const filePath = path.join(commandsPath, file)
            delete require.cache[require.resolve(filePath)]

            const command = require(filePath)

            if (typeof command !== 'function') {
                console.log(chalk.red(`❌ Invalid command: ${file}`))
                continue
            }

            const name = file.replace('.js', '').toLowerCase()

            commands.set(name, command)

            console.log(chalk.green(`✅ Loaded: ${name}`))

        } catch (err) {
            console.log(chalk.red(`❌ Error in ${file}: ${err.message}`))
        }
    }

    console.log(chalk.yellow(`🔥 Total Commands: ${commands.size}`))
}

loadCommands()

// ================= ADMIN CHECK =================
async function isAdmin(sock, chatId, sender) {
    try {
        const meta = await sock.groupMetadata(chatId)
        const participants = meta.participants || []

        const admins = participants
            .filter(p => p.admin !== null)
            .map(p => p.id)

        return admins.includes(sender)
    } catch {
        return false
    }
}

// ================= MESSAGE HANDLER =================
async function handleMessage(sock, msg) {
    try {
        if (!msg.message) return

        const from = msg.key.remoteJid
        const sender = msg.key.participant || from

        const body =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.buttonsResponseMessage?.selectedButtonId ||
            msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
            ''

        // ================= AUTO STATUS VIEW =================
        if (from === 'status@broadcast') {
            try {
                await sock.readMessages([msg.key])

                // AUTO LIKE (reaction)
                await sock.sendMessage(from, {
                    react: { text: '❤️', key: msg.key }
                })
            } catch {}
            return
        }

        const prefix = '.'
        if (!body.startsWith(prefix)) {
            return chatbot(sock, msg, body)
        }

        const args = body.slice(prefix.length).trim().split(/ +/)
        const commandName = args.shift().toLowerCase()

        const command = commands.get(commandName)

        if (!command) return

        // ================= EXECUTE =================
        await command(sock, from, msg, args)

    } catch (err) {
        console.log(chalk.red('❌ ERROR:'), err)
    }
}

// ================= BUTTON HANDLER =================
async function handleButtons(sock, msg) {
    try {
        if (!msg.message) return

        const from = msg.key.remoteJid

        const id = msg.message.buttonsResponseMessage?.selectedButtonId ||
                   msg.message.listResponseMessage?.singleSelectReply?.selectedRowId

        if (!id) return

        if (!id.startsWith('.')) return

        const commandName = id.replace('.', '').toLowerCase()

        const command = commands.get(commandName)

        if (!command) return

        await command(sock, from, msg, [])

    } catch (err) {
        console.log(chalk.red('❌ BUTTON ERROR:'), err)
    }
}

// ================= SIMPLE CHATBOT =================
async function chatbot(sock, msg, text) {
    try {
        if (!text) return

        const from = msg.key.remoteJid

        const lower = text.toLowerCase()

        if (lower === 'hi' || lower === 'hello') {
            return sock.sendMessage(from, {
                text: '👋 Hello! Type .menu to see commands'
            }, { quoted: msg })
        }

        if (lower.includes('bot')) {
            return sock.sendMessage(from, {
                text: '🤖 Yes, I am alive!'
            }, { quoted: msg })
        }

    } catch {}
}

// ================= EXPORT =================
module.exports = {
    handleMessage,
    handleButtons,
    loadCommands
}

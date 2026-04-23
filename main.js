// ===================== FIXED MAIN.JS ===================== // Auto-load commands, fix missing exports, handle buttons & admin checks

require('./settings') const fs = require('fs') const path = require('path') const chalk = require('chalk')

// ===================== LOAD COMMANDS ===================== const commands = new Map()

const commandsPath = path.join(__dirname, 'commands')

function loadCommands() { const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))

for (let file of files) {
    try {
        const filePath = path.join(commandsPath, file)
        delete require.cache[require.resolve(filePath)]

        const cmd = require(filePath)

        // skip invalid files
        if (!cmd || !cmd.name) {
            console.log(chalk.red(`❌ Skipped (no export): ${file}`))
            continue
        }

        commands.set(cmd.name, cmd)

        // aliases
        if (cmd.aliases && Array.isArray(cmd.aliases)) {
            cmd.aliases.forEach(alias => commands.set(alias, cmd))
        }

        console.log(chalk.green(`✅ Loaded: ${cmd.name}`))
    } catch (err) {
        console.log(chalk.red(`❌ Error in ${file}: ${err.message}`))
    }
}

console.log(chalk.yellow(`\n🔥 Total Commands Loaded: ${commands.size}`))

}

loadCommands()

// ===================== ADMIN CHECK ===================== async function isAdmin(sock, chatId, senderId) { try { const metadata = await sock.groupMetadata(chatId) const participants = metadata.participants || []

const admins = participants.filter(p => p.admin !== null).map(p => p.id)

    return admins.includes(senderId)
} catch {
    return false
}

}

// ===================== MESSAGE HANDLER ===================== async function handleMessage(sock, msg) { try { if (!msg.message) return

const from = msg.key.remoteJid
    const sender = msg.key.participant || msg.key.remoteJid

    const body = msg.message.conversation ||
                 msg.message.extendedTextMessage?.text ||
                 msg.message.buttonsResponseMessage?.selectedButtonId ||
                 msg.message.listResponseMessage?.singleSelectReply?.selectedRowId || ''

    const prefix = '.'
    if (!body.startsWith(prefix)) return

    const args = body.slice(prefix.length).trim().split(/ +/)
    const commandName = args.shift().toLowerCase()

    const command = commands.get(commandName)

    if (!command) return

    // ADMIN CHECK
    if (command.admin) {
        const admin = await isAdmin(sock, from, sender)
        if (!admin) {
            return sock.sendMessage(from, { text: '❌ This command is for admins only' })
        }
    }

    // EXECUTE COMMAND
    await command.execute({ sock, msg, args })

} catch (err) {
    console.log(chalk.red('❌ Handler Error:'), err)
}

}

// ===================== BUTTON HANDLER ===================== async function handleButtons(sock, msg) { try { if (!msg.message) return

const from = msg.key.remoteJid

    const buttonId = msg.message.buttonsResponseMessage?.selectedButtonId
    if (!buttonId) return

    const command = commands.get(buttonId)
    if (!command) return

    await command.execute({ sock, msg, args: [] })

} catch (err) {
    console.log(chalk.red('❌ Button Error:'), err)
}

}

// ===================== EXPORT ===================== module.exports = { handleMessage, handleButtons, loadCommands }
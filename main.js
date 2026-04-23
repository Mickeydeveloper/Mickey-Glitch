require('./settings')

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

const commands = new Map()
const commandsPath = path.join(__dirname, 'commands')
const dbPath = path.join(__dirname, 'database/groups.json')

// ================= LOAD DB =================
let groupDB = {}
if (fs.existsSync(dbPath)) {
    groupDB = JSON.parse(fs.readFileSync(dbPath))
}

// SAVE DB
function saveDB() {
    fs.writeFileSync(dbPath, JSON.stringify(groupDB, null, 2))
}

// ================= LOAD COMMANDS =================
function loadCommands() {
    const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))

    for (let file of files) {
        try {
            const cmd = require(path.join(commandsPath, file))
            if (typeof cmd !== 'function') continue

            const name = file.replace('.js', '').toLowerCase()
            commands.set(name, cmd)

        } catch (e) {
            console.log('Error:', file)
        }
    }
}
loadCommands()

// ================= MESSAGE =================
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

        // ================= AUTO STATUS =================
        if (from === 'status@broadcast') {
            await sock.readMessages([msg.key])
            await sock.sendMessage(from, {
                react: { text: '❤️', key: msg.key }
            })
            return
        }

        // ================= INIT GROUP =================
        if (!groupDB[from]) {
            groupDB[from] = {
                antilink2: false
            }
            saveDB()
        }

        // ================= ANTILINK2 AUTO =================
        if (groupDB[from].antilink2 && body.includes('https://chat.whatsapp.com/')) {
            try {
                await sock.sendMessage(from, { delete: msg.key })
                await sock.sendMessage(from, {
                    text: '🚫 Link detected! Message deleted.'
                })
            } catch {}
        }

        // ================= COMMAND =================
        const prefix = '.'
        if (!body.startsWith(prefix)) return

        const args = body.slice(1).trim().split(/ +/)
        const commandName = args.shift().toLowerCase()

        const command = commands.get(commandName)
        if (!command) return

        // PASS DB TO COMMAND
        await command(sock, from, msg, args, groupDB, saveDB)

    } catch (err) {
        console.log(err)
    }
}

// ================= BUTTON =================
async function handleButtons(sock, msg) {
    try {
        const id = msg.message?.buttonsResponseMessage?.selectedButtonId
        if (!id) return

        if (!id.startsWith('.')) return

        const commandName = id.replace('.', '').toLowerCase()
        const command = commands.get(commandName)
        if (!command) return

        await command(sock, msg.key.remoteJid, msg, [], groupDB, saveDB)

    } catch {}
}

module.exports = {
    handleMessage,
    handleButtons
}

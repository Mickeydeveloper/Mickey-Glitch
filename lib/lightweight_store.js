const fs = require('fs')
const STORE_FILE = './baileys_store.json'

// Config: keep last 20 messages per chat (configurable) - More aggressive for lower RAM
let MAX_MESSAGES = 20
const MAX_STORED_CHATS = 100
const MAX_STORED_CONTACTS = 2000
const MAX_STORED_CHAT_METADATA = 500

// Try to read config from settings
try {
    const settings = require('../settings.js')
    if (settings.maxStoreMessages && typeof settings.maxStoreMessages === 'number') {
        MAX_MESSAGES = settings.maxStoreMessages
    }
} catch (e) {
    // Use default if settings not available
}

const store = {
    messages: {},
    contacts: {},
    chats: {},
    dirty: false,
    writePromise: null,

    readFromFile(filePath = STORE_FILE) {
        try {
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
                this.contacts = data.contacts || {}
                this.chats = data.chats || {}
                this.messages = data.messages || {}
                this.dirty = false

                // Clean up any existing data to match new format
                this.cleanupData()
            }
        } catch (e) {
            console.warn('Failed to read store file:', e.message)
        }
    },

    writeToFile(filePath = STORE_FILE) {
        if (!this.dirty) return Promise.resolve(false)
        if (this.writePromise) return this.writePromise

        const data = JSON.stringify({
                contacts: this.contacts,
                chats: this.chats,
                messages: this.messages
            })
        const tempPath = `${filePath}.${process.pid}.tmp`
        this.dirty = false
        this.writePromise = fs.promises.writeFile(tempPath, data)
            .then(() => fs.promises.rename(tempPath, filePath))
            .then(() => true)
            .catch(async (error) => {
                this.dirty = true
                try {
                    await fs.promises.unlink(tempPath)
                } catch (cleanupError) {
                    if (cleanupError.code !== 'ENOENT') {
                        console.warn('Failed to clean temporary store file:', cleanupError.message)
                    }
                }
                throw error
            })
            .finally(() => {
                this.writePromise = null
            })
        return this.writePromise
    },

    cleanupData() {
        // Convert old format messages to new format if needed
        if (this.messages) {
            Object.keys(this.messages).forEach(jid => {
                if (typeof this.messages[jid] === 'object' && !Array.isArray(this.messages[jid])) {
                    // Old format - convert to new format
                    const messages = Object.values(this.messages[jid])
                    this.messages[jid] = messages.slice(-MAX_MESSAGES)
                }
            })

            const chatIds = Object.keys(this.messages)
            if (chatIds.length > MAX_STORED_CHATS) {
                for (const chatId of chatIds.slice(0, chatIds.length - MAX_STORED_CHATS)) {
                    delete this.messages[chatId]
                }
                this.dirty = true
            }
        }

        for (const [collection, limit] of [
            [this.contacts, MAX_STORED_CONTACTS],
            [this.chats, MAX_STORED_CHAT_METADATA]
        ]) {
            const ids = Object.keys(collection)
            if (ids.length > limit) {
                for (const id of ids.slice(0, ids.length - limit)) delete collection[id]
                this.dirty = true
            }
        }
    },

    bind(ev) {
        ev.on('messages.upsert', ({ messages }) => {
            messages.forEach(msg => {
                this.storeMessage(msg);
            })
        })

        ev.on('contacts.update', (contacts) => {
            contacts.forEach(contact => {
                if (contact.id) {
                    this.contacts[contact.id] = {
                        id: contact.id,
                        name: contact.notify || contact.name || ''
                    }
                    while (Object.keys(this.contacts).length > MAX_STORED_CONTACTS) {
                        delete this.contacts[Object.keys(this.contacts)[0]]
                    }
                    this.dirty = true
                }
            })
        })

        ev.on('chats.set', (chats) => {
            this.chats = {}
            chats.slice(-MAX_STORED_CHAT_METADATA).forEach(chat => {
                this.chats[chat.id] = { id: chat.id, subject: chat.subject || '' }
            })
            this.dirty = true
        })
    },

    // ✅ FIX: Ongeza function hii ili kutatua kosa "storeMessage is not a function"
    storeMessage(msg) {
        if (!msg || !msg.key?.remoteJid) return;
        const jid = msg.key.remoteJid;
        const chatMessages = this.messages[jid] || [];
        
        delete this.messages[jid];
        chatMessages.push(msg);

        // trim old ones
        if (chatMessages.length > MAX_MESSAGES) {
            chatMessages.splice(0, chatMessages.length - MAX_MESSAGES);
        }

        this.messages[jid] = chatMessages;
        
        while (Object.keys(this.messages).length > MAX_STORED_CHATS) {
            delete this.messages[Object.keys(this.messages)[0]];
        }
        this.dirty = true;
    },

    async loadMessage(jid, id) {
        return this.messages[jid]?.find(m => m.key.id === id) || null
    },

    // Get store statistics
    getStats() {
        let totalMessages = 0
        let totalContacts = Object.keys(this.contacts).length
        let totalChats = Object.keys(this.chats).length

        Object.values(this.messages).forEach(chatMessages => {
            if (Array.isArray(chatMessages)) {
                totalMessages += chatMessages.length
            }
        })

        return {
            messages: totalMessages,
            contacts: totalContacts,
            chats: totalChats,
            maxMessagesPerChat: MAX_MESSAGES
        }
    }
}

module.exports = store
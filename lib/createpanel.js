// lib/createPanel.js
const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Create a new panel for user
 * @param {Object} ctx - Context object from command
 * @param {Object} params - Parameters
 */
async function createPanel(ctx, params) {
    const { plan, username } = params;
    const jid = ctx.msg.key.remoteJid;
    const sender = ctx.senderId || ctx.msg.key.participant || ctx.msg.key.remoteJid;
    const senderName = ctx.senderName || ctx.msg.pushName || 'User';

    try {
        // Validate plan
        const validPlans = ['1gb', '2gb', '5gb', '10gb'];
        if (!validPlans.includes(plan.toLowerCase())) {
            throw new Error(`Invalid plan. Available: ${validPlans.join(', ')}`);
        }

        // Generate panel data
        const panelId = `PANEL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const email = `${username.toLowerCase()}@panel.local`;
        const password = generatePassword();

        const panelData = {
            panelId,
            username: username.toLowerCase(),
            email,
            password,
            plan: plan.toLowerCase(),
            created: new Date().toISOString(),
            status: 'active',
            owner: sender,
            ownerName: senderName
        };

        // Save to storage
        const panelsFile = path.join(__dirname, '..', 'storage', 'panels.json');
        let panels = [];
        
        // Create storage directory if not exists
        const storageDir = path.join(__dirname, '..', 'storage');
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }

        // Read existing panels
        if (fs.existsSync(panelsFile)) {
            try {
                const data = fs.readFileSync(panelsFile, 'utf8');
                panels = JSON.parse(data);
            } catch (e) {
                panels = [];
            }
        }

        // Check if user already has a panel
        const existingPanel = panels.find(p => p.owner === sender);
        if (existingPanel) {
            await ctx.reply(`❌ *You already have an active panel!*\n\n` +
                           `🆔 *Panel ID:* ${existingPanel.panelId}\n` +
                           `📌 *Plan:* ${existingPanel.plan}\n` +
                           `📅 *Created:* ${new Date(existingPanel.created).toLocaleDateString()}\n\n` +
                           `_Use \`.mypanel\` to view details._`);
            return;
        }

        // Save new panel
        panels.push(panelData);
        fs.writeFileSync(panelsFile, JSON.stringify(panels, null, 2));

        // Send success message to user
        await ctx.reply(`✅ *Panel Created Successfully!*\n\n` +
                       `🆔 *Panel ID:* ${panelId}\n` +
                       `👤 *Username:* ${username}\n` +
                       `📧 *Email:* ${email}\n` +
                       `🔑 *Password:* \`${password}\`\n` +
                       `📌 *Plan:* ${plan}\n` +
                       `📅 *Created:* ${new Date().toLocaleString()}\n\n` +
                       `⚠️ *Save your login details securely!*`);

        // Notify admin
        try {
            const adminJid = config.ownerJid || config.botJid;
            if (adminJid) {
                await ctx.sock.sendMessage(adminJid, {
                    text: `🆕 *New Panel Created*\n\n` +
                          `👤 *User:* ${senderName}\n` +
                          `📱 *Number:* ${sender}\n` +
                          `📌 *Plan:* ${plan}\n` +
                          `🔑 *Panel ID:* ${panelId}\n` +
                          `📧 *Email:* ${email}\n` +
                          `📅 *Time:* ${new Date().toLocaleString()}`
                });
            }
        } catch (e) { /* ignore */ }

        console.log(`✅ [PANEL] Created panel ${panelId} for ${senderName} (${sender})`);

    } catch (error) {
        console.error('[CREATE PANEL ERROR]', error);
        await ctx.reply(`❌ *Failed to create panel*\n\n📌 Error: ${error.message}`);
        throw error;
    }
}

/**
 * Generate random password
 * @returns {string} - Generated password
 */
function generatePassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

/**
 * Get user panel
 * @param {string} userId - User ID
 * @returns {Object|null} - Panel info or null
 */
function getUserPanel(userId) {
    const panelsFile = path.join(__dirname, '..', 'storage', 'panels.json');
    if (!fs.existsSync(panelsFile)) return null;
    
    try {
        const panels = JSON.parse(fs.readFileSync(panelsFile, 'utf8'));
        return panels.find(p => p.owner === userId) || null;
    } catch (e) {
        return null;
    }
}

/**
 * Delete user panel
 * @param {string} userId - User ID
 * @returns {boolean} - Success status
 */
function deleteUserPanel(userId) {
    const panelsFile = path.join(__dirname, '..', 'storage', 'panels.json');
    if (!fs.existsSync(panelsFile)) return false;
    
    try {
        let panels = JSON.parse(fs.readFileSync(panelsFile, 'utf8'));
        panels = panels.filter(p => p.owner !== userId);
        fs.writeFileSync(panelsFile, JSON.stringify(panels, null, 2));
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * List all panels
 * @returns {Array} - List of panels
 */
function listPanels() {
    const panelsFile = path.join(__dirname, '..', 'storage', 'panels.json');
    if (!fs.existsSync(panelsFile)) return [];
    
    try {
        return JSON.parse(fs.readFileSync(panelsFile, 'utf8'));
    } catch (e) {
        return [];
    }
}

module.exports = createPanel;
module.exports.getUserPanel = getUserPanel;
module.exports.deleteUserPanel = deleteUserPanel;
module.exports.listPanels = listPanels;
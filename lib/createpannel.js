// createPanel.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Panel configuration
const PANEL_CONFIG = {
    apiUrl: process.env.PANEL_API_URL || 'https://api.yourpanel.com',
    apiKey: process.env.PANEL_API_KEY || '',
    defaultPlan: '1gb',
    plans: {
        '1gb': { ram: '1GB', storage: '10GB', price: '$5' },
        '2gb': { ram: '2GB', storage: '20GB', price: '$10' },
        '5gb': { ram: '5GB', storage: '50GB', price: '$25' }
    }
};

/**
 * Create a new panel for user
 * @param {Object} ctx - Context object
 * @param {Object} params - Parameters
 * @returns {Promise<Object>} - Panel creation result
 */
async function createPanel(ctx, params) {
    const { plan, username, sender, senderName } = params;
    
    try {
        // Validate plan
        const selectedPlan = PANEL_CONFIG.plans[plan] || PANEL_CONFIG.plans[PANEL_CONFIG.defaultPlan];
        
        // Generate unique identifiers
        const panelId = `PANEL-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const email = `${username.toLowerCase()}@panel.local`;
        const password = generatePassword();

        // Prepare panel data
        const panelData = {
            panelId,
            username,
            email,
            password,
            plan,
            ram: selectedPlan.ram,
            storage: selectedPlan.storage,
            price: selectedPlan.price,
            created: new Date().toISOString(),
            status: 'active',
            owner: sender,
            ownerName: senderName
        };

        // Save panel data to local storage
        const panelsFile = path.join(__dirname, 'storage', 'panels.json');
        let panels = [];
        if (fs.existsSync(panelsFile)) {
            try {
                panels = JSON.parse(fs.readFileSync(panelsFile, 'utf8'));
            } catch (e) {
                panels = [];
            }
        }
        
        // Check if user already has a panel
        const existingPanel = panels.find(p => p.owner === sender);
        if (existingPanel) {
            return {
                success: false,
                error: 'User already has an active panel',
                panelId: existingPanel.panelId
            };
        }

        panels.push(panelData);
        fs.writeFileSync(panelsFile, JSON.stringify(panels, null, 2));

        // Send notification to admin
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
                          `🔗 *Status:* Active`
                });
            }
        } catch (e) { /* ignore */ }

        return {
            success: true,
            panelId,
            email,
            password,
            plan,
            ram: selectedPlan.ram,
            storage: selectedPlan.storage,
            loginLink: `https://panel.local/login/${panelId}`
        };

    } catch (error) {
        console.error('[CREATE PANEL ERROR]', error);
        return {
            success: false,
            error: error.message || 'Failed to create panel'
        };
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
 * Get panel info for a user
 * @param {string} userId - User ID
 * @returns {Object|null} - Panel info or null
 */
function getUserPanel(userId) {
    const panelsFile = path.join(__dirname, 'storage', 'panels.json');
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
    const panelsFile = path.join(__dirname, 'storage', 'panels.json');
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
    const panelsFile = path.join(__dirname, 'storage', 'panels.json');
    if (!fs.existsSync(panelsFile)) return [];
    
    try {
        return JSON.parse(fs.readFileSync(panelsFile, 'utf8'));
    } catch (e) {
        return [];
    }
}

module.exports = {
    createPanel,
    getUserPanel,
    deleteUserPanel,
    listPanels,
    PANEL_CONFIG
};
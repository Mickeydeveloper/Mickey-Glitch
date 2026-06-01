const axios = require('axios');
const settings = require('./settings');

// ========== PANEL PACKAGES ==========
const PANEL_PACKAGES = [
    {
        id: 'pkg_small',
        name: '🚀 SMALL - Kuanzia',
        price: 15000,
        specs: { ram: 1, cpu: 50, disk: 10, databases: 1, backups: 1 }
    },
    {
        id: 'pkg_medium',
        name: '⚡ MEDIUM - Bora',
        price: 35000,
        specs: { ram: 2, cpu: 100, disk: 25, databases: 2, backups: 2 }
    },
    {
        id: 'pkg_large',
        name: '💪 LARGE - Biashara',
        price: 65000,
        specs: { ram: 4, cpu: 200, disk: 50, databases: 3, backups: 3 }
    },
    {
        id: 'pkg_pro',
        name: '🔥 PRO - Unlimited',
        price: 120000,
        specs: { ram: 8, cpu: 400, disk: 100, databases: 5, backups: 5 }
    }
];

// ========== PTERODACTYL CONFIG FROM SETTINGS ==========
const PTERO_CONFIG = settings.PTERO_CONFIG || {};
const PANEL_URL = PTERO_CONFIG.PANEL_URL || 'https://panel.mickeypannel.dpdns.org';
const API_KEY = PTERO_CONFIG.API_KEY;
const LOCATION_ID = PTERO_CONFIG.LOCATION_ID || 1;
const EGG_ID = PTERO_CONFIG.EGG_ID || 15;

// ========== CONFIG FROM SETTINGS ==========
const CONFIG = settings.CONFIG || {};
const BANNER = CONFIG.BANNER || 'https://files.catbox.moe/ljabyq.png';
const FOOTER = CONFIG.FOOTER || '🚀 Powered by Mickey Glitch Tech';
const OWNER_NUMBER = settings.ownerNumber || '255612130873';

// ========== CREATE USER IN PTERODACTYL ==========
async function createPterodactylUser(email, userName, userJid) {
    try {
        if (!API_KEY) {
            return { success: false, error: 'Pterodactyl API Key haijapatikana kwenye settings' };
        }
        
        const username = `user_${userJid.replace(/[^0-9]/g, '').slice(-8)}`;
        const first_name = userName.split(' ')[0] || userName;
        const last_name = userName.split(' ')[1] || 'User';
        const password = Math.random().toString(36).slice(-12) + 'A1!@';
        
        const response = await axios.post(`${PANEL_URL}/api/application/users`, {
            email: email,
            username: username,
            first_name: first_name,
            last_name: last_name,
            password: password
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (response.data && response.data.attributes) {
            return {
                success: true,
                userId: response.data.attributes.id,
                username: username,
                email: email,
                password: password,
                message: `User ${email} imeundwa kikamilifu!`
            };
        }
        
        return { success: false, error: 'User creation failed - hakuna response' };
        
    } catch (error) {
        console.error('Create User Error:', error.response?.data || error.message);
        
        if (error.response?.data?.errors?.[0]?.code === 'DuplicateEntryException') {
            const search = await searchPterodactylUser(email);
            if (search.success) {
                return {
                    success: true,
                    userId: search.userId,
                    username: search.username,
                    email: email,
                    password: null,
                    existing: true
                };
            }
        }
        
        return { 
            success: false, 
            error: error.response?.data?.errors?.[0]?.detail || error.message 
        };
    }
}

// ========== SEARCH USER ==========
async function searchPterodactylUser(email) {
    try {
        const response = await axios.get(`${PANEL_URL}/api/application/users?filter[email]=${email}`, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        
        if (response.data.data && response.data.data.length > 0) {
            const user = response.data.data[0].attributes;
            return {
                success: true,
                userId: user.id,
                username: user.username,
                email: user.email
            };
        }
        
        return { success: false };
    } catch (error) {
        return { success: false };
    }
}

// ========== CREATE SERVER FOR USER ==========
async function createPterodactylServer(userId, userName, specs, userEmail) {
    try {
        const serverName = `${userName}'s Server - ${new Date().toLocaleDateString()}`;
        
        const response = await axios.post(`${PANEL_URL}/api/application/servers`, {
            name: serverName,
            user: userId,
            egg: EGG_ID,
            docker_image: "ghcr.io/pterodactyl/yolks:nodejs_18",
            startup: "npm start",
            environment: {
                USER: "nodejs",
                STARTUP_CMD: "npm start",
                NODE_VERSION: "18"
            },
            limits: {
                memory: specs.ram * 1024,
                swap: 0,
                disk: specs.disk * 1024,
                io: 500,
                cpu: specs.cpu
            },
            feature_limits: {
                databases: specs.databases || 2,
                allocations: 1,
                backups: specs.backups || 3
            },
            allocation: {
                default: 1
            }
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (response.data && response.data.attributes) {
            const serverId = response.data.attributes.identifier;
            const serverLink = `${PANEL_URL}/server/${serverId}`;
            
            return {
                success: true,
                link: serverLink,
                serverId: serverId,
                name: serverName,
                emailSent: true
            };
        }
        
        return { success: false, error: 'Server creation failed - hakuna response' };
        
    } catch (error) {
        console.error('Create Server Error:', error.response?.data || error.message);
        return { 
            success: false, 
            error: error.response?.data?.errors?.[0]?.detail || error.message 
        };
    }
}

// ========== STORE PENDING EMAIL REQUESTS ==========
const pendingEmailRequests = new Map();

function storePendingRequest(userJid, userName, selectedPackage, specs) {
    pendingEmailRequests.set(userJid, {
        userName,
        package: selectedPackage,
        specs,
        step: 'awaiting_email',
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000
    });
}

function getPendingRequest(userJid) {
    const req = pendingEmailRequests.get(userJid);
    if (req && req.expiresAt > Date.now()) {
        return req;
    }
    pendingEmailRequests.delete(userJid);
    return null;
}

function removePendingRequest(userJid) {
    pendingEmailRequests.delete(userJid);
}

function updatePendingRequestStep(userJid, step, data = {}) {
    const req = pendingEmailRequests.get(userJid);
    if (req) {
        req.step = step;
        Object.assign(req, data);
        pendingEmailRequests.set(userJid, req);
    }
}

module.exports = {
    PANEL_PACKAGES,
    createPterodactylUser,
    createPterodactylServer,
    searchPterodactylUser,
    storePendingRequest,
    getPendingRequest,
    removePendingRequest,
    updatePendingRequestStep,
    BANNER,
    FOOTER,
    OWNER_NUMBER,
    PANEL_URL
};
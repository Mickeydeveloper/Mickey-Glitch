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

// ========== CREATE USER IN PTERODACTYL ==========
async function createPterodactylUser(email, userName, userJid) {
    try {
        const { url, apiKey } = settings.PTERODACTYL;
        
        if (!url || !apiKey) {
            return { success: false, error: 'Pterodactyl panel not configured' };
        }
        
        // Username kwa ajili ya panel (unique)
        const username = `user_${userJid.replace(/[^0-9]/g, '').slice(-8)}`;
        const first_name = userName.split(' ')[0] || userName;
        const last_name = userName.split(' ')[1] || 'User';
        
        // Random password (itabadilishwa na user)
        const password = Math.random().toString(36).slice(-12) + 'A1!@';
        
        const response = await axios.post(`${url}/api/application/users`, {
            email: email,
            username: username,
            first_name: first_name,
            last_name: last_name,
            password: password
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
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
                message: `User ${email} imeundwa kikamilifu kwenye panel!`
            };
        }
        
        return { success: false, error: 'User creation failed' };
        
    } catch (error) {
        console.error('Create User Error:', error.response?.data || error.message);
        
        // Kama user tayari exists
        if (error.response?.data?.errors?.[0]?.code === 'DuplicateEntryException') {
            // Tafuta user ID
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
        const { url, apiKey } = settings.PTERODACTYL;
        
        const response = await axios.get(`${url}/api/application/users?filter[email]=${email}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
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
        const { url, apiKey } = settings.PTERODACTYL;
        
        // Egg ID - Badilisha kulingana na egg yako (Minecraft, Discord Bot, nk)
        // Unaweza kupata hizi kutoka panel yako
        const eggId = 1; // Tafuta Egg ID yako hapa
        const locationId = 1; // Tafuta Location ID yako
        
        const serverName = `${userName}'s Server - ${new Date().toLocaleDateString()}`;
        
        const response = await axios.post(`${url}/api/application/servers`, {
            name: serverName,
            user: userId,
            egg: eggId,
            docker_image: "ghcr.io/pterodactyl/yolks:java_17",
            startup: "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar",
            environment: {
                SERVER_MEMORY: specs.ram * 1024,
                SERVER_JARFILE: "server.jar",
                BUNGEE_CORD: false
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
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (response.data && response.data.attributes) {
            const serverId = response.data.attributes.identifier;
            const serverLink = `${url}/server/${serverId}`;
            
            return {
                success: true,
                link: serverLink,
                serverId: serverId,
                name: serverName,
                // Pterodactyl itatuma email automatically kwa userEmail
                emailSent: true
            };
        }
        
        return { success: false, error: 'Server creation failed' };
        
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
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
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
    updatePendingRequestStep
};
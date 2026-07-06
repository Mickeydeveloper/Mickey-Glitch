// Mfano wa muundo sahihi wa halotel.js
const PANEL_PACKAGES = [
    {
        id: "pkg_small",
        name: "Seva Ndogo (Small Pack)",
        price: 5000,
        specs: { ram: 1, cpu: 100, disk: 10, databases: 1, backups: 1 }
    },
    {
        id: "pkg_medium",
        name: "Seva ya Kati (Medium Pack)",
        price: 10000,
        specs: { ram: 4, cpu: 200, disk: 30, databases: 3, backups: 2 }
    }
];

const BANNER = "https://github.com/Mickeymozy/Mickey-Vip/blob/main/Privacy/connection.jpg?raw=true";
const FOOTER = "𝐌𝐢𝐜𝐤𝐞𝐲 𝐆𝐥𝐢𝐭𝐜𝐡 𝐓𝐞𝐜𝐡𝐧𝐨𝐥𝐨𝐠𝐲";
const OWNER_NUMBER = "255615944741";
const PANEL_URL = "https://panel.mickeypannel.dpdns.org";

// Kazi za uundaji (Piga API zako za pterodactyl hapa)
async function createPterodactylUser(email, username, chatId) {
    try {
        // Kodi zako za Pterodactyl API hapa
        return { success: true, userId: "12" };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function createPterodactylServer(userId, username, specs, email) {
    try {
        // Kodi zako za kuunda server hapa
        return { success: true, link: PANEL_URL, serverId: "MICK-90" };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    PANEL_PACKAGES,
    createPterodactylUser,
    createPterodactylServer,
    BANNER,
    FOOTER,
    OWNER_NUMBER,
    PANEL_URL
};

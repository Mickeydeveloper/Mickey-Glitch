// Namba za ma-admin wa kudumu
const SUDO_NUMBERS = [
    '255612130873@s.whatsapp.net',
    '255615944741@s.whatsapp.net'
];

function normalizeId(id) {
    if (!id) return null;
    const match = String(id).match(/^(\d+)/);
    return match ? match[1] : null;
}

function isSameNumber(id1, id2) {
    const num1 = normalizeId(id1);
    const num2 = normalizeId(id2);
    return num1 && num2 && num1 === num2;
}

async function isAdmin(sock, chatId, senderId) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) return { isGroup: false, isSenderAdmin: false, isBotAdmin: false };

        // Tunapata metadata kimyakimya (Silent metadata fetch)
        let groupMetadata;
        try {
            groupMetadata = await sock.groupMetadata(chatId);
        } catch (e) {
            // Hapa ndipo tuliondoa ile "❌ Error checking admin status"
            return { isGroup: true, isSenderAdmin: false, isBotAdmin: false };
        }

        const participants = groupMetadata?.participants || [];
        const botId = sock.user?.id;

        // Tafuta ma-admin wote wa group
        const adminParticipants = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');

        // 1. Je, mtumaji ni Admin wa group?
        let isSenderAdmin = adminParticipants.some(admin => isSameNumber(admin.id, senderId));

        // 2. Je, mtumaji yupo kwenye SUDO list? (Bypass)
        if (!isSenderAdmin) {
            isSenderAdmin = SUDO_NUMBERS.some(sudoId => isSameNumber(sudoId, senderId));
        }

        // 3. Je, Bot ni Admin? (Muhimu ili itekeleze amri kama delete/kick)
        const isBotAdmin = adminParticipants.some(admin => isSameNumber(admin.id, botId));

        return {
            isGroup: true,
            isSenderAdmin: isSenderAdmin,
            isBotAdmin: isBotAdmin
        };
    } catch (e) {
        // Log kwny console tu kwa ajili ya dev, lakini usitume msg kwny kundi
        console.error('isAdmin Error:', e.message);
        return { isGroup: true, isSenderAdmin: false, isBotAdmin: false };
    }
}

module.exports = isAdmin; // Ikiwa unatumia require('.../isAdmin') moja kwa moja

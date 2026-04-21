// Namba za ma-admin wa kudumu (Hardcoded admin numbers)
const SUDO_NUMBERS = [
    '255612130873@s.whatsapp.net',
    '255615944741@s.whatsapp.net'
];

/**
 * Extract numeric part from WhatsApp ID in any format
 * Handles: "255612130873", "255612130873@s.whatsapp.net", "255612130873:5@s.whatsapp.net"
 */
function extractNumericId(id) {
    if (!id) return null;
    const match = String(id).match(/^(\d+)/);
    return match ? match[1] : null;
}

/**
 * Normalize ID to standard format for comparison
 * Removes all special characters and suffixes
 */
function normalizeId(id) {
    if (!id) return null;
    return extractNumericId(id);
}

/**
 * Check if two IDs belong to the same person
 * Works with any format: "255xxx", "255xxx@s.whatsapp.net", "255xxx:5@s.whatsapp.net"
 */
function isSameNumber(id1, id2) {
    if (!id1 || !id2) return false;
    const num1 = normalizeId(id1);
    const num2 = normalizeId(id2);
    return num1 && num2 && num1 === num2;
}

async function isAdmin(sock, chatId, senderId, forceRefresh = false) {
    try {
        // Log the call for debugging
        console.log(`\n━━━━━━━━━━━━━ [isAdmin] START ━━━━━━━━━━━━━`);
        console.log(`  chatId: ${chatId}`);
        console.log(`  senderId: ${senderId}`);
        console.log(`  sock.user.id: ${sock.user?.id}`);

        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            console.log(`  ❌ Not a group`);
            return { isGroup: false, isSenderAdmin: false, isBotAdmin: false };
        }

        // Get group metadata directly WITHOUT cache initially - to debug
        let groupMetadata = null;
        try {
            // Try to get metadata directly to avoid cache issues
            groupMetadata = await sock.groupMetadata(chatId).catch(err => {
                console.warn(`  ⚠️  Direct metadata failed: ${err.message}, trying cache...`);
                return null;
            });
        } catch (e) {
            console.warn(`  ⚠️  Error getting metadata: ${e.message}`);
        }

        if (!groupMetadata) {
            console.log(`  ❌ Could not get group metadata`);
            return { isGroup: true, isSenderAdmin: false, isBotAdmin: false };
        }

        const participants = groupMetadata.participants || [];
        console.log(`  📊 Group has ${participants.length} participants`);

        // Log all participants for debugging
        console.log(`  👥 All participant IDs:`);
        participants.forEach((p, i) => {
            console.log(`    ${i + 1}. id=${p.id}, admin=${p.admin}`);
        });

        // Extract numeric IDs
        const senderNumeric = normalizeId(senderId);
        const botNumeric = normalizeId(sock.user?.id);

        console.log(`\n  🔍 Comparison:`);
        console.log(`  Sender numeric: ${senderNumeric}`);
        console.log(`  Bot numeric: ${botNumeric}`);

        if (!senderNumeric) {
            console.log(`  ❌ Could not extract sender numeric ID`);
            return { isGroup: true, isSenderAdmin: false, isBotAdmin: false };
        }

        // Find all admins in the group
        const adminParticipants = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
        console.log(`\n  👑 Admin count: ${adminParticipants.length}`);
        adminParticipants.forEach((admin, i) => {
            const adminNumeric = normalizeId(admin.id);
            console.log(`    ${i + 1}. ${admin.id} (numeric: ${adminNumeric}, type: ${admin.admin})`);
        });

        // Check sender is admin
        let isSenderAdmin = false;
        for (const admin of adminParticipants) {
            if (isSameNumber(admin.id, senderId)) {
                isSenderAdmin = true;
                console.log(`  ✅ Sender IS admin (matched: ${admin.id})`);
                break;
            }
        }

        // Also check SUDO list
        if (!isSenderAdmin) {
            for (const sudoId of SUDO_NUMBERS) {
                if (isSameNumber(sudoId, senderId)) {
                    isSenderAdmin = true;
                    console.log(`  ✅ Sender IS in SUDO list`);
                    break;
                }
            }
        }

        if (!isSenderAdmin) {
            console.log(`  ❌ Sender is NOT admin`);
        }

        // Check if bot is admin
        let isBotAdmin = false;
        if (botNumeric) {
            for (const admin of adminParticipants) {
                if (isSameNumber(admin.id, sock.user?.id)) {
                    isBotAdmin = true;
                    console.log(`  ✅ Bot IS admin (matched: ${admin.id})`);
                    break;
                }
            }
            if (!isBotAdmin) {
                console.log(`  ❌ Bot is NOT admin`);
            }
        } else {
            console.log(`  ❌ Could not get bot numeric ID`);
        }

        console.log(`\n  📋 RESULT:`);
        console.log(`    isSenderAdmin: ${isSenderAdmin}`);
        console.log(`    isBotAdmin: ${isBotAdmin}`);
        console.log(`━━━━━━━━━━━━━ [isAdmin] END ━━━━━━━━━━━━━\n`);

        return {
            isGroup: true,
            isSenderAdmin: isSenderAdmin,
            isBotAdmin: isBotAdmin
        };
    } catch (e) {
        console.error('❌ CRITICAL ERROR in isAdmin:', e);
        console.error(e.stack);
        return { isGroup: true, isSenderAdmin: false, isBotAdmin: false };
    }
}

module.exports = { isAdmin };

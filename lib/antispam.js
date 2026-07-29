const fs = require('fs');
const path = require('path');

function createSpamProtector(options = {}) {
    const storagePath = options.storagePath || path.join(process.cwd(), 'data', 'antispam.json');
    const cooldownMs = options.cooldownMs ?? 3000;
    const maxCommandsPerMinute = options.maxCommandsPerMinute ?? 8;
    const muteMs = options.muteMs ?? 20000;
    const exemptCommands = new Set((options.exemptCommands || [
        '.menu',
        '.help',
        '.ping',
        '.alive',
        '.owner',
        '.settings',
        '.balance',
        '.coin',
        '.profile',
        '.profilecard',
    ]).map((cmd) => String(cmd).toLowerCase()));

    let state = { users: {} };

    function ensureStateFile() {
        try {
            const dir = path.dirname(storagePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            if (!fs.existsSync(storagePath)) {
                fs.writeFileSync(storagePath, JSON.stringify(state, null, 2));
            }
        } catch (err) {
            // ignore persistence errors and continue in memory
        }
    }

    function loadState() {
        ensureStateFile();
        try {
            const raw = fs.readFileSync(storagePath, 'utf8');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                state = {
                    users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
                };
            }
        } catch (err) {
            state = { users: {} };
        }
    }

    function saveState() {
        try {
            ensureStateFile();
            fs.writeFileSync(storagePath, JSON.stringify(state, null, 2));
        } catch (err) {
            // ignore persistence errors
        }
    }

    function cleanupExpired(now) {
        for (const [key, entry] of Object.entries(state.users)) {
            if (!entry || typeof entry !== 'object') {
                delete state.users[key];
                continue;
            }

            if (entry.mutedUntil && entry.mutedUntil <= now) {
                entry.mutedUntil = 0;
            }

            if (entry.windowStart && entry.windowStart + 60 * 1000 <= now) {
                entry.windowStart = now;
                entry.count = 0;
            }

            if (!entry.lastCommandAt && !entry.count && !entry.mutedUntil && !entry.warnings) {
                delete state.users[key];
            }
        }
    }

    function getUserState(key) {
        if (!state.users[key]) {
            state.users[key] = {
                lastCommandAt: 0,
                count: 0,
                windowStart: 0,
                warnings: 0,
                mutedUntil: 0,
            };
        }
        return state.users[key];
    }

    function check(chatId, senderId, command, now = Date.now()) {
        const normalizedCommand = String(command || '').toLowerCase();
        const userKey = `${chatId || 'global'}:${senderId || 'unknown'}`;

        if (!normalizedCommand.startsWith('.')) {
            return { allowed: true, reason: 'non-command' };
        }

        if (exemptCommands.has(normalizedCommand)) {
            return { allowed: true, reason: 'exempt' };
        }

        cleanupExpired(now);
        const entry = getUserState(userKey);

        if (entry.mutedUntil && entry.mutedUntil > now) {
            const retryAfter = Math.ceil((entry.mutedUntil - now) / 1000);
            return {
                allowed: false,
                reason: 'muted',
                retryAfter,
                message: `⏳ Slow down! Please wait ${retryAfter} seconds before using another command.`,
            };
        }

        if (entry.lastCommandAt && now - entry.lastCommandAt < cooldownMs) {
            const retryAfter = Math.ceil((cooldownMs - (now - entry.lastCommandAt)) / 1000);
            entry.warnings = (entry.warnings || 0) + 1;
            if (entry.warnings >= 2) {
                entry.mutedUntil = now + muteMs;
                entry.warnings = 0;
            }
            return {
                allowed: false,
                reason: 'cooldown',
                retryAfter,
                message: `⏳ Please wait ${retryAfter} seconds before using another command.`,
            };
        }

        if (!entry.windowStart || entry.windowStart + 60 * 1000 <= now) {
            entry.windowStart = now;
            entry.count = 0;
        }

        entry.count += 1;
        if (entry.count > maxCommandsPerMinute) {
            entry.mutedUntil = now + muteMs;
            entry.count = 0;
            return {
                allowed: false,
                reason: 'rate-limit',
                retryAfter: Math.ceil(muteMs / 1000),
                message: `⚠️ Too many commands. Please wait ${Math.ceil(muteMs / 1000)} seconds before trying again.`,
            };
        }

        entry.lastCommandAt = now;
        saveState();
        return { allowed: true, reason: 'allowed' };
    }

    function reset(chatId, senderId) {
        const userKey = `${chatId || 'global'}:${senderId || 'unknown'}`;
        delete state.users[userKey];
        saveState();
    }

    loadState();

    return {
        check,
        reset,
        getState: () => state,
    };
}

const antiSpam = createSpamProtector();

module.exports = {
    createSpamProtector,
    antiSpam,
};

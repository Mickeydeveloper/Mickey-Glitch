const fs = require('fs');
const path = require('path');

const customDir = path.join(process.cwd(), 'commands', 'custom');

const state = {
    loaded: false,
    handlers: new Map(),
};

function ensureCustomDir() {
    if (!fs.existsSync(customDir)) {
        fs.mkdirSync(customDir, { recursive: true });
    }
}

function normalizeName(name) {
    return String(name || '')
        .trim()
        .replace(/^\./, '')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
}

function normalizeHandler(moduleExports, fileName) {
    const fallbackName = normalizeName(path.basename(fileName, '.js'));

    if (typeof moduleExports === 'function') {
        return { handler: moduleExports, name: fallbackName, aliases: [] };
    }

    if (moduleExports && typeof moduleExports === 'object') {
        const explicitCode = typeof moduleExports.code === 'function' ? moduleExports.code : null;
        const explicitHandler = typeof moduleExports.handler === 'function' ? moduleExports.handler : null;
        const explicitName = moduleExports.commandName || moduleExports.name || moduleExports.fileName || fallbackName;
        const aliases = Array.isArray(moduleExports.aliases) ? moduleExports.aliases : [];
        if (explicitCode || explicitHandler) {
            return {
                handler: explicitCode || explicitHandler,
                name: normalizeName(explicitName),
                aliases: aliases.map((alias) => normalizeName(alias)),
            };
        }
    }

    if (moduleExports && typeof moduleExports.default === 'function') {
        return { handler: moduleExports.default, name: fallbackName, aliases: [] };
    }

    return null;
}

function loadCustomCommands() {
    ensureCustomDir();

    const handlers = new Map();
    const files = fs.readdirSync(customDir)
        .filter((file) => file.endsWith('.js'))
        .sort();

    for (const file of files) {
        try {
            const fullPath = path.join(customDir, file);
            delete require.cache[require.resolve(fullPath)];
            const moduleExports = require(fullPath);
            const normalized = normalizeHandler(moduleExports, file);
            if (!normalized) continue;

            const names = [normalized.name, ...normalized.aliases].filter(Boolean);
            for (const name of names) {
                if (name) handlers.set(name, normalized.handler);
            }
        } catch (error) {
            console.error(`[customCommands] failed to load ${file}:`, error?.message || error);
        }
    }

    state.loaded = true;
    state.handlers = handlers;
    return handlers;
}

function getCustomCommandHandler(input) {
    if (!state.loaded) {
        loadCustomCommands();
    }

    if (!input || typeof input !== 'string') return null;
    const clean = input.trim();
    if (!clean) return null;

    const firstToken = clean.split(/\s+/)[0].replace(/^\./, '').toLowerCase();
    const direct = state.handlers.get(normalizeName(firstToken));
    if (direct) return direct;

    return state.handlers.get(normalizeName(clean.replace(/^\./, '')));
}

function getCustomCommandNames() {
    if (!state.loaded) {
        loadCustomCommands();
    }
    return [...state.handlers.keys()];
}

function saveCustomCommand(commandName, sourceCode) {
    ensureCustomDir();
    const safeName = normalizeName(commandName);
    if (!safeName) {
        throw new Error('Command name is invalid');
    }

    const targetFile = path.join(customDir, `${safeName}.js`);
    fs.writeFileSync(targetFile, sourceCode, 'utf8');
    return loadCustomCommands();
}

module.exports = {
    customDir,
    loadCustomCommands,
    getCustomCommandHandler,
    getCustomCommandNames,
    saveCustomCommand,
};

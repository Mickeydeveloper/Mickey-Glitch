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
        .replace(/[^a-z0-9_-]/g, '');
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

function listCustomCommands() {
    ensureCustomDir();
    return fs.readdirSync(customDir)
        .filter((file) => file.endsWith('.js'))
        .map((file) => normalizeName(path.basename(file, '.js')))
        .sort();
}

function deleteCustomCommand(commandName) {
    ensureCustomDir();
    const safeName = normalizeName(commandName);
    if (!safeName) {
        throw new Error('Command name is invalid');
    }
    const targetFile = path.join(customDir, `${safeName}.js`);
    if (!fs.existsSync(targetFile)) {
        throw new Error('Command not found');
    }
    fs.unlinkSync(targetFile);
    loadCustomCommands();
    return { success: true, name: safeName };
}

function saveCustomCommand(commandName, sourceCode) {
    ensureCustomDir();
    const safeName = normalizeName(commandName);
    if (!safeName) {
        throw new Error('Command name is invalid');
    }

    let codeString = sourceCode;
    if (typeof sourceCode !== 'string') {
        if (typeof sourceCode === 'object' && sourceCode !== null) {
            const handler = sourceCode.handler || sourceCode.code || sourceCode.default;
            if (typeof handler === 'function') {
                codeString = `module.exports = {\n    handler: ${handler.toString()},\n    name: '${safeName}'\n};`;
            } else {
                codeString = JSON.stringify(sourceCode, null, 2);
            }
        } else {
            codeString = String(sourceCode);
        }
    }

    // Ensure proper module structure
    if (!codeString.includes('module.exports') && !codeString.includes('exports.')) {
        // Wrap with proper ctx structure
        codeString = `module.exports = {
    handler: async (ctx) => {
        try {
            // ctx contains: sock, chatId, message, args, senderId, prefix, commandName
            ${codeString}
        } catch (error) {
            await ctx.reply('❌ Error: ' + error.message);
            console.error('Command error:', error);
        }
    },
    name: '${safeName}'
};`;
    }

    // Validate and fix common issues
    if (codeString.includes('ctx.prefix')) {
        // Ensure ctx has prefix
        if (!codeString.includes('ctx.prefix =')) {
            codeString = codeString.replace(
                'handler: async (ctx) => {',
                'handler: async (ctx) => {\n        ctx.prefix = ctx.prefix || ".";'
            );
        }
    }

    const targetFile = path.join(customDir, `${safeName}.js`);
    
    try {
        // Basic syntax validation
        new Function(codeString);
    } catch (error) {
        throw new Error(`Invalid JavaScript code: ${error.message}`);
    }
    
    fs.writeFileSync(targetFile, codeString, 'utf8');
    loadCustomCommands();
    return { success: true, file: targetFile, name: safeName };
}

module.exports = {
    customDir,
    loadCustomCommands,
    getCustomCommandHandler,
    getCustomCommandNames,
    listCustomCommands,
    saveCustomCommand,
    deleteCustomCommand,
};
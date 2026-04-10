const fs = require('fs');
const path = require('path');

/**
 * Automatically scans the commands folder and loads all command modules
 * Returns an object with all loaded commands organized by command name
 */
function autoLoadCommands() {
    const commandsPath = path.join(__dirname, '../commands');
    const commands = {};
    const errors = [];

    try {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            try {
                const commandName = file.replace('.js', '');
                const commandModule = require(path.join(commandsPath, file));
                
                // Store the module with its name
                commands[commandName] = commandModule;
            } catch (err) {
                errors.push({ file, error: err.message });
            }
        }

        if (errors.length > 0) {
            console.warn('⚠️ Errors loading some commands:', errors);
        }

        return commands;
    } catch (err) {
        console.error('❌ Failed to load commands folder:', err);
        return {};
    }
}

/**
 * Gets a specific command by name
 * Handles both default and named exports
 */
function getCommand(commands, commandName, exportName = null) {
    const cmd = commands[commandName];
    if (!cmd) return null;

    // If exportName specified, try to get named export
    if (exportName) {
        return cmd[exportName] || null;
    }

    // Check if it's a default export (function)
    if (typeof cmd === 'function') {
        return cmd;
    }

    // Try to find a command-like named export
    const possibleNames = [
        `${commandName}Command`,
        'default',
        Object.keys(cmd).find(key => typeof cmd[key] === 'function')
    ];

    for (const name of possibleNames) {
        if (cmd[name] && typeof cmd[name] === 'function') {
            return cmd[name];
        }
    }

    return cmd; // Return the whole module if nothing matches
}

/**
 * Gets multiple exports from a command module
 * Useful for commands that export multiple functions
 */
function getCommandExports(commands, commandName, exportNames = []) {
    const cmd = commands[commandName];
    if (!cmd) return {};

    const exports = {};
    for (const name of exportNames) {
        if (cmd[name]) {
            exports[name] = cmd[name];
        }
    }
    return exports;
}

module.exports = {
    autoLoadCommands,
    getCommand,
    getCommandExports
};

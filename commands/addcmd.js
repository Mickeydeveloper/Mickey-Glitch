const fs = require('fs');
const path = require('path');
const vm = require('vm');
const util = require('util');
const { 
    saveCustomCommand, 
    loadCustomCommands, 
    getCustomCommandNames,
    listCustomCommands,
    deleteCustomCommand 
} = require('../lib/customCommands');

function resolveCommandPath(commandName) {
    const customPath = path.join(process.cwd(), 'commands', 'custom', `${commandName}.js`);
    const normalPath = path.join(process.cwd(), 'commands', `${commandName}.js`);
    if (fs.existsSync(customPath)) return customPath;
    if (fs.existsSync(normalPath)) return normalPath;
    return null;
}

function loadCommandModule(commandPath) {
    try {
        delete require.cache[require.resolve(commandPath)];
        return require(commandPath);
    } catch (error) {
        throw new Error(`Failed to load module: ${error.message}`);
    }
}

function findHandler(commandModule) {
    if (typeof commandModule === 'function') return commandModule;
    if (commandModule && typeof commandModule === 'object') {
        if (typeof commandModule.code === 'function') return commandModule.code;
        if (typeof commandModule.handler === 'function') return commandModule.handler;
        if (typeof commandModule.default === 'function') return commandModule.default;
        if (typeof commandModule.run === 'function') return commandModule.run;
    }
    return null;
}

// Helper to create sandbox environment
function createSandbox(sock, chatId, message, args, senderId) {
    const sandbox = {
        sock,
        chatId,
        message,
        args: args || [],
        senderId,
        console: {
            log: (...values) => sandbox.__logs.push(values.map((v) => util.format(v)).join(' ')),
            error: (...values) => sandbox.__logs.push(values.map((v) => util.format(v)).join(' ')),
            warn: (...values) => sandbox.__logs.push(values.map((v) => util.format(v)).join(' ')),
            info: (...values) => sandbox.__logs.push(values.map((v) => util.format(v)).join(' ')),
        },
        util,
        require,
        process,
        Buffer,
        __dirname: process.cwd(),
        __filename: path.join(process.cwd(), 'runCommand.js'),
        module: { exports: {} },
        exports: {},
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
        Promise,
        Date,
        Math,
        String,
        Number,
        Boolean,
        Array,
        Object,
        JSON,
        Error,
        RegExp,
        Map,
        Set,
        // WhatsApp specific helpers
        sendMessage: async (text, options = {}) => {
            return await sock.sendMessage(chatId, { text, ...options }, { quoted: message });
        },
        reply: async (text) => {
            return await sock.sendMessage(chatId, { text }, { quoted: message });
        },
        getMessage: () => message,
        getSender: () => senderId,
        getChatId: () => chatId,
    };
    sandbox.__logs = [];
    return sandbox;
}

// Execute code in sandbox
async function executeInSandbox(codeText, sandbox, timeout = 5000) {
    try {
        const script = new vm.Script(codeText, { 
            filename: 'runCommand.js',
            displayErrors: true 
        });
        const context = vm.createContext(sandbox);
        let result = script.runInContext(context, { timeout });
        
        if (result && typeof result.then === 'function') {
            result = await result;
        }
        
        if (result === undefined && typeof sandbox.module?.exports === 'function') {
            result = await sandbox.module.exports(sandbox.sock, sandbox.chatId, sandbox.message, sandbox.args, { senderId: sandbox.senderId });
        }

        return {
            success: true,
            result,
            logs: sandbox.__logs || []
        };
    } catch (error) {
        return {
            success: false,
            error,
            logs: sandbox.__logs || []
        };
    }
}

async function runCommand(sock, chatId, senderId, rawText, message, fullText = '') {
    try {
        const isOwner = message?.key?.fromMe || senderId?.toString()?.endsWith('@s.whatsapp.net') || false;
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Only the owner can run commands.' }, { quoted: message });
            return;
        }

        const input = (rawText || fullText || '').toString();
        const body = input.replace(/^\.run\b/i, '').trim();
        const quotedMessage = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedCode = quotedMessage?.conversation || 
                          quotedMessage?.extendedTextMessage?.text || 
                          quotedMessage?.imageMessage?.caption || 
                          quotedMessage?.videoMessage?.caption || '';

        // Check if it's a command management request
        if (body.match(/^list$/i)) {
            const commands = listCustomCommands();
            if (commands.length === 0) {
                await sock.sendMessage(chatId, { text: '📭 No custom commands found.' }, { quoted: message });
                return;
            }
            const commandList = commands.map(cmd => `• .${cmd.name}`).join('\n');
            await sock.sendMessage(chatId, { 
                text: `📋 Available custom commands:\n\n${commandList}\n\nTotal: ${commands.length} commands` 
            }, { quoted: message });
            return;
        }

        if (body.match(/^delete\s+(\S+)/i)) {
            const match = body.match(/^delete\s+(\S+)/i);
            const cmdName = match[1];
            try {
                const result = deleteCustomCommand(cmdName);
                await sock.sendMessage(chatId, { 
                    text: `✅ Command .${cmdName} deleted successfully.` 
                }, { quoted: message });
            } catch (error) {
                await sock.sendMessage(chatId, { 
                    text: `❌ Failed to delete command: ${error.message}` 
                }, { quoted: message });
            }
            return;
        }

        if (body.match(/^help$/i)) {
            await sock.sendMessage(chatId, {
                text: `🛠️ Run Command Help:
                
Usage:
• .run <javascript code> - Execute inline JavaScript
• .run <command_name> [args] - Run a custom command
• .run list - List all custom commands
• .run delete <command_name> - Delete a custom command
• Reply to code with .run - Execute quoted code

Examples:
.run console.log('Hello World')
.run button8
.run list
.run delete button8`
            }, { quoted: message });
            return;
        }

        if (!body && !quotedCode) {
            await sock.sendMessage(chatId, {
                text: `🛠️ Usage:
• Reply to a code message and send .run
• Or send .run <javascript code>
• Or send .run <command_name> [args] to run a command file.
• Send .run help for more info.`
            }, { quoted: message });
            return;
        }

        // Execute quoted code
        if (quotedCode) {
            const codeText = quotedCode.toString().trim();
            const args = body ? body.split(/\s+/) : [];
            const sandbox = createSandbox(sock, chatId, message, args, senderId);
            
            const result = await executeInSandbox(codeText, sandbox);
            
            let response = result.success 
                ? `✅ Code executed successfully.\nResult:\n${util.inspect(result.result, { depth: 2, colors: false })}`
                : `❌ Code execution error:\n${result.error?.stack || result.error?.message || result.error}`;
            
            if (result.logs.length) {
                response += `\n\n📋 Logs:\n${result.logs.join('\n')}`;
            }
            
            await sock.sendMessage(chatId, { text: response }, { quoted: message });
            return;
        }

        // Handle command file execution
        const parts = body.split(/\s+/);
        const commandName = parts[0];
        const commandPath = resolveCommandPath(commandName);
        
        if (commandPath) {
            const args = parts.slice(1);
            let commandModule;
            try {
                commandModule = loadCommandModule(commandPath);
            } catch (loadError) {
                await sock.sendMessage(chatId, { 
                    text: `❌ Failed to load command file:\n${loadError?.message || loadError}` 
                }, { quoted: message });
                return;
            }

            const handler = findHandler(commandModule);
            if (!handler) {
                await sock.sendMessage(chatId, { 
                    text: `❌ No runnable handler found in ${commandName}.js` 
                }, { quoted: message });
                return;
            }

            try {
                // Create sandbox for command execution
                const sandbox = createSandbox(sock, chatId, message, args, senderId);
                // Execute handler
                await handler(sandbox.sock, sandbox.chatId, sandbox.message, sandbox.args, { 
                    senderId: sandbox.senderId, 
                    commandName 
                });
                
                // Check if handler returned a result or sent a message
                if (!sandbox.__logs.length) {
                    await sock.sendMessage(chatId, { 
                        text: `✅ Command .${commandName} executed successfully.` 
                    }, { quoted: message });
                }
            } catch (execError) {
                await sock.sendMessage(chatId, { 
                    text: `❌ Command .${commandName} failed:\n${execError?.stack || execError?.message || execError}` 
                }, { quoted: message });
            }
            return;
        }

        // Execute inline code
        const codeText = body;
        const args = [];
        const sandbox = createSandbox(sock, chatId, message, args, senderId);
        
        const result = await executeInSandbox(codeText, sandbox);
        
        let response = result.success 
            ? `✅ Code executed successfully.\nResult:\n${util.inspect(result.result, { depth: 2, colors: false })}`
            : `❌ Code execution error:\n${result.error?.stack || result.error?.message || result.error}`;
        
        if (result.logs.length) {
            response += `\n\n📋 Logs:\n${result.logs.join('\n')}`;
        }
        
        await sock.sendMessage(chatId, { text: response }, { quoted: message });
        
    } catch (error) {
        console.error('runCommand error:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ Run command failed: ${error?.message || error}` 
        }, { quoted: message });
    }
}

async function cmdaddCommand(sock, chatId, senderId, rawText, message, fullText = '') {
    try {
        const isOwner = message?.key?.fromMe || senderId?.toString()?.endsWith('@s.whatsapp.net') || false;
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Only the owner can add custom commands.' }, { quoted: message });
            return;
        }

        const input = (rawText || fullText || '').toString();
        
        // Check for quoted message with code
        const quotedMessage = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedCode = quotedMessage?.conversation || 
                          quotedMessage?.extendedTextMessage?.text || 
                          quotedMessage?.imageMessage?.caption || 
                          quotedMessage?.videoMessage?.caption || '';

        let commandName, sourceCode;

        // If there's a quoted message with code, use it
        if (quotedCode && !input.includes('module.exports')) {
            // Try to extract command name from input
            const nameMatch = input.match(/^\.cmdadd\s+([a-z0-9_\-]+)/i);
            if (!nameMatch) {
                await sock.sendMessage(chatId, {
                    text: '🛠️ Usage:\n.cmdadd <command_name> (with quoted code)\nOr\n.cmdadd <command_name> <module_code>'
                }, { quoted: message });
                return;
            }
            commandName = nameMatch[1];
            sourceCode = quotedCode;
        } else {
            // Regular mode: parse from text
            const match = input.match(/^\.cmdadd\s+([a-z0-9_\-]+)\s*(.*)$/is);
            if (!match) {
                await sock.sendMessage(chatId, {
                    text: '🛠️ Usage:\n.cmdadd <command_name> <module_code>\n\nExample:\n.cmdadd button8 module.exports = { ... }'
                }, { quoted: message });
                return;
            }
            commandName = match[1].trim();
            sourceCode = (match[2] || '').trim();
        }

        if (!sourceCode) {
            await sock.sendMessage(chatId, { 
                text: '❌ Please provide command source code. You can either type it or reply to a code message.' 
            }, { quoted: message });
            return;
        }

        // Clean the source code
        let cleaned = sourceCode
            .replace(/^```(?:js|javascript)?\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();

        if (!cleaned) {
            await sock.sendMessage(chatId, { text: '❌ Command source is empty.' }, { quoted: message });
            return;
        }

        // Ensure the code has proper structure
        if (!cleaned.includes('module.exports') && !cleaned.includes('exports.')) {
            // If it's a simple function, wrap it
            if (cleaned.startsWith('async (')) {
                cleaned = `module.exports = ${cleaned};`;
            } else if (cleaned.startsWith('function')) {
                cleaned = `module.exports = ${cleaned};`;
            } else {
                // Try to determine if it's already a valid module
                cleaned = `module.exports = {\n    handler: async (ctx) => {\n        ${cleaned}\n    },\n    name: '${commandName}'\n};`;
            }
        }

        // Save the command
        try {
            const result = await saveCustomCommand(commandName, cleaned);
            // Reload custom commands
            loadCustomCommands();
            
            await sock.sendMessage(chatId, {
                text: `✅ Custom command saved as .${commandName}\n\nFile: commands/custom/${commandName}.js\n\nUse .run ${commandName} to test it.`
            }, { quoted: message });
        } catch (saveError) {
            await sock.sendMessage(chatId, { 
                text: `❌ Failed to save command: ${saveError?.message || saveError}` 
            }, { quoted: message });
        }
        
    } catch (error) {
        console.error('cmdadd error:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ Failed to add custom command: ${error?.message || error}` 
        }, { quoted: message });
    }
}

module.exports = {
    cmdaddCommand,
    runCommand,
    createSandbox,
    executeInSandbox,
    resolveCommandPath,
    loadCommandModule,
    findHandler
};
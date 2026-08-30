/**
 * addcmd.js - Powerful Command Manager (Fixed)
 * Features: Add, Run, List, Delete custom commands
 * Usage: .cmdadd <name> <code> | .run <name>
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const util = require('util');
const Module = require('module');
const isOwnerOrSudo = require('../lib/isOwner');

// ─── ──────────────────────────────────────────────────────────────────────
// 1. PATHS & CONFIG
// ─── ──────────────────────────────────────────────────────────────────────

const COMMANDS_DIR = path.join(process.cwd(), 'commands');
const GENERATED_MARKER = '// @generated-by:addcmd';

// Ensure directory exists
if (!fs.existsSync(COMMANDS_DIR)) fs.mkdirSync(COMMANDS_DIR, { recursive: true });

// ─── ──────────────────────────────────────────────────────────────────────
// 2. MESSAGEBUILDER PATH RESOLVER
// ─── ──────────────────────────────────────────────────────────────────────

function resolveMessageBuilderPath() {
    const possiblePaths = [
        path.join(process.cwd(), 'lib', 'messageBuilder.js'),
        path.join(process.cwd(), 'lib', 'messageBuilder.js'),
        path.join(process.cwd(), 'lib', 'messageBuilder'),
        path.join(process.cwd(), 'lib', 'messageBuilder'),
        path.join(process.cwd(), 'src', 'lib', 'messageBuilder.js'),
        path.join(process.cwd(), 'src', 'lib', 'messageBuilder.js'),
    ];
    
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }
    return null;
}

// ─── ──────────────────────────────────────────────────────────────────────
// 3. HELPER FUNCTIONS
// ─── ──────────────────────────────────────────────────────────────────────

function resolveCommandPath(commandName) {
    const normalizedName = String(commandName || '').replace(/^\./, '').trim().toLowerCase();
    const normalPath = path.join(COMMANDS_DIR, `${normalizedName}.js`);
    if (fs.existsSync(normalPath)) return normalPath;

    const aliasPath = fs.readdirSync(COMMANDS_DIR)
        .filter((file) => file.endsWith('.js'))
        .find((file) => path.basename(file, '.js').toLowerCase() === normalizedName);
    if (aliasPath) return path.join(COMMANDS_DIR, aliasPath);
    return null;
}

function loadCommandModule(commandPath) {
    try {
        // Clear cache to reload fresh
        delete require.cache[require.resolve(commandPath)];
        const module = require(commandPath);
        return module;
    } catch (error) {
        throw new Error(`Failed to load module: ${error.message}`);
    }
}

function findHandler(commandModule) {
    if (typeof commandModule === 'function') return commandModule;
    if (!commandModule || typeof commandModule !== 'object') return null;

    const candidates = [
        commandModule.code,
        commandModule.handler,
        commandModule.run,
        commandModule.execute,
        commandModule.default,
        commandModule.main,
        commandModule.logic,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'function') return candidate;
    }

    if (commandModule && typeof commandModule === 'object') {
        for (const value of Object.values(commandModule)) {
            if (typeof value === 'function') {
                return value;
            }
        }
    }

    return null;
}

function isGeneratedCommandFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.includes(GENERATED_MARKER);
    } catch {
        return false;
    }
}

function registerGeneratedCommand(commandName, filePath) {
    if (!global.commands || typeof global.commands !== 'object') {
        global.commands = {};
    }

    global.commands[commandName] = {
        name: commandName,
        description: 'Generated command',
        category: 'UTILITY',
        file: path.basename(filePath),
        generated: true,
    };

    if (!global.autoRegisteredCommands || typeof global.autoRegisteredCommands !== 'object') {
        global.autoRegisteredCommands = {};
    }
    // prefer Map-based registry if available (main.js exposes it)
    try {
        if (global.autoRegisteredCommands instanceof Map) {
            // force a reload so main.js picks up the new file
            if (typeof global.reloadAutoRegisteredCommands === 'function') {
                global.reloadAutoRegisteredCommands();
            }
            // also set basic meta in global.commands
            global.commands[commandName] = global.commands[commandName] || {};
            global.commands[commandName].file = path.basename(filePath);
            global.commands[commandName].generated = true;
            return;
        }
    } catch (e) {}

    global.autoRegisteredCommands[commandName] = global.commands[commandName];
}

function listCustomCommands() {
    try {
        const files = fs.readdirSync(COMMANDS_DIR);
        return files
            .filter((f) => f.endsWith('.js'))
            .filter((f) => f !== 'addcmd.js' && f !== 'menu.js')
            .map((f) => f.replace(/\.js$/, ''))
            .filter((name) => isGeneratedCommandFile(path.join(COMMANDS_DIR, `${name}.js`)));
    } catch {
        return [];
    }
}

function deleteCustomCommand(commandName) {
    const filePath = path.join(COMMANDS_DIR, `${commandName}.js`);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Command "${commandName}" not found`);
    }
    if (!isGeneratedCommandFile(filePath)) {
        throw new Error(`Command "${commandName}" is not a generated command and cannot be deleted here.`);
    }
    fs.unlinkSync(filePath);
    if (global.commands && global.commands[commandName]) delete global.commands[commandName];
    return true;
}

function saveCustomCommand(commandName, sourceCode) {
    const filePath = path.join(COMMANDS_DIR, `${commandName}.js`);

    if (!/^[a-z0-9_\-]+$/i.test(commandName)) {
        throw new Error('Invalid command name. Use only letters, numbers, underscore, and hyphen.');
    }

    if (fs.existsSync(filePath) && !isGeneratedCommandFile(filePath)) {
        throw new Error(`Command "${commandName}" already exists as a built-in command and cannot be overwritten.`);
    }

    let cleaned = String(sourceCode || '')
        .replace(/^```(?:js|javascript)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

    if (!cleaned) {
        throw new Error('Command source is empty');
    }

    cleaned = cleaned.replace(/require\(['"]\.\.\/lib\/messagebuilder['"]\)/gi, "require('../lib/messageBuilder')");
    cleaned = cleaned.replace(/require\(['"]\.\.\/lib\/messagebuilder\.js['"]\)/gi, "require('../lib/messageBuilder')");
    cleaned = cleaned.replace(/require\(['"]\.\.\/\.\.\/lib\/messagebuilder['"]\)/gi, "require('../lib/messageBuilder')");

    const symbolNames = ['Button', 'ButtonV2', 'Carousel', 'AIRich', 'Toolkit', 'createCtx'];
    const hasMessageBuilderRequire = /messageBuilder/.test(cleaned);
    const hasSymbol = symbolNames.some((s) => new RegExp('\\b' + s + '\\b').test(cleaned));
    const header = `${GENERATED_MARKER}\nconst { Button, ButtonV2, Carousel, AIRich, Toolkit, createCtx } = require('../lib/messageBuilder');\n\n`;

    const isDirectFunction = /^async\s*\(/.test(cleaned) || /^async\s+[A-Za-z0-9_$]+\s*\(/.test(cleaned) || /^function\s*/.test(cleaned) || /^\(.*\)\s*=>/.test(cleaned);
    const isObjectExport = /module\.exports\s*=\s*\{/.test(cleaned) || /exports\.[A-Za-z0-9_$]+\s*=/.test(cleaned);

    if (!cleaned.includes('module.exports') && !isObjectExport) {
        if (isDirectFunction) {
            cleaned = `module.exports = ${cleaned};`;
        } else {
            cleaned = `module.exports = {\n    code: async (sock, chatId, message, args = [], options = {}) => {\n        ${cleaned}\n    },\n    name: '${commandName}',\n    description: 'Generated command',\n    category: 'UTILITY'\n};`;
        }
    }

    // If source is a single exported function object with no explicit name metadata, auto-add metadata.
    if (/module\.exports\s*=\s*async\s+function/.test(cleaned) || /module\.exports\s*=\s*\(?\s*\(?[^)]*\)\s*=>/.test(cleaned)) {
        cleaned = cleaned.replace(/module\.exports\s*=\s*/, "module.exports = async function generatedCommand(sock, chatId, message, args = [], options = {}) {\n    return (async () => {\n    ");
        cleaned += '\n    })();\n};\n';
    }

    const finalSource = `${hasMessageBuilderRequire || hasSymbol ? '' : header}${cleaned}\n`;
    fs.writeFileSync(filePath, finalSource, 'utf8');
    registerGeneratedCommand(commandName, filePath);
    return filePath;
}

// ─── ──────────────────────────────────────────────────────────────────────
// 4. SANDBOX EXECUTION
// ─── ──────────────────────────────────────────────────────────────────────

function createSandbox(sock, chatId, message, args, senderId, commandName = '') {
    const sandbox = {
        sock,
        chatId,
        message,
        args: args || [],
        senderId,
        commandName,
        prefix: '.',
        ctx: null,
        console: {
            log: (...values) => sandbox.__logs.push(values.map((v) => util.format(v)).join(' ')),
            error: (...values) => sandbox.__logs.push(values.map((v) => util.format(v)).join(' ')),
            warn: (...values) => sandbox.__logs.push(values.map((v) => util.format(v)).join(' ')),
            info: (...values) => sandbox.__logs.push(values.map((v) => util.format(v)).join(' ')),
        },
        util,
        require: (specifier) => {
            if (typeof specifier !== 'string') {
                throw new TypeError('Module specifier must be a string');
            }
            const baseRequire = Module.createRequire(path.join(COMMANDS_DIR, 'addcmd.js'));
            if (specifier.startsWith('.')) {
                try {
                    return require(path.resolve(COMMANDS_DIR, specifier));
                } catch (error) {
                    return baseRequire(specifier);
                }
            }
            return baseRequire(specifier);
        },
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
        sendMessage: async (content, options = {}) => {
            const msgContent = typeof content === 'string' ? { text: content } : content;
            if (sandbox.previewMode) {
                sandbox.__sent = true;
                const preview = {
                    preview: true,
                    payload: msgContent,
                    options: { quoted: message, ...options },
                    summary: summarizePreviewPayload(msgContent),
                };
                sandbox.__sentMessages.push(preview);
                return preview;
            }
            const result = await sock.sendMessage(chatId, msgContent, { quoted: message, ...options });
            sandbox.__sent = true;
            sandbox.__sentMessages.push(result);
            return result;
        },
        reply: async (content, options = {}) => {
            const msgContent = typeof content === 'string' ? { text: content } : content;
            if (sandbox.previewMode) {
                sandbox.__sent = true;
                const preview = {
                    preview: true,
                    payload: msgContent,
                    options: { quoted: message, ...options },
                    summary: summarizePreviewPayload(msgContent),
                };
                sandbox.__sentMessages.push(preview);
                return preview;
            }
            const result = await sock.sendMessage(chatId, msgContent, { quoted: message, ...options });
            sandbox.__sent = true;
            sandbox.__sentMessages.push(result);
            return result;
        },
        getMessage: () => message,
        getSender: () => senderId,
        getChatId: () => chatId,
    };
    sandbox.__logs = [];
    sandbox.__sent = false;
    sandbox.__sentMessages = [];
    sandbox.ctx = sandbox;
    
    // ─── Load MessageBuilder modules with path detection ────────────────
    try {
        const mbPath = resolveMessageBuilderPath();
        if (mbPath) {
            const mb = require(mbPath);
            sandbox.Button = mb.Button;
            sandbox.ButtonV2 = mb.ButtonV2;
            sandbox.Carousel = mb.Carousel;
            sandbox.AIRich = mb.AIRich;
            sandbox.Toolkit = mb.Toolkit;
            sandbox.createCtx = mb.createCtx;
        } else {
            // Try relative path as fallback
            const mb = require('../lib/messageBuilder');
            sandbox.Button = mb.Button;
            sandbox.ButtonV2 = mb.ButtonV2;
            sandbox.Carousel = mb.Carousel;
            sandbox.AIRich = mb.AIRich;
            sandbox.Toolkit = mb.Toolkit;
            sandbox.createCtx = mb.createCtx;
        }
    } catch (_) {
        // MessageBuilder not available
        console.log('[SANDBOX] MessageBuilder not loaded');
    }
    
    return sandbox;
}

async function executeInSandbox(codeText, sandbox, timeout = 10000) {
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

// ─── ──────────────────────────────────────────────────────────────────────
// 5. RUN COMMAND
// ─── ──────────────────────────────────────────────────────────────────────

async function safeInvokeHandler(handler, sandbox, args = []) {
    if (typeof handler !== 'function') {
        throw new Error('No valid handler found');
    }

    const arity = handler.length;

    if (arity <= 1) {
        return await handler({
            ...sandbox,
            args,
            conn: sandbox.sock,
            command: sandbox.commandName,
            message: sandbox.message,
            msg: sandbox.message,
            chat: sandbox.chatId,
            reply: sandbox.reply,
        });
    }

    if (arity === 2) {
        return await handler(sandbox.sock, sandbox.chatId);
    }

    if (arity >= 3) {
        return await handler(sandbox.sock, sandbox.chatId, sandbox.message, args, {
            senderId: sandbox.senderId,
            commandName: sandbox.commandName,
        });
    }

    return await handler();
}

function summarizePreviewPayload(payload) {
    if (typeof payload === 'string') return payload;
    if (Buffer.isBuffer(payload)) return `<Buffer ${payload.length} bytes>`;
    if (Array.isArray(payload)) return payload.map((item) => summarizePreviewPayload(item)).join('\n');
    if (!payload || typeof payload !== 'object') return util.inspect(payload, { depth: 3, colors: false, maxArrayLength: 10 });

    if (typeof payload.text === 'string' || typeof payload.caption === 'string') {
        const text = payload.text || payload.caption || '';
        const meta = Object.keys(payload)
            .filter((key) => !['text', 'caption'].includes(key))
            .slice(0, 6);

        if (meta.length === 0) {
            return text || util.inspect(payload, { depth: 3, colors: false, maxArrayLength: 10 });
        }

        return `${text || 'Message object'}\n\nMeta: ${meta.map((key) => `${key}: ${util.inspect(payload[key], { depth: 2, colors: false, maxArrayLength: 8 })}`).join(', ')}`;
    }

    return util.inspect(payload, { depth: 3, colors: false, maxArrayLength: 10 });
}

function createTrackedSocket(sock, sandbox) {
    return new Proxy(sock, {
        get(target, property, receiver) {
            if (property === 'sendMessage') {
                return async (...args) => {
                    sandbox.__sent = true;
                    if (sandbox.previewMode) {
                        const payload = args[0];
                        const options = args[1] || {};
                        const preview = {
                            preview: true,
                            payload,
                            options,
                            summary: summarizePreviewPayload(payload),
                        };
                        sandbox.__sentMessages.push(preview);
                        return preview;
                    }
                    const result = await target.sendMessage.apply(target, args);
                    sandbox.__sentMessages.push(result);
                    return result;
                };
            }
            return Reflect.get(target, property, receiver);
        },
    });
}

async function runCommand(sock, chatId, senderId, rawText, message, fullText = '') {
    try {
        const isOwner = message?.key?.fromMe || await isOwnerOrSudo(senderId, sock, chatId);
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Only the owner can run commands.' }, { quoted: message });
            return;
        }

        const input = (rawText || fullText || '').toString();
        const body = input.replace(/^\.run\b/i, '').trim();
        const previewRequested = /^preview\b/i.test(body) || global.RUN_PREVIEW_MODE === true || process.env.BOT_PREVIEW_MODE === '1' || process.env.BOT_PREVIEW_MODE === 'true';
        const quotedMessage = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedCode = quotedMessage?.conversation || 
                          quotedMessage?.extendedTextMessage?.text || 
                          quotedMessage?.imageMessage?.caption || 
                          quotedMessage?.videoMessage?.caption || '';

        // ─── List commands ──────────────────────────────────────────────
        if (body.match(/^list$/i)) {
            const commands = listCustomCommands();
            if (commands.length === 0) {
                await sock.sendMessage(chatId, { text: '📭 No custom commands found.' }, { quoted: message });
                return;
            }
            const commandList = commands.map((cmd) => `• .${cmd}`).join('\n');
            await sock.sendMessage(chatId, { 
                text: `📋 Available custom commands:\n\n${commandList}\n\nTotal: ${commands.length} commands` 
            }, { quoted: message });
            return;
        }

        // ─── Delete command ─────────────────────────────────────────────
        if (body.match(/^delete\s+(\S+)/i)) {
            const match = body.match(/^delete\s+(\S+)/i);
            const cmdName = match[1];
            try {
                deleteCustomCommand(cmdName);
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

        // ─── Help ────────────────────────────────────────────────────────
        if (body.match(/^help$/i)) {
            await sock.sendMessage(chatId, {
                text: `🛠️ Run Command Help:
                
Usage:
• .run <javascript code> - Execute inline JavaScript
• .run <command_name> [args] - Run a custom command
• .run preview <command_name> [args] - Preview what the command would send without posting it
• .run list - List all custom commands
• .run delete <command_name> - Delete a custom command
• Reply to code with .run - Execute quoted code

Examples:
.run console.log('Hello World')
.run button8
.run preview button8
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

        // ─── Execute quoted code ────────────────────────────────────────
        if (quotedCode) {
            const codeText = quotedCode.toString().trim();
            const args = body ? body.split(/\s+/) : [];
            const sandbox = createSandbox(sock, chatId, message, args, senderId);
            sandbox.sock = createTrackedSocket(sock, sandbox);
            sandbox.core = sandbox.sock;

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

        // ─── Preview command file ──────────────────────────────────────
        const previewMatch = body.match(/^preview\s+(.+)$/i);
        const previewTarget = previewMatch ? previewMatch[1].trim() : (previewRequested && body ? body : '');
        if (previewTarget) {
            const previewInput = previewTarget.trim();
            const previewParts = previewInput.split(/\s+/);
            const previewCommandName = previewParts[0].replace(/^\./, '').toLowerCase();
            const previewPath = resolveCommandPath(previewCommandName);

            if (!previewPath) {
                await sock.sendMessage(chatId, { text: `❌ No command named .${previewCommandName} was found for preview.` }, { quoted: message });
                return;
            }

            let previewModule;
            try {
                previewModule = loadCommandModule(previewPath);
            } catch (loadError) {
                await sock.sendMessage(chatId, { text: `❌ Failed to load command preview:\n${loadError?.message || loadError}` }, { quoted: message });
                return;
            }

            const previewHandler = findHandler(previewModule);
            if (!previewHandler) {
                await sock.sendMessage(chatId, { text: `❌ No runnable handler found in ${previewCommandName}.js` }, { quoted: message });
                return;
            }

            try {
                const previewArgs = previewParts.slice(1);
                const sandbox = createSandbox(sock, chatId, message, previewArgs, senderId, previewCommandName);
                sandbox.previewMode = true;
                sandbox.sock = createTrackedSocket(sock, sandbox);
                sandbox.core = sandbox.sock;
                const previewResult = await safeInvokeHandler(previewHandler, sandbox, sandbox.args);

                if (sandbox.__sentMessages.length > 0) {
                    const previewText = sandbox.__sentMessages
                        .map((entry) => (entry && entry.summary) ? entry.summary : util.inspect(entry, { depth: 3, colors: false }))
                        .join('\n\n---\n\n');

                    await sock.sendMessage(chatId, { 
                        text: `🔎 Preview for .${previewCommandName}\n\n${previewText}`
                    }, { quoted: message });
                    return;
                }

                let response;
                if (previewResult !== undefined) {
                    response = `🔎 Preview for .${previewCommandName}\nResult:\n${util.inspect(previewResult, { depth: 2, colors: false })}`;
                } else if (sandbox.__logs.length) {
                    response = `🔎 Preview for .${previewCommandName}\n\n📋 Logs:\n${sandbox.__logs.join('\n')}`;
                } else {
                    response = `🔎 Preview for .${previewCommandName}\nNo message payload was produced.`;
                }

                await sock.sendMessage(chatId, { text: response }, { quoted: message });
            } catch (execError) {
                await sock.sendMessage(chatId, { text: `❌ Preview failed for .${previewCommandName}:\n${execError?.stack || execError?.message || execError}` }, { quoted: message });
            }
            return;
        }

        // ─── Execute command file ──────────────────────────────────────
        const parts = body.split(/\s+/);
        const commandName = parts[0].replace(/^\./, '').toLowerCase();
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
                const sandbox = createSandbox(sock, chatId, message, args, senderId, commandName);
                sandbox.sock = createTrackedSocket(sock, sandbox);
                sandbox.core = sandbox.sock;
                const handlerResult = await safeInvokeHandler(handler, sandbox, sandbox.args);

                if (!sandbox.__sent) {
                    let response;
                    if (handlerResult !== undefined) {
                        response = `✅ Command .${commandName} executed successfully.\nResult:\n${util.inspect(handlerResult, { depth: 2, colors: false })}`;
                    } else if (sandbox.__logs.length) {
                        response = `✅ Command .${commandName} completed.\n\n📋 Logs:\n${sandbox.__logs.join('\n')}`;
                    } else {
                        response = `✅ Command .${commandName} executed successfully.`;
                    }

                    await sock.sendMessage(chatId, { text: response }, { quoted: message });
                }
            } catch (execError) {
                await sock.sendMessage(chatId, { 
                    text: `❌ Command .${commandName} failed:\n${execError?.stack || execError?.message || execError}` 
                }, { quoted: message });
            }
            return;
        }

        // ─── Execute inline code ────────────────────────────────────────
        const codeText = body;
        const args = [];
        const sandbox = createSandbox(sock, chatId, message, args, senderId);
        sandbox.sock = createTrackedSocket(sock, sandbox);
        sandbox.core = sandbox.sock;

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

// ─── ──────────────────────────────────────────────────────────────────────
// 6. ADD COMMAND (CMDADD)
// ─── ──────────────────────────────────────────────────────────────────────

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

        // If there's a quoted message with code
        if (quotedCode && !input.includes('module.exports')) {
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

        // ─── Save command ──────────────────────────────────────────────
        try {
            const filePath = saveCustomCommand(commandName, sourceCode);
            
            // Try to load the command to verify it works
            try {
                const module = loadCommandModule(filePath);
                const handler = findHandler(module);
                if (!handler) {
                    fs.unlinkSync(filePath);
                    await sock.sendMessage(chatId, { 
                        text: `❌ Command saved but no valid handler found. File deleted.` 
                    }, { quoted: message });
                    return;
                }
            } catch (loadError) {
                fs.unlinkSync(filePath);
                await sock.sendMessage(chatId, { 
                    text: `❌ Command saved but failed to load:\n${loadError.message}\n\nFile deleted.` 
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(chatId, {
                text: `✅ Custom command saved as .${commandName}\n\nFile: commands/${commandName}.js`
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

// ─── ──────────────────────────────────────────────────────────────────────
// 7. EXPORTS
// ─── ──────────────────────────────────────────────────────────────────────

module.exports = {
    cmdaddCommand,
    runCommand,
    createSandbox,
    executeInSandbox,
    resolveCommandPath,
    loadCommandModule,
    findHandler,
    createTrackedSocket,
    saveCustomCommand,
    deleteCustomCommand,
    listCustomCommands,
    resolveMessageBuilderPath,
    COMMANDS_DIR
};
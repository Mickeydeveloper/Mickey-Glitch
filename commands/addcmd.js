/**
 * addcmd.js - Powerful Command Manager (Preview as Bot Message)
 * Features: Add, Run, List, Delete custom commands, Live Preview, Sandbox execution
 * Usage: .cmdadd <name> <code> | .run <name> | .run preview <name> | .run execute <name>
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
const PREVIEW_TAG = '🔎 *PREVIEW MODE* — Ujumbe huu hautumwa kwa wateja.\n\n';

if (!fs.existsSync(COMMANDS_DIR)) fs.mkdirSync(COMMANDS_DIR, { recursive: true });

// ─── ──────────────────────────────────────────────────────────────────────
// 2. MESSAGEBUILDER PATH RESOLVER
// ─── ──────────────────────────────────────────────────────────────────────

function resolveMessageBuilderPath() {
    const possiblePaths = [
        path.join(process.cwd(), 'lib', 'messageBuilder.js'),
        path.join(process.cwd(), 'lib', 'messageBuilder'),
        path.join(process.cwd(), 'src', 'lib', 'messageBuilder.js'),
        path.join(process.cwd(), 'src', 'lib', 'messageBuilder'),
    ];
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) return p;
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

    const escapedName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const functionDeclaration = new RegExp(`\\b(?:async\\s+)?function\\s+${escapedName}\\b|\\b(?:const|let|var)\\s+${escapedName}\\s*=`, 'm');
    const files = fs.readdirSync(COMMANDS_DIR).filter((file) => file.endsWith('.js'));
    for (const file of files) {
        const fullPath = path.join(COMMANDS_DIR, file);
        const source = fs.readFileSync(fullPath, 'utf8');
        const isExported = new RegExp(`module\\.exports[\\s\\S]*\\b${escapedName}\\b|exports\\.${escapedName}\\s*=|module\\.exports\\.name\\s*=\\s*['"]${escapedName}['"]`, 'm');
        const hasCommandName = new RegExp(`\\bcommands\\s*:\\s*\\[[^\\]]*['"]${escapedName}['"]`, 'i').test(source);
        const exportsRunHandler = hasCommandName && /\b(?:async\s+)?run\s*\(/.test(source);
        if ((functionDeclaration.test(source) && isExported.test(source)) || exportsRunHandler) return fullPath;
    }
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
    if (!commandModule || typeof commandModule !== 'object') return null;

    const candidates = [
        commandModule.code, commandModule.handler, commandModule.run,
        commandModule.execute, commandModule.default, commandModule.main, commandModule.logic,
    ];
    for (const candidate of candidates) {
        if (typeof candidate === 'function') return candidate;
    }
    for (const value of Object.values(commandModule)) {
        if (typeof value === 'function') return value;
    }
    return null;
}

function isGeneratedCommandFile(filePath) {
    try { return fs.readFileSync(filePath, 'utf8').includes(GENERATED_MARKER); }
    catch { return false; }
}

function registerGeneratedCommand(commandName, filePath) {
    if (!global.commands || typeof global.commands !== 'object') global.commands = {};
    global.commands[commandName] = {
        name: commandName, description: 'Generated command',
        category: 'UTILITY', file: path.basename(filePath), generated: true,
    };
    if (!global.autoRegisteredCommands || typeof global.autoRegisteredCommands !== 'object') global.autoRegisteredCommands = {};
    try {
        if (global.autoRegisteredCommands instanceof Map) {
            if (typeof global.reloadAutoRegisteredCommands === 'function') global.reloadAutoRegisteredCommands();
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
        return fs.readdirSync(COMMANDS_DIR)
            .filter((f) => f.endsWith('.js'))
            .filter((f) => f !== 'addcmd.js' && f !== 'menu.js')
            .map((f) => f.replace(/\.js$/, ''))
            .filter((name) => isGeneratedCommandFile(path.join(COMMANDS_DIR, `${name}.js`)));
    } catch { return []; }
}

function deleteCustomCommand(commandName) {
    const filePath = path.join(COMMANDS_DIR, `${commandName}.js`);
    if (!fs.existsSync(filePath)) throw new Error(`Command "${commandName}" not found`);
    if (!isGeneratedCommandFile(filePath)) throw new Error(`Command "${commandName}" is not a generated command and cannot be deleted here.`);
    fs.unlinkSync(filePath);
    if (global.commands && global.commands[commandName]) delete global.commands[commandName];
    return true;
}

function saveCustomCommand(commandName, sourceCode) {
    const filePath = path.join(COMMANDS_DIR, `${commandName}.js`);

    if (!/^[a-z0-9_\-]+$/i.test(commandName)) throw new Error('Invalid command name. Use only letters, numbers, underscore, and hyphen.');
    if (fs.existsSync(filePath) && !isGeneratedCommandFile(filePath)) throw new Error(`Command "${commandName}" already exists as a built-in command and cannot be overwritten.`);

    let cleaned = String(sourceCode || '')
        .replace(/^```(?:js|javascript)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

    if (!cleaned) throw new Error('Command source is empty');

    cleaned = cleaned.replace(/require\(['"]\.\.\/lib\/messagebuilder['"]\)/gi, "require('../lib/messageBuilder')");
    cleaned = cleaned.replace(/require\(['"]\.\.\/lib\/messagebuilder\.js['"]\)/gi, "require('../lib/messageBuilder')");
    cleaned = cleaned.replace(/require\(['"]\.\.\/\.\.\/lib\/messagebuilder['"]\)/gi, "require('../lib/messageBuilder')");

    const symbolNames = ['Button', 'ButtonV2', 'Carousel', 'AIRich', 'Toolkit', 'createCtx'];
    const hasMessageBuilderRequire = /messageBuilder/.test(cleaned);
    const hasSymbol = symbolNames.some((s) => new RegExp('\\b' + s + '\\b').test(cleaned));
    const header = `${GENERATED_MARKER}\nconst { Button, ButtonV2, Carousel, AIRich, Toolkit, createCtx } = require('../lib/messageBuilder');\n\n`;

    const isDirectFunction = /^async\s*\(/.test(cleaned) || /^async\s+[A-Za-z0-9_$]+\s*\(/.test(cleaned) || /^function\s*/.test(cleaned) || /^\(.*\)\s*=>/.test(cleaned) || /^async\s*\(.*\)\s*=>/.test(cleaned);
    const isObjectExport = /module\.exports\s*=\s*\{/.test(cleaned) || /exports\.[A-Za-z0-9_$]+\s*=/.test(cleaned);
    const hasModuleExports = cleaned.includes('module.exports');

    if (!hasModuleExports && !isObjectExport) {
        if (isDirectFunction) {
            cleaned = `module.exports = ${cleaned};`;
        } else {
            cleaned = `module.exports = {\n    code: async (sock, chatId, message, args = [], options = {}) => {\n        ${cleaned}\n    },\n    name: '${commandName}',\n    description: 'Generated command',\n    category: 'UTILITY'\n};`;
        }
    }

    if (/module\.exports\s*=\s*async\s+function/.test(cleaned) || /module\.exports\s*=\s*\(?\s*\(?[^)]*\)\s*=>/.test(cleaned)) {
        cleaned = cleaned.replace(/module\.exports\s*=\s*/, "module.exports = async function generatedCommand(sock, chatId, message, args = [], options = {}) {\n    return (async () => {\n    ");
        cleaned += '\n    })();\n};\n';
    }

    const finalSource = `${(!hasMessageBuilderRequire && hasSymbol) || !hasMessageBuilderRequire ? header : ''}${cleaned}\n`;
    fs.writeFileSync(filePath, finalSource, 'utf8');
    registerGeneratedCommand(commandName, filePath);
    return filePath;
}

// ─── ──────────────────────────────────────────────────────────────────────
// 4. PREVIEW AS BOT MESSAGE — LIVE PREVIEW (KAMA KWENYE PICHA)
// ─── ──────────────────────────────────────────────────────────────────────

/**
 * Hii ndio function kuu ya kutuma preview KAMA ujumbe halisi wa bot.
 * Inachukua payload na kui-tuma kwa mtumiaji kama ujumbe wa kawaida,
 * ikionyesha muonekano kamili (picha, buttons, n.k.)
 */
async function sendPreviewAsBot(sock, chatId, payload, options = {}, originalMessage = null) {
    try {
        if (!payload || typeof payload !== 'object') {
            // Simple text payload
            await sock.sendMessage(chatId, {
                text: `${PREVIEW_TAG}📝 *Text Message:*\n\n${payload || '(empty)'}`,
            }, { quoted: originalMessage });
            return;
        }

        // Handle relayMessage-style payload: { buttonsMessage: {...} }
        let innerPayload = payload;
        let isRelay = false;

        if (payload.buttonsMessage || payload.viewOnceMessage || payload.viewOnceMessageV2 ||
            payload.interactiveMessage || payload.documentWithCaptionMessage || payload.ephemeralMessage) {
            isRelay = true;
            innerPayload = payload;
        } else if (payload.message) {
            // Already in sendMessage format
            innerPayload = payload;
        }

        // Try to send using sendMessage (which handles both native and MessageBuilder)
        try {
            const messageOptions = {
                ...options,
                quoted: originalMessage,
            };

            // Add preview prefix as caption if possible
            if (innerPayload.text) {
                innerPayload.text = `${PREVIEW_TAG}${innerPayload.text}`;
            } else if (innerPayload.caption) {
                innerPayload.caption = `${PREVIEW_TAG}${innerPayload.caption}`;
            }

            await sock.sendMessage(chatId, innerPayload, messageOptions);
            return { success: true, method: 'sendMessage' };
        } catch (sendError) {
            // Fallback: try relayMessage
            if (isRelay && sock.relayMessage) {
                try {
                    await sock.relayMessage(chatId, innerPayload, { quoted: originalMessage });
                    return { success: true, method: 'relayMessage' };
                } catch (relayError) {
                    throw new Error(`Both sendMessage and relayMessage failed: ${relayError.message}`);
                }
            }
            throw sendError;
        }
    } catch (error) {
        // Final fallback: send as formatted text
        try {
            const formatted = formatPreviewPayload(payload);
            await sock.sendMessage(chatId, {
                text: `${PREVIEW_TAG}⚠️ _Imeshindwa kutuma preview halisi. Hii ni muonekano wake:_\n\n${formatted}`,
            }, { quoted: originalMessage });
            return { success: false, method: 'text-fallback', error };
        } catch (finalError) {
            throw new Error(`Preview failed completely: ${finalError.message}`);
        }
    }
}

/**
 * Format payload kama text (fallback)
 */
function formatPreviewPayload(payload) {
    if (!payload) return '_(hakuna payload)_';
    try {
        return util.inspect(payload, { depth: 4, colors: false, maxArrayLength: 20 });
    } catch {
        return String(payload);
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 5. SANDBOX EXECUTION (Preview Mode)
// ─── ──────────────────────────────────────────────────────────────────────

function createSandbox(sock, chatId, message, args, senderId, commandName = '', options = {}) {
    const previewMode = options.previewMode === true;

    const sandbox = {
        sock, chatId, message, args: args || [], senderId, commandName, prefix: '.', ctx: null,
        console: {
            log: (...values) => sandbox.__logs.push(values.map((v) => util.format(v)).join(' ')),
            error: (...values) => sandbox.__logs.push(values.map((v) => util.format(v)).join(' ')),
            warn: (...values) => sandbox.__logs.push(values.map((v) => util.format(v)).join(' ')),
            info: (...values) => sandbox.__logs.push(values.map((v) => util.format(v)).join(' ')),
        },
        util,
        require: (specifier) => {
            if (typeof specifier !== 'string') throw new TypeError('Module specifier must be a string');
            const baseRequire = Module.createRequire(path.join(COMMANDS_DIR, 'addcmd.js'));
            if (specifier.startsWith('.')) {
                try { return require(path.resolve(COMMANDS_DIR, specifier)); } catch { return baseRequire(specifier); }
            }
            return baseRequire(specifier);
        },
        process, Buffer,
        __dirname: process.cwd(),
        __filename: path.join(process.cwd(), 'runCommand.js'),
        module: { exports: {} }, exports: {},
        setTimeout, setInterval, clearTimeout, clearInterval,
        Promise, Date, Math, String, Number, Boolean, Array, Object, JSON, Error, RegExp, Map, Set,
        sendMessage: async (content, opts = {}) => {
            if (previewMode) {
                sandbox.__sent = true;
                const preview = {
                    preview: true, payload: content,
                    options: { quoted: message, ...opts },
                };
                sandbox.__sentMessages.push(preview);
                return preview;
            }
            const result = await sock.sendMessage(chatId, content, { quoted: message, ...opts });
            sandbox.__sent = true;
            sandbox.__sentMessages.push(result);
            return result;
        },
        reply: async (content, opts = {}) => {
            if (previewMode) {
                sandbox.__sent = true;
                const preview = {
                    preview: true, payload: content,
                    options: { quoted: message, ...opts },
                };
                sandbox.__sentMessages.push(preview);
                return preview;
            }
            const result = await sock.sendMessage(chatId, content, { quoted: message, ...opts });
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

    try {
        const mbPath = resolveMessageBuilderPath();
        if (mbPath) {
            const mb = require(mbPath);
            sandbox.Button = mb.Button; sandbox.ButtonV2 = mb.ButtonV2;
            sandbox.Carousel = mb.Carousel; sandbox.AIRich = mb.AIRich;
            sandbox.Toolkit = mb.Toolkit; sandbox.createCtx = mb.createCtx;
        } else {
            const mb = require('../lib/messageBuilder');
            sandbox.Button = mb.Button; sandbox.ButtonV2 = mb.ButtonV2;
            sandbox.Carousel = mb.Carousel; sandbox.AIRich = mb.AIRich;
            sandbox.Toolkit = mb.Toolkit; sandbox.createCtx = mb.createCtx;
        }
    } catch (_) { console.log('[SANDBOX] MessageBuilder not loaded'); }

    return sandbox;
}

async function executeInSandbox(codeText, sandbox, timeout = 15000) {
    try {
        const script = new vm.Script(codeText, { filename: 'runCommand.js', displayErrors: true });
        const context = vm.createContext(sandbox);
        let result = script.runInContext(context, { timeout });
        if (result && typeof result.then === 'function') result = await result;
        if (result === undefined && typeof sandbox.module?.exports === 'function') {
            result = await sandbox.module.exports(sandbox.sock, sandbox.chatId, sandbox.message, sandbox.args, { senderId: sandbox.senderId });
        }
        return { success: true, result, logs: sandbox.__logs || [] };
    } catch (error) {
        return { success: false, error, logs: sandbox.__logs || [] };
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 6. RUN COMMAND
// ─── ──────────────────────────────────────────────────────────────────────

async function safeInvokeHandler(handler, sandbox, args = []) {
    if (typeof handler !== 'function') throw new Error('No valid handler found');
    const arity = handler.length;
    if (arity <= 1) {
        return await handler({ ...sandbox, args, conn: sandbox.sock, command: sandbox.commandName, message: sandbox.message, msg: sandbox.message, chat: sandbox.chatId, reply: sandbox.reply });
    }
    if (arity === 2) return await handler(sandbox.sock, sandbox.chatId);
    if (arity >= 3) return await handler(sandbox.sock, sandbox.chatId, sandbox.message, args, { senderId: sandbox.senderId, commandName: sandbox.commandName });
    return await handler();
}

/**
 * Tracked socket — inarekodi sendMessage/relayMessage BILA kutuma.
 * Inatumika kwa previewMode.
 */
function createTrackedSocket(sock, sandbox) {
    return new Proxy(sock, {
        get(target, property, receiver) {
            if (property === 'relayMessage') {
                return async (...args) => {
                    if (sandbox.previewMode) {
                        sandbox.__sent = true;
                        const preview = {
                            preview: true, payload: args[1],
                            options: args[2] || {},
                            isRelay: true,
                        };
                        sandbox.__sentMessages.push(preview);
                        return preview;
                    }
                    const result = await target.relayMessage.apply(target, args);
                    sandbox.__sentMessages.push(result);
                    return result;
                };
            }
            if (property === 'sendMessage') {
                return async (...args) => {
                    if (sandbox.previewMode) {
                        sandbox.__sent = true;
                        const preview = {
                            preview: true, payload: args[0],
                            options: args[1] || {},
                            isRelay: false,
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

function extractFunctionName(source) {
    const content = String(source || '').replace(/^```[\w-]*\s*|\s*```$/g, '').trim();
    if (!content) return '';

    const commandMetadata =
        content.match(/\bcommands\s*:\s*\[\s*['"`]([\w-]+)/i) ||
        content.match(/\bcommandName\s*[:=]\s*['"`]([\w-]+)/i) ||
        content.match(/\bmodule\.exports\.name\s*=\s*['"`]([\w-]+)/i) ||
        content.match(/\bname\s*[:=]\s*['"`]([\w-]+)['"`]/i);
    if (commandMetadata && /^[a-zA-Z_$][\w$]*$/.test(commandMetadata[1])) return commandMetadata[1];

    const namedFunction = content.match(/\b(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)\s*\(/);
    if (namedFunction) return namedFunction[1];

    const varFunction = content.match(/\b(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[a-zA-Z_$][\w$]*\s*=>)/);
    if (varFunction && varFunction[1] !== '>' && varFunction[1] !== '=>') return varFunction[1];

    const exportedRef = content.match(/\bmodule\.exports\s*=\s*([a-zA-Z_$][\w$]*)\s*;?\s*$/m);
    if (exportedRef && exportedRef[1] !== '>' && exportedRef[1] !== '=>') return exportedRef[1];

    const exportedProp = content.match(/\bmodule\.exports\.([a-zA-Z_$][\w$]*)\s*=/);
    if (exportedProp) return exportedProp[1];

    const objExport = content.match(/\bmodule\.exports\s*=\s*\{[\s\S]*?\b(?:async\s+)?([a-zA-Z_$][\w$]*)\s*\([^)]*\)\s*\{/);
    if (objExport) return objExport[1];

    const inlineNamed = content.match(/\b(?:async\s+)?([a-zA-Z_$][\w$]*)\s*\([^)]*\)\s*\{/);
    if (inlineNamed && !['if', 'for', 'while', 'switch', 'catch', 'return', 'function'].includes(inlineNamed[1])) return inlineNamed[1];

    return '';
}

function isRunnableCodeSnippet(source) {
    return /\b(?:async\s+)?function\s+[\w$]+\s*\(|=>|\bmodule\.exports\b|\b(?:sock|conn|RyuuBotz)\.(?:sendMessage|relayMessage)\s*\(|\breturn\s+await\s+[\w$]+\s*\(/m.test(source);
}

function createSnippetSandbox(sock, chatId, message, senderId) {
    const baseRequire = Module.createRequire(path.join(process.cwd(), '__run_preview__.js'));
    const sandbox = {
        sock, conn: sock, core: sock, chatId, jid: chatId, message, senderId, commandName: 'snippet', args: [], prefix: '.',
        util, process, Buffer, __dirname: process.cwd(), __filename: path.join(process.cwd(), '__run_preview__.js'),
        module: { exports: {} }, exports: {},
        setTimeout, setInterval, clearTimeout, clearInterval,
        Promise, Date, Math, String, Number, Boolean, Array, Object, JSON, Error, RegExp, Map, Set,
        require: specifier => {
            if (typeof specifier !== 'string') throw new TypeError('Module specifier must be a string');
            const rootedSpecifier = specifier.startsWith('../') ? `./${specifier.slice(3)}` : specifier;
            try { return baseRequire(rootedSpecifier); } catch (error) {
                if (rootedSpecifier === specifier) throw error;
                return baseRequire(specifier);
            }
        },
        console: {
            log: (...values) => sandbox.__logs.push(values.map(value => util.format(value)).join(' ')),
            error: (...values) => sandbox.__logs.push(values.map(value => util.format(value)).join(' ')),
            warn: (...values) => sandbox.__logs.push(values.map(value => util.format(value)).join(' ')),
            info: (...values) => sandbox.__logs.push(values.map(value => util.format(value)).join(' ')),
        },
    };
    sandbox.__logs = []; sandbox.__sent = false; sandbox.__sentMessages = [];
    return sandbox;
}

/**
 * Preview snippet → Tuma preview KAMA ujumbe halisi wa bot
 */
async function previewSourceSnippet(sock, chatId, senderId, message, source) {
    const code = String(source || '').replace(/^```[\w-]*\s*|\s*```$/g, '').trim();
    const sandbox = createSnippetSandbox(sock, chatId, message, senderId);
    const trackedSocket = createTrackedSocket(sock, sandbox);
    const settings = require('../settings');

    sandbox.previewMode = true;
    sandbox.sock = trackedSocket; sandbox.conn = trackedSocket; sandbox.core = trackedSocket; sandbox.RyuuBotz = trackedSocket;
    sandbox.jid = chatId;
    sandbox.m = {
        ...message, chat: chatId,
        reply: async (text, options = {}) => trackedSocket.sendMessage(chatId, { text: String(text) }, { quoted: message, ...options }),
    };
    sandbox.namabot = global.namabot || settings.botName || settings.botname || 'Bot';
    sandbox.ownername = global.ownername || settings.botOwner || 'Owner';

    const result = await executeInSandbox(`(async () => {\n${code}\n})()`, sandbox);
    if (!result.success) {
        await sock.sendMessage(chatId, {
            text: `❌ Snippet preview imeshindwa:\n${result.error?.stack || result.error?.message || result.error}`,
        }, { quoted: message });
        return;
    }

    if (sandbox.__sentMessages.length) {
        // Tuma kila preview kama ujumbe halisi
        await sock.sendMessage(chatId, { text: `🔎 *PREVIEW YA SNIPPET — inafuata*` }, { quoted: message });
        for (const entry of sandbox.__sentMessages) {
            try {
                if (entry.isRelay) {
                    await sendPreviewAsBot(sock, chatId, entry.payload, entry.options, message);
                } else {
                    await sendPreviewAsBot(sock, chatId, entry.payload, entry.options, message);
                }
                await new Promise(r => setTimeout(r, 800)); // slight delay between messages
            } catch (err) {
                console.error('Preview send error:', err);
            }
        }
        return;
    }

    const detail = result.result !== undefined
        ? util.inspect(result.result, { depth: 4, colors: false })
        : result.logs.join('\n') || 'Function ime-run lakini haijaita sendMessage/relayMessage kutoa payload ya preview.';
    await sock.sendMessage(chatId, {
        text: `🔎 *PREVIEW YA FUNCTION SNIPPET*\n\n${detail}`,
    }, { quoted: message });
}

/**
 * Preview command → Tuma preview KAMA ujumbe halisi wa bot
 */
async function previewCommand(sock, chatId, senderId, message, targetInput) {
    const functionName = extractFunctionName(targetInput);
    const parts = targetInput.trim().split(/\s+/);
    const commandName = (functionName || parts[0]).replace(/^\./, '').toLowerCase();
    const commandPath = resolveCommandPath(commandName);

    if (!commandPath) {
        await sock.sendMessage(chatId, {
            text: `❌ Function/command "${commandName}" haikupatikana kwenye commands/. Tumia jina la command au function iliyotangazwa na ku-export.`,
        }, { quoted: message });
        return;
    }

    try {
        const commandModule = loadCommandModule(commandPath);
        const handler = findHandler(commandModule);
        if (!handler) throw new Error('Hakuna runnable handler kwenye faili hilo.');

        const args = functionName ? [] : parts.slice(1);
        const invocationText = `.${commandName}${args.length ? ` ${args.join(' ')}` : ''}`;
        const previewMessage = { ...message, message: { conversation: invocationText } };
        const sandbox = createSandbox(sock, chatId, previewMessage, args, senderId, commandName, { previewMode: true });
        sandbox.previewMode = true;
        sandbox.sock = createTrackedSocket(sock, sandbox);
        sandbox.core = sandbox.sock;
        const result = await safeInvokeHandler(handler, sandbox, sandbox.args);

        if (sandbox.__sentMessages.length) {
            // Tuma taarifa ya kwanza
            await sock.sendMessage(chatId, {
                text: `🔎 *PREVIEW YA FUNCTION .${commandName}* — inafuata 👇`,
            }, { quoted: message });
            // Tuma kila preview kama ujumbe halisi
            for (const entry of sandbox.__sentMessages) {
                try {
                    await sendPreviewAsBot(sock, chatId, entry.payload, entry.options, message);
                    await new Promise(r => setTimeout(r, 800));
                } catch (err) {
                    console.error('Preview send error:', err);
                }
            }
            return;
        }

        const detail = result !== undefined
            ? util.inspect(result, { depth: 4, colors: false })
            : sandbox.__logs.join('\n') || 'Function haikuunda ujumbe wa preview.';
        await sock.sendMessage(chatId, {
            text: `🔎 *PREVIEW YA FUNCTION .${commandName}*\n\n${detail}`,
        }, { quoted: message });
    } catch (error) {
        await sock.sendMessage(chatId, {
            text: `❌ Preview ya function .${commandName} imeshindwa:\n${error?.stack || error?.message || error}`,
        }, { quoted: message });
    }
}

async function runCommand(sock, chatId, senderId, rawText, message, fullText = '') {
    try {
        const isOwner = message?.key?.fromMe || await isOwnerOrSudo(senderId, sock, chatId);
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Only the owner can run commands.' }, { quoted: message });
            return;
        }

        const input = (fullText || rawText || '').toString();
        const rawBody = input.replace(/^\.run\b/i, '').replace(/^\s/, '');
        const body = rawBody.trim();
        const quotedMessage = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedCode = quotedMessage?.conversation || quotedMessage?.extendedTextMessage?.text || quotedMessage?.imageMessage?.caption || quotedMessage?.videoMessage?.caption || '';

        if (body.match(/^list$/i)) {
            const commands = listCustomCommands();
            if (commands.length === 0) {
                await sock.sendMessage(chatId, { text: '📭 No custom commands found.' }, { quoted: message });
                return;
            }
            const commandList = commands.map((cmd) => `• .${cmd}`).join('\n');
            await sock.sendMessage(chatId, { text: `📋 Available custom commands:\n\n${commandList}\n\nTotal: ${commands.length} commands` }, { quoted: message });
            return;
        }

        if (body.match(/^delete\s+(\S+)/i)) {
            const match = body.match(/^delete\s+(\S+)/i);
            const cmdName = match[1];
            try {
                deleteCustomCommand(cmdName);
                await sock.sendMessage(chatId, { text: `✅ Command .${cmdName} deleted successfully.` }, { quoted: message });
            } catch (error) {
                await sock.sendMessage(chatId, { text: `❌ Failed to delete command: ${error.message}` }, { quoted: message });
            }
            return;
        }

        if (body.match(/^help$/i)) {
            await sock.sendMessage(chatId, {
                text: `🛠️ Run Command Help:\n\nUsage:\n• .run <command_or_function> [args] - Preview the matching command function\n• Reply to a named function with .run - Preview its matching command function\n• .run execute <command_name> [args] - Execute a custom command\n• .run list - List all custom commands\n• .run delete <command_name> - Delete a custom command\n\nExamples:\n.run button8\n.run preview button8\n.run execute button8\n.run list\n.run delete button8`
            }, { quoted: message });
            return;
        }

        if (!body && !quotedCode) {
            await sock.sendMessage(chatId, {
                text: `🛠️ Usage:\n• Reply to a named function and send .run\n• Or send .run <command_or_function> [args] to preview its handler.\n• Use .run execute <command_name> only when you intend to run it.\n• Send .run help for more info.`
            }, { quoted: message });
            return;
        }

        if (quotedCode) {
            const source = quotedCode.toString();
            const functionName = extractFunctionName(source);
            if (isRunnableCodeSnippet(source)) {
                await previewSourceSnippet(sock, chatId, senderId, message, source);
                return;
            }
            if (!functionName) {
                await sock.sendMessage(chatId, {
                    text: '❌ Code uliyo-reply nayo haina function inayoweza ku-preview. Hakikisha snippet ina function pamoja na call yake.',
                }, { quoted: message });
                return;
            }
            await previewCommand(sock, chatId, senderId, message, functionName);
            return;
        }

        const explicitPreview = body.match(/^preview\s+(.+)$/i);
        const explicitExecute = body.match(/^execute\s+(.+)$/i);
        const sourceFunction = extractFunctionName(rawBody);

        let target = explicitPreview?.[1] || explicitExecute?.[1] || sourceFunction || body;
        target = String(target || '').trim();
        if (!target || target === '>' || target === '=>' || target.startsWith('=>')) target = body;

        if (!explicitPreview && !explicitExecute && isRunnableCodeSnippet(rawBody)) {
            await previewSourceSnippet(sock, chatId, senderId, message, rawBody);
            return;
        }

        if (!explicitExecute) {
            await previewCommand(sock, chatId, senderId, message, target);
            return;
        }

        const parts = target.split(/\s+/);
        const commandName = parts[0].replace(/^\./, '').toLowerCase();
        const commandPath = resolveCommandPath(commandName);

        if (commandPath) {
            const args = parts.slice(1);
            let commandModule;
            try {
                commandModule = loadCommandModule(commandPath);
            } catch (loadError) {
                await sock.sendMessage(chatId, { text: `❌ Failed to load command file:\n${loadError?.message || loadError}` }, { quoted: message });
                return;
            }

            const handler = findHandler(commandModule);
            if (!handler) {
                await sock.sendMessage(chatId, { text: `❌ No runnable handler found in ${commandName}.js` }, { quoted: message });
                return;
            }

            try {
                const sandbox = createSandbox(sock, chatId, message, args, senderId, commandName, { previewMode: false });
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
                await sock.sendMessage(chatId, { text: `❌ Command .${commandName} failed:\n${execError?.stack || execError?.message || execError}` }, { quoted: message });
            }
            return;
        }

        await sock.sendMessage(chatId, { text: `❌ Command/function "${commandName}" haikupatikana kwenye commands/.` }, { quoted: message });

    } catch (error) {
        console.error('runCommand error:', error);
        await sock.sendMessage(chatId, { text: `❌ Run command failed: ${error?.message || error}` }, { quoted: message });
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 7. ADD COMMAND (CMDADD)
// ─── ──────────────────────────────────────────────────────────────────────

async function cmdaddCommand(sock, chatId, senderId, rawText, message, fullText = '') {
    try {
        const isOwner = message?.key?.fromMe || senderId?.toString()?.endsWith('@s.whatsapp.net') || false;
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Only the owner can add custom commands.' }, { quoted: message });
            return;
        }

        const input = (rawText || fullText || '').toString();
        const quotedMessage = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedCode = quotedMessage?.conversation || quotedMessage?.extendedTextMessage?.text || quotedMessage?.imageMessage?.caption || quotedMessage?.videoMessage?.caption || '';

        let commandName, sourceCode;

        if (quotedCode && !input.includes('module.exports')) {
            const nameMatch = input.match(/^\.cmdadd\s+([a-z0-9_\-]+)/i);
            if (!nameMatch) {
                await sock.sendMessage(chatId, { text: '🛠️ Usage:\n.cmdadd <command_name> (with quoted code)\nOr\n.cmdadd <command_name> <module_code>' }, { quoted: message });
                return;
            }
            commandName = nameMatch[1];
            sourceCode = quotedCode;
        } else {
            const match = input.match(/^\.cmdadd\s+([a-z0-9_\-]+)\s*(.*)$/is);
            if (!match) {
                await sock.sendMessage(chatId, { text: '🛠️ Usage:\n.cmdadd <command_name> <module_code>\n\nExample:\n.cmdadd button8 module.exports = { ... }' }, { quoted: message });
                return;
            }
            commandName = match[1].trim();
            sourceCode = (match[2] || '').trim();
        }

        if (!sourceCode) {
            await sock.sendMessage(chatId, { text: '❌ Please provide command source code. You can either type it or reply to a code message.' }, { quoted: message });
            return;
        }

        try {
            const filePath = saveCustomCommand(commandName, sourceCode);
            try {
                const module = loadCommandModule(filePath);
                const handler = findHandler(module);
                if (!handler) {
                    fs.unlinkSync(filePath);
                    await sock.sendMessage(chatId, { text: `❌ Command saved but no valid handler found. File deleted.` }, { quoted: message });
                    return;
                }
            } catch (loadError) {
                fs.unlinkSync(filePath);
                await sock.sendMessage(chatId, { text: `❌ Command saved but failed to load:\n${loadError.message}\n\nFile deleted.` }, { quoted: message });
                return;
            }

            await sock.sendMessage(chatId, { text: `✅ Custom command saved as .${commandName}\n\nFile: commands/${commandName}.js` }, { quoted: message });
        } catch (saveError) {
            await sock.sendMessage(chatId, { text: `❌ Failed to save command: ${saveError?.message || saveError}` }, { quoted: message });
        }

    } catch (error) {
        console.error('cmdadd error:', error);
        await sock.sendMessage(chatId, { text: `❌ Failed to add custom command: ${error?.message || error}` }, { quoted: message });
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 8. EXPORTS
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
    COMMANDS_DIR,
    sendPreviewAsBot,
    formatPreviewPayload,
    previewCommand,
    previewSourceSnippet,
    extractFunctionName,
    isRunnableCodeSnippet,
    createSnippetSandbox,
};
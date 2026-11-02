/**
 * addcmd.js - Powerful Command Manager (Full Fixed & Enhanced Version)
 * Features:
 *   - Add, Run, List, Delete custom commands
 *   - Live Preview as Bot Message (buttons, image, interactive, n.k.)
 *   - Smart Code Completion — inaongeza `)`, `}` na template literals sahihi
 *   - Sandbox execution with security checks and syntax validation
 *   - Handles relayMessage, sendMessage, requestPaymentMessage, interactiveMessage, etc.
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
    if (!normalizedName) return null;

    const normalPath = path.join(COMMANDS_DIR, `${normalizedName}.js`);
    if (fs.existsSync(normalPath)) return normalPath;

    const aliasPath = fs.readdirSync(COMMANDS_DIR)
        .filter((file) => file.endsWith('.js'))
        .find((file) => path.basename(file, '.js').toLowerCase() === normalizedName);
    if (aliasPath) return path.join(COMMANDS_DIR, aliasPath);

    const escapedName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const functionDeclaration = new RegExp(
        '\\b(?:async\\s+)?function\\s+' + escapedName + '\\b|\\b(?:const|let|var)\\s+' + escapedName + '\\s*=',
        'm'
    );
    const files = fs.readdirSync(COMMANDS_DIR).filter((file) => file.endsWith('.js'));
    for (const file of files) {
        const fullPath = path.join(COMMANDS_DIR, file);
        const source = fs.readFileSync(fullPath, 'utf8');

        const isExported = new RegExp(
            'module\\.exports[\\s\\S]*\\b' + escapedName + '\\b|exports\\.' + escapedName + '\\s*=|module\\.exports\\.name\\s*=\\s*[\'"]' + escapedName + '[\'"]',
            'm'
        );
        const hasCommandName = new RegExp(
            '\\bcommands\\s*:\\s*\\[[^\\]]*[\'"]' + escapedName + '[\'"]',
            'i'
        ).test(source);
        const exportsRunHandler = hasCommandName && /run\s*\(/.test(source);

        if ((functionDeclaration.test(source) && isExported.test(source)) || exportsRunHandler) {
            return fullPath;
        }
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
    try {
        return fs.readFileSync(filePath, 'utf8').includes(GENERATED_MARKER);
    } catch {
        return false;
    }
}

function registerGeneratedCommand(commandName, filePath) {
    if (!global.commands || typeof global.commands !== 'object') global.commands = {};
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
    try {
        if (global.autoRegisteredCommands instanceof Map) {
            if (typeof global.reloadAutoRegisteredCommands === 'function') {
                global.reloadAutoRegisteredCommands();
            }
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
    } catch {
        return [];
    }
}

function deleteCustomCommand(commandName) {
    const filePath = path.join(COMMANDS_DIR, `${commandName}.js`);
    if (!fs.existsSync(filePath)) throw new Error(`Command "${commandName}" not found`);
    if (!isGeneratedCommandFile(filePath)) {
        throw new Error(`Command "${commandName}" is not a generated command and cannot be deleted here.`);
    }
    fs.unlinkSync(filePath);
    if (global.commands && global.commands[commandName]) delete global.commands[commandName];
    return true;
}

// ─── ──────────────────────────────────────────────────────────────────────
// 4. IMPROVED FUNCTIONS (formatPreviewPayload, completeCodeIfTruncated, saveCustomCommand, sendPreviewAsBot)
// ─── ──────────────────────────────────────────────────────────────────────

function formatPreviewPayload(payload) {
    if (!payload) return '_(hakuna payload)_';
    if (typeof payload === 'string') return payload;

    try {
        let msg = payload;
        if (msg.message) msg = msg.message;
        if (msg.buttonsMessage) msg = msg.buttonsMessage;
        if (msg.viewOnceMessage) msg = msg.viewOnceMessage;
        if (msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2;
        if (msg.interactiveMessage) msg = msg.interactiveMessage;
        if (msg.documentWithCaptionMessage) msg = msg.documentWithCaptionMessage;
        if (msg.ephemeralMessage) msg = msg.ephemeralMessage;

        const lines = [];
        lines.push('╭━━━〔 *PREVIEW* 〕━━━⬣');
        lines.push('┃');

        if (msg.requestPaymentMessage) {
            const rpm = msg.requestPaymentMessage;
            const amount = rpm.amount1000 ? (Number(rpm.amount1000) / 1000).toFixed(2) : 'N/A';
            lines.push('┃ 💰 *PAYMENT REQUEST*');
            lines.push(`┃   Amount: ${amount} ${rpm.currency || ''}`);
            lines.push(`┃   Note: ${rpm.note || '-'}`);
            lines.push(`┃   To: ${rpm.requestFrom || '-'}`);
            if (rpm.expiryTimestamp) {
                lines.push(`┃   Expires: ${new Date(Number(rpm.expiryTimestamp) * 1000).toISOString()}`);
            }
            lines.push('┃');
        }

        if (msg.interactiveMessage) {
            const im = msg.interactiveMessage;
            if (im.header) {
                lines.push(`┃ 🏷️ *Header:* ${im.header.title || ''}`);
                if (im.header.subtitle) lines.push(`┃   ${im.header.subtitle}`);
            }
            if (im.body) {
                lines.push('┃ 📌 *Body:*');
                String(im.body.text || '').split('\n').forEach((l) => lines.push(`┃   ${l}`));
            }
            if (im.footer) lines.push(`┃ 🦶 _${im.footer.text || ''}_`);
            if (im.nativeFlowMessage?.buttons) {
                lines.push('┃ 🔘 *Native Flow Buttons:*');
                im.nativeFlowMessage.buttons.forEach((btn, i) => {
                    let label = btn.name || `Button ${i + 1}`;
                    try {
                        const params = JSON.parse(btn.buttonParamsJson || '{}');
                        if (params.display_text) label = params.display_text;
                        if (params.id) label += ` (id: ${params.id})`;
                    } catch (_) {}
                    lines.push(`┃   ${i + 1}. [ ${label} ]`);
                });
            }
            lines.push('┃');
        }

        if (msg.buttonsMessage) {
            const bm = msg.buttonsMessage;
            if (bm.contentText) {
                lines.push('┃ 📌 *Content:*');
                String(bm.contentText).split('\n').forEach((l) => lines.push(`┃   ${l}`));
            }
            if (bm.footerText) lines.push(`┃ 🦶 _${bm.footerText}_`);
            if (bm.buttons) {
                lines.push('┃ 🔘 *Buttons:*');
                bm.buttons.forEach((btn, i) => {
                    const label = btn.buttonText?.displayText || btn.text || `Button ${i + 1}`;
                    lines.push(`┃   ${i + 1}. [ ${label} ]`);
                    if (btn.buttonId) lines.push(`┃      ↳ id: ${btn.buttonId}`);
                });
            }
            lines.push('┃');
        }

        if (msg.imageMessage) {
            lines.push('┃ 🖼️ *[IMAGE]*');
            if (msg.imageMessage.caption) lines.push(`┃ 📝 _${msg.imageMessage.caption}_`);
            lines.push('┃');
        }
        if (msg.videoMessage) {
            lines.push('┃ 🎥 *[VIDEO]*');
            if (msg.videoMessage.caption) lines.push(`┃ 📝 _${msg.videoMessage.caption}_`);
            lines.push('┃');
        }
        if (msg.documentMessage) {
            lines.push('┃ 📄 *[DOCUMENT]*');
            lines.push(`┃ 📎 ${msg.documentMessage.fileName || 'file'}`);
            if (msg.documentMessage.caption) lines.push(`┃ 📝 _${msg.documentMessage.caption}_`);
            lines.push('┃');
        }
        if (msg.audioMessage) {
            lines.push('┃ 🎵 *[AUDIO]*');
            lines.push(`┃ ⏱️ Duration: ${msg.audioMessage.seconds || '?'}s`);
            if (msg.audioMessage.ptt) lines.push('┃ 🎤 Voice Note');
            lines.push('┃');
        }
        if (msg.stickerMessage) {
            lines.push('┃ 🎨 *[STICKER]*');
            lines.push('┃');
        }
        if (msg.locationMessage) {
            lines.push('┃ 📍 *[LOCATION]*');
            lines.push(`┃   Lat: ${msg.locationMessage.degreesLatitude}`);
            lines.push(`┃   Lon: ${msg.locationMessage.degreesLongitude}`);
            if (msg.locationMessage.name) lines.push(`┃   Name: ${msg.locationMessage.name}`);
            lines.push('┃');
        }
        if (msg.contactMessage) {
            lines.push('┃ 👤 *[CONTACT]*');
            lines.push(`┃   Name: ${msg.contactMessage.displayName || '-'}`);
            lines.push('┃');
        }
        if (msg.reactionMessage) {
            lines.push('┃ 😊 *[REACTION]*');
            lines.push(`┃   Emoji: ${msg.reactionMessage.text || '-'}`);
            lines.push('┃');
        }
        if (msg.protocolMessage) {
            lines.push('┃ 🔧 *[PROTOCOL]*');
            lines.push(`┃   Type: ${msg.protocolMessage.type || '-'}`);
            lines.push('┃');
        }

        const text = msg.conversation || msg.extendedTextMessage?.text || msg.contentText;
        if (text) {
            lines.push('┃ 📌 *Text:*');
            String(text).split('\n').forEach((l) => lines.push(`┃   ${l}`));
            lines.push('┃');
        }

        if (lines.length <= 2) {
            lines.push('┃ ⚠️ _Payload haijatambulika_');
            lines.push('┃');
            try {
                const preview = JSON.stringify(payload, null, 2);
                preview.split('\n').slice(0, 15).forEach((l) => lines.push(`┃ ${l}`));
            } catch (_) {
                lines.push('┃ _Imeshindwa kuonyesha payload_');
            }
            lines.push('┃');
        }

        lines.push('╰━━━━━━━━━━━━━━━━━━⬣');
        return lines.join('\n');
    } catch (error) {
        return `_Imeshindwa kuonyesha payload: ${error.message}_`;
    }
}

function completeCodeIfTruncated(code) {
    if (!code) return code;
    let cleaned = String(code).trim();

    // Ondoa alama za WhatsApp truncation
    cleaned = cleaned.replace(/\.\.\.\s*Read\s*more\s*$/i, '');
    cleaned = cleaned.replace(/…\s*Read\s*more\s*$/i, '');
    cleaned = cleaned.replace(/\.\.\.\s*$/g, '');
    cleaned = cleaned.replace(/…\s*$/g, '');

    // Hesabu brackets kwa kuzingatia strings na comments
    const stack = [];
    let inString = null;
    let inComment = false;
    let inBlockComment = false;
    let escape = false;
    let templateDepth = 0;

    for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];
        const next = cleaned[i + 1] || '';

        if (escape) { escape = false; continue; }
        if (char === '\\') { escape = true; continue; }

        if (!inString && !inBlockComment && char === '/' && next === '/') {
            inComment = true; continue;
        }
        if (inComment && char === '\n') { inComment = false; continue; }
        if (!inString && !inComment && char === '/' && next === '*') {
            inBlockComment = true; i++; continue;
        }
        if (inBlockComment && char === '*' && next === '/') {
            inBlockComment = false; i++; continue;
        }
        if (inComment || inBlockComment) continue;

        if (!inString && (char === '"' || char === "'" || char === '`')) {
            inString = char; 
            if (char === '`') templateDepth++;
            continue;
        }
        if (inString && char === inString) { 
            inString = null; 
            if (char === '`' && templateDepth > 0) templateDepth--;
            continue; 
        }
        if (inString) continue;

        if (char === '(' || char === '{' || char === '[') {
            stack.push(char);
        } else if (char === ')' || char === '}' || char === ']') {
            const open = char === ')' ? '(' : char === '}' ? '{' : '[';
            if (stack[stack.length - 1] === open) stack.pop();
        }
    }

    if (inComment) cleaned += '\n';
    if (inBlockComment) cleaned += '*/';
    if (inString) {
        if (escape) cleaned += '\\';
        cleaned += inString;
    }

    // Funga brackets kwa mpangilio wa nyuma
    while (stack.length > 0) {
        const open = stack.pop();
        if (open === '(') cleaned += ')';
        else if (open === '{') cleaned += '}';
        else if (open === '[') cleaned += ']';
    }

    // Kama code inaishia na operator, safisha
    if (/[,\+\-\*\/\=\&\|\?]\s*$/.test(cleaned)) {
        cleaned = cleaned.replace(/[,\+\-\*\/\=\&\|\?]\s*$/, '');
    }

    return cleaned.trim();
}

function isCodeLikelyTruncated(code) {
    if (!code) return false;
    const s = String(code).trim();
    if (/\.\.\.\s*$/.test(s) || /…\s*$/.test(s) || /Read\s*more\s*$/i.test(s)) return true;

    const openParen = (s.match(/\(/g) || []).length;
    const closeParen = (s.match(/\)/g) || []).length;
    const openBrace = (s.match(/\{/g) || []).length;
    const closeBrace = (s.match(/\}/g) || []).length;
    const openBracket = (s.match(/\[/g) || []).length;
    const closeBracket = (s.match(/\]/g) || []).length;

    if (openParen !== closeParen || openBrace !== closeBrace || openBracket !== closeBracket) return true;
    if (/[,\+\-\*\/\=\&\|\?]\s*$/.test(s)) return true;

    return false;
}

function saveCustomCommand(commandName, sourceCode) {
    const filePath = path.join(COMMANDS_DIR, `${commandName}.js`);

    if (!/^[a-z0-9_\-]+$/i.test(commandName)) {
        throw new Error('Invalid command name. Use only letters, numbers, underscore, and hyphen.');
    }
    if (commandName.length > 30) {
        throw new Error('Command name is too long (max 30 characters).');
    }
    if (fs.existsSync(filePath) && !isGeneratedCommandFile(filePath)) {
        throw new Error(`Command "${commandName}" already exists as a built-in command and cannot be overwritten.`);
    }

    let cleaned = String(sourceCode || '')
        .replace(/^```(?:js|javascript)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

    if (!cleaned) throw new Error('Command source is empty');

    if (isCodeLikelyTruncated(cleaned)) {
        cleaned = completeCodeIfTruncated(cleaned);
    }

    cleaned = cleaned.replace(/require\(['"]\.\.\/lib\/messagebuilder['"]\)/gi, "require('../lib/messageBuilder')");
    cleaned = cleaned.replace(/require\(['"]\.\.\/lib\/messagebuilder\.js['"]\)/gi, "require('../lib/messageBuilder')");
    cleaned = cleaned.replace(/require\(['"]\.\.\/\.\.\/lib\/messagebuilder['"]\)/gi, "require('../lib/messageBuilder')");
    cleaned = cleaned.replace(/require\(['"]\.\.\/\.\.\/lib\/messagebuilder\.js['"]\)/gi, "require('../lib/messageBuilder')");

    const symbolNames = ['Button', 'ButtonV2', 'Carousel', 'AIRich', 'Toolkit', 'createCtx'];
    const hasMessageBuilderRequire = /messageBuilder/.test(cleaned);
    const hasSymbol = symbolNames.some((s) => new RegExp('\\b' + s + '\\b').test(cleaned));
    const header = `${GENERATED_MARKER}\nconst { Button, ButtonV2, Carousel, AIRich, Toolkit, createCtx } = require('../lib/messageBuilder');\n\n`;

    const isDirectFunction =
        /^async\s*\(/.test(cleaned) ||
        /^async\s+[A-Za-z0-9_$]+\s*\(/.test(cleaned) ||
        /^function\s*/.test(cleaned) ||
        /^\(.*\)\s*=>/.test(cleaned) ||
        /^async\s*\(.*\)\s*=>/.test(cleaned);
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
        cleaned = cleaned.replace(
            /module\.exports\s*=\s*/,
            "module.exports = async function generatedCommand(sock, chatId, message, args = [], options = {}) {\n    return (async () => {\n    "
        );
        cleaned += '\n    })();\n};\n';
    }

    const finalSource = `${(!hasMessageBuilderRequire && hasSymbol) || !hasMessageBuilderRequire ? header : ''}${cleaned}\n`;
    
    try {
        new Function(finalSource);
    } catch (syntaxError) {
        throw new Error(`Syntax error: ${syntaxError.message}`);
    }

    fs.writeFileSync(filePath, finalSource, 'utf8');
    registerGeneratedCommand(commandName, filePath);
    return filePath;
}

function saveAndLoadGeneratedCommand(commandName, sourceCode) {
    const filePath = path.join(COMMANDS_DIR, `${commandName}.js`);
    const previousSource = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
    let saved = false;

    try {
        saveCustomCommand(commandName, sourceCode);
        saved = true;
        const commandModule = loadCommandModule(filePath);
        const handler = findHandler(commandModule);
        if (!handler) throw new Error('No valid handler found in generated command.');
        return { filePath, commandModule, handler };
    } catch (error) {
        if (saved) {
            if (previousSource === null) {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                if (global.commands) delete global.commands[commandName];
                if (global.autoRegisteredCommands instanceof Map) {
                    global.autoRegisteredCommands.delete(commandName);
                } else if (global.autoRegisteredCommands) {
                    delete global.autoRegisteredCommands[commandName];
                }
            } else {
                fs.writeFileSync(filePath, previousSource, 'utf8');
            }
            try { delete require.cache[require.resolve(filePath)]; } catch (_) {}
        }
        throw error;
    }
}

async function requestCommandRepair(sourceCode, error) {
    try {
        const { repairCodeSnippet } = require('./chatbot');
        return await repairCodeSnippet(
            sourceCode,
            `${error?.name || 'Error'}: ${error?.message || error}`
        );
    } catch (repairError) {
        console.error('AI command repair failed:', repairError?.message || repairError);
        return null;
    }
}

async function saveGeneratedCommandWithRepair(commandName, sourceCode) {
    let candidate = sourceCode;
    let repaired = false;

    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            return { ...saveAndLoadGeneratedCommand(commandName, candidate), repaired };
        } catch (error) {
            if (attempt > 0 || !/Syntax error:|Failed to load module:|No valid handler/i.test(error.message)) {
                throw error;
            }
            const fixed = await requestCommandRepair(candidate, error);
            if (!fixed) throw error;
            candidate = fixed;
            repaired = true;
        }
    }

    throw new Error('AI repair could not produce a valid command.');
}

async function repairExistingGeneratedCommand(commandPath, error) {
    if (!isGeneratedCommandFile(commandPath)) return null;

    const commandName = path.basename(commandPath, '.js');
    const sourceCode = fs.readFileSync(commandPath, 'utf8');
    const fixed = await requestCommandRepair(sourceCode, error);
    if (!fixed) return null;

    const cleaned = String(fixed)
        .replace(/^```(?:js|javascript)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
    const repairedSource = cleaned.includes(GENERATED_MARKER)
        ? `${cleaned}\n`
        : `${GENERATED_MARKER}\n${cleaned}\n`;

    try {
        new Function(repairedSource);
        fs.writeFileSync(commandPath, repairedSource, 'utf8');
        const commandModule = loadCommandModule(commandPath);
        const handler = findHandler(commandModule);
        if (!handler) throw new Error('No valid handler found in repaired command.');
        registerGeneratedCommand(commandName, commandPath);
        return { filePath: commandPath, commandModule, handler };
    } catch (repairError) {
        fs.writeFileSync(commandPath, sourceCode, 'utf8');
        try { delete require.cache[require.resolve(commandPath)]; } catch (_) {}
        console.error(`AI repair for .${commandName} was rejected:`, repairError?.message || repairError);
        return null;
    }
}

async function sendPreviewAsBot(sock, chatId, payload, options = {}, originalMessage = null) {
    try {
        if (!payload) {
            await sock.sendMessage(chatId, {
                text: `${PREVIEW_TAG}⚠️ _Payload tupu._`,
            }, { quoted: originalMessage });
            return { success: false, reason: 'empty-payload' };
        }

        if (typeof payload === 'string') {
            await sock.sendMessage(chatId, {
                text: `${PREVIEW_TAG}📝 *Text Message:*\n\n${payload}`,
            }, { quoted: originalMessage });
            return { success: true, method: 'text' };
        }

        const previewPayload = JSON.parse(JSON.stringify(payload));

        const relayKeys = [
            'buttonsMessage', 'viewOnceMessage', 'viewOnceMessageV2',
            'interactiveMessage', 'documentWithCaptionMessage', 'ephemeralMessage',
            'requestPaymentMessage', 'templateMessage', 'listMessage',
            'productMessage', 'orderMessage', 'invoiceMessage',
        ];
        const isRelay = relayKeys.some((k) => previewPayload[k]);

        if (previewPayload.text && typeof previewPayload.text === 'string' && !previewPayload.text.includes('PREVIEW MODE')) {
            previewPayload.text = `${PREVIEW_TAG}${previewPayload.text}`;
        } else if (previewPayload.caption && typeof previewPayload.caption === 'string' && !previewPayload.caption.includes('PREVIEW MODE')) {
            previewPayload.caption = `${PREVIEW_TAG}${previewPayload.caption}`;
        }

        try {
            await sock.sendMessage(chatId, previewPayload, { quoted: originalMessage, ...options });
            return { success: true, method: 'sendMessage' };
        } catch (sendError) {
            console.warn('[sendPreviewAsBot] sendMessage failed:', sendError.message);
            if (isRelay && typeof sock.relayMessage === 'function') {
                try {
                    await sock.relayMessage(chatId, previewPayload, { quoted: originalMessage, ...options });
                    return { success: true, method: 'relayMessage' };
                } catch (relayError) {
                    console.warn('[sendPreviewAsBot] relayMessage failed:', relayError.message);
                    throw new Error(`sendMessage: ${sendError.message} | relayMessage: ${relayError.message}`);
                }
            }
            throw sendError;
        }
    } catch (error) {
        console.error('[sendPreviewAsBot] Preview failed:', error.message);
        try {
            const formatted = formatPreviewPayload(payload);
            await sock.sendMessage(chatId, {
                text: `${PREVIEW_TAG}⚠️ _Imeshindwa kutuma preview halisi. Muonekano wake:_\n\n${formatted}`,
            }, { quoted: originalMessage });
            return { success: false, method: 'text-fallback', error };
        } catch (finalError) {
            console.error('[sendPreviewAsBot] Final error:', finalError);
            return { success: false, method: 'failed', error: finalError };
        }
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 5. SANDBOX EXECUTION
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
            const blockedModules = ['child_process', 'cluster', 'dgram', 'dns', 'net', 'readline'];
            if (blockedModules.includes(specifier)) {
                throw new Error(`Moduli '${specifier}' imezuiwa kwa sababu za kiusalama.`);
            }
            const baseRequire = Module.createRequire(path.join(COMMANDS_DIR, 'addcmd.js'));
            if (specifier.startsWith('.')) {
                try { return require(path.resolve(COMMANDS_DIR, specifier)); }
                catch { return baseRequire(specifier); }
            }
            return baseRequire(specifier);
        },
        process: {
            env: process.env,
            version: process.version,
            platform: process.platform,
            exit: () => { throw new Error('process.exit() imezuiwa kwenye sandbox!'); }
        },
        Buffer,
        __dirname: process.cwd(),
        __filename: path.join(process.cwd(), 'runCommand.js'),
        module: { exports: {} }, exports: {},
        setTimeout, setInterval, clearTimeout, clearInterval,
        Promise, Date, Math, String, Number, Boolean, Array, Object, JSON, Error, RegExp, Map, Set,
        sendMessage: async (content, opts = {}) => {
            if (previewMode) {
                sandbox.__sent = true;
                const preview = { preview: true, payload: content, options: { quoted: message, ...opts } };
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
                const preview = { preview: true, payload: content, options: { quoted: message, ...opts } };
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
    } catch (_) {}

    return sandbox;
}

async function executeInSandbox(codeText, sandbox, timeout = 15000) {
    try {
        const script = new vm.Script(codeText, { filename: 'runCommand.js', displayErrors: true });
        const context = vm.createContext(sandbox);
        let result = script.runInContext(context, { timeout });
        if (result && typeof result.then === 'function') result = await result;
        if (result === undefined && typeof sandbox.module?.exports === 'function') {
            result = await sandbox.module.exports(
                sandbox.sock, sandbox.chatId, sandbox.message, sandbox.args,
                { senderId: sandbox.senderId }
            );
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
        return await handler({
            ...sandbox, args, conn: sandbox.sock, command: sandbox.commandName,
            message: sandbox.message, msg: sandbox.message,
            chat: sandbox.chatId, reply: sandbox.reply,
        });
    }
    if (arity === 2) return await handler(sandbox.sock, sandbox.chatId);
    if (arity >= 3) {
        return await handler(sandbox.sock, sandbox.chatId, sandbox.message, args, {
            senderId: sandbox.senderId, commandName: sandbox.commandName,
        });
    }
    return await handler();
}

function createTrackedSocket(sock, sandbox) {
    return new Proxy(sock, {
        get(target, property, receiver) {
            if (property === 'relayMessage') {
                return async (...args) => {
                    if (sandbox.previewMode) {
                        sandbox.__sent = true;
                        sandbox.__sentMessages.push({
                            preview: true, payload: args[1], options: args[2] || {}, isRelay: true,
                        });
                        return { preview: true };
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
                        sandbox.__sentMessages.push({
                            preview: true, payload: args[0], options: args[1] || {}, isRelay: false,
                        });
                        return { preview: true };
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
        content.match(/\bmodule\.exports\.name\s*=\s*['"`]([\w-]+)/i);
    if (commandMetadata && /^[a-zA-Z_$][\w$]*$/.test(commandMetadata[1])) return commandMetadata[1];

    const namedFunction = content.match(/\b(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)\s*\(/);
    if (namedFunction) return namedFunction[1];

    const varFunction = content.match(
        /\b(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[a-zA-Z_$][\w$]*\s*=>)/
    );
    if (varFunction && varFunction[1] !== '>' && varFunction[1] !== '=>') return varFunction[1];

    const exportedRef = content.match(/\bmodule\.exports\s*=\s*([a-zA-Z_$][\w$]*)\s*;?\s*$/m);
    if (exportedRef && exportedRef[1] !== '>' && exportedRef[1] !== '=>') return exportedRef[1];

    const exportedProp = content.match(/\bmodule\.exports\.([a-zA-Z_$][\w$]*)\s*=/);
    if (exportedProp) return exportedProp[1];

    const inlineNamed = content.match(/\b(?:async\s+)?([a-zA-Z_$][\w$]*)\s*\([^)]*\)\s*\{/);
    if (inlineNamed && !['if', 'for', 'while', 'switch', 'catch', 'return', 'function'].includes(inlineNamed[1])) {
        return inlineNamed[1];
    }

    return '';
}

function isRunnableCodeSnippet(source) {
    if (!source) return false;
    const s = String(source).trim();
    if (!s || s === '>' || s === '=>') return false;

    return (
        /=>/.test(s) ||
        /\b(?:async\s+)?function\s+[\w$]+\s*\(/.test(s) ||
        /\bmodule\.exports\b/.test(s) ||
        /\b(?:sock|conn|socket|client|RyuuBotz|core|m)\.(?:sendMessage|relayMessage|message\.send)\s*\(/.test(s) ||
        /\b(?:await|return)\s+/.test(s) ||
        /\b(?:const|let|var)\s+[\w$]+\s*=/.test(s)
    );
}

function createSnippetSandbox(sock, chatId, message, senderId) {
    const baseRequire = Module.createRequire(path.join(process.cwd(), '__run_preview__.js'));
    const sandbox = {
        sock, conn: sock, core: sock, chatId, jid: chatId, message, senderId,
        commandName: 'snippet', args: [], prefix: '.',
        util, process: { env: process.env, version: process.version, platform: process.platform }, Buffer,
        __dirname: process.cwd(),
        __filename: path.join(process.cwd(), '__run_preview__.js'),
        module: { exports: {} }, exports: {},
        setTimeout, setInterval, clearTimeout, clearInterval,
        Promise, Date, Math, String, Number, Boolean, Array, Object, JSON, Error, RegExp, Map, Set,
        require: (specifier) => {
            if (typeof specifier !== 'string') throw new TypeError('Module specifier must be a string');
            const blockedModules = ['child_process', 'cluster', 'dgram', 'dns', 'net', 'readline'];
            if (blockedModules.includes(specifier)) {
                throw new Error(`Moduli '${specifier}' imezuiwa kwa sababu za kiusalama.`);
            }
            const rootedSpecifier = specifier.startsWith('../') ? `./${specifier.slice(3)}` : specifier;
            try { return baseRequire(rootedSpecifier); }
            catch (error) {
                if (rootedSpecifier === specifier) throw error;
                return baseRequire(specifier);
            }
        },
        console: {
            log: (...values) => sandbox.__logs.push(values.map((value) => util.format(value)).join(' ')),
            error: (...values) => sandbox.__logs.push(values.map((value) => util.format(value)).join(' ')),
            warn: (...values) => sandbox.__logs.push(values.map((value) => util.format(value)).join(' ')),
            info: (...values) => sandbox.__logs.push(values.map((value) => util.format(value)).join(' ')),
        },
    };
    sandbox.__logs = [];
    sandbox.__sent = false;
    sandbox.__sentMessages = [];
    sandbox.reply = async (content, options = {}) => sandbox.conn.sendMessage(
        chatId,
        typeof content === 'string' ? { text: content } : content,
        { quoted: message, ...options }
    );
    sandbox.__invokeSnippetFunction = async (handler) => {
        if (typeof handler !== 'function') throw new TypeError('Snippet function is not callable');
        if (handler.length <= 1) {
            return handler({ ...sandbox, conn: sandbox.conn, chat: chatId, msg: message });
        }
        if (handler.length === 2) return handler(sandbox.conn, sandbox.m);
        return handler(sandbox.conn, chatId, message, sandbox.args, { senderId });
    };
    sandbox.m = {
        ...message,
        chat: chatId,
        reply: sandbox.reply,
    };

    try {
        const mbPath = resolveMessageBuilderPath();
        const messageBuilder = require(mbPath || '../lib/messageBuilder');
        Object.assign(sandbox, {
            Button: messageBuilder.Button,
            ButtonV2: messageBuilder.ButtonV2,
            Carousel: messageBuilder.Carousel,
            AIRich: messageBuilder.AIRich,
            Toolkit: messageBuilder.Toolkit,
            createCtx: messageBuilder.createCtx,
        });
    } catch (error) {}

    return sandbox;
}

function prepareSnippetExecution(code) {
    const snippetFunctionName = extractFunctionName(code);
    const isFunctionDefinition = snippetFunctionName && (
        new RegExp(`^\\s*(?:async\\s+)?function\\s+${snippetFunctionName}\\s*\\(`).test(code) ||
        new RegExp(`^\\s*(?:const|let|var)\\s+${snippetFunctionName}\\s*=\\s*(?:async\\s*)?(?:function\\b|\\([^)]*\\)\\s*=>|[a-zA-Z_$][\\w$]*\\s*=>)`).test(code)
    );
    const directMessageCall = /^(?:await\s+)?(?:conn|sock|socket|client|RyuuBotz|core)\.(?:sendMessage|relayMessage)\s*\(/.test(code);
    const isBlockCode = !directMessageCall && (
        code.includes('module.exports') ||
        /^\s*(const|let|var|function|class|import|export)\s/m.test(code) ||
        (code.split('\n').filter((line) => line.trim()).length > 1 && /[;{}]/.test(code))
    );

    let wrappedCode;
    if (isFunctionDefinition) {
        wrappedCode = `(async () => {\n${code}\nreturn await __invokeSnippetFunction(${snippetFunctionName});\n})()`;
    } else if (directMessageCall) {
        const expression = code.replace(/^await\s+/, '').replace(/;\s*$/, '');
        wrappedCode = `(async () => await (${expression}))()`;
    } else if (isBlockCode) {
        wrappedCode = `(async () => {\n${code}\n})()`;
    } else {
        wrappedCode = `(async () => {\n    return await (${code});\n})()`;
    }

    return { wrappedCode, isBlockCode };
}

async function runSourceSnippet(sock, chatId, senderId, message, source, previewMode) {
    let code = String(source || '').replace(/^```[\w-]*\s*|\s*```$/g, '').trim();
    code = code.replace(/^\s*(?:=>|>)\s*/, '').trim();

    if (!code) {
        await sock.sendMessage(chatId, { text: '❌ Snippet ni tupu.' }, { quoted: message });
        return;
    }

    const wasTruncated = isCodeLikelyTruncated(code);
    let completedCode = completeCodeIfTruncated(code);
    let completionApplied = completedCode !== code;

    const sandbox = createSnippetSandbox(sock, chatId, message, senderId);
    const trackedSocket = createTrackedSocket(sock, sandbox);
    const settings = require('../settings');

    sandbox.previewMode = previewMode;
    sandbox.sock = trackedSocket;
    sandbox.conn = trackedSocket;
    sandbox.core = trackedSocket;
    sandbox.RyuuBotz = trackedSocket;
    sandbox.jid = chatId;
    sandbox.namabot = global.namabot || settings.botName || settings.botname || 'Bot';
    sandbox.ownername = global.ownername || settings.botOwner || 'Owner';

    const { wrappedCode, isBlockCode } = prepareSnippetExecution(completedCode);
    let result = await executeInSandbox(wrappedCode, sandbox);

    if (!result.success && !isBlockCode) {
        const fallbackWrapped = `(async () => {\n${completedCode}\n})()`;
        result = await executeInSandbox(fallbackWrapped, sandbox);
    }

    if (!result.success && wasTruncated) {
        const originalWrapped = `(async () => {\n${code}\n})()`;
        result = await executeInSandbox(originalWrapped, sandbox);
    }

    let aiRepaired = false;
    if (!result.success && !previewMode && !sandbox.__sentMessages.length &&
        ['SyntaxError', 'TypeError'].includes(result.error?.name)) {
        try {
            const { repairCodeSnippet } = require('./chatbot');
            const repairedSource = await repairCodeSnippet(
                completedCode,
                `${result.error?.name}: ${result.error?.message}`
            );
            if (repairedSource) {
                completedCode = completeCodeIfTruncated(repairedSource);
                completionApplied = completedCode !== code;
                const repairedExecution = prepareSnippetExecution(completedCode);
                result = await executeInSandbox(repairedExecution.wrappedCode, sandbox);
                if (!result.success && !repairedExecution.isBlockCode) {
                    result = await executeInSandbox(
                        `(async () => {\n${completedCode}\n})()`,
                        sandbox
                    );
                }
                aiRepaired = result.success;
            }
        } catch (repairError) {}
    }

    if (!result.success) {
        await sock.sendMessage(chatId, {
            text: `❌ *Snippet ${previewMode ? 'preview' : 'run'} imeshindwa*\n\n` +
                  `🔧 *Kosa:* ${result.error?.name || 'Error'}\n` +
                  `📝 *Maelezo:* ${result.error?.message || result.error}\n\n` +
                  `📄 *Code uliyotuma:*\n\`\`\`\n${code.slice(0, 500)}${code.length > 500 ? '\n...' : ''}\n\`\`\``,
        }, { quoted: message });
        return;
    }

    if ((wasTruncated && completionApplied) || aiRepaired) {
        await sock.sendMessage(chatId, {
            text: aiRepaired
                ? `🤖 *AI imerekebisha code na ime-run kikamilifu.*`
                : `🔧 *Code imefungwa na kusahihishwa kiotomatiki.*`,
        }, { quoted: message });
    }

    if (sandbox.__sentMessages.length) {
        if (previewMode) {
            await sock.sendMessage(chatId, {
                text: `🔎 *PREVIEW YA SNIPPET* — inafuata 👇`,
            }, { quoted: message });

            for (const entry of sandbox.__sentMessages) {
                try {
                    await sendPreviewAsBot(sock, chatId, entry.payload, entry.options, message);
                    await new Promise((r) => setTimeout(r, 900));
                } catch (err) {}
            }
        }
        return;
    }

    const detail = result.result !== undefined
        ? util.inspect(result.result, { depth: 4, colors: false })
        : result.logs.join('\n') || (previewMode
            ? 'Function ime-run lakini haijaita sendMessage/relayMessage kutoa payload ya preview.'
            : 'Code ime-run bila kutuma ujumbe.');
    await sock.sendMessage(chatId, {
        text: `${previewMode ? '🔎 *PREVIEW YA FUNCTION SNIPPET*' : '✅ *SNIPPET IME-RUN*'}\n\n${detail}`,
    }, { quoted: message });
}

async function previewSourceSnippet(sock, chatId, senderId, message, source) {
    return runSourceSnippet(sock, chatId, senderId, message, source, true);
}

async function executeSourceSnippet(sock, chatId, senderId, message, source) {
    return runSourceSnippet(sock, chatId, senderId, message, source, false);
}

async function previewCommand(sock, chatId, senderId, message, targetInput) {
    const functionName = extractFunctionName(targetInput);
    const parts = targetInput.trim().split(/\s+/);
    const commandName = (functionName || parts[0]).replace(/^\./, '').toLowerCase();

    if (!commandName || commandName === '>' || commandName === '=>') {
        await sock.sendMessage(chatId, {
            text: `❌ Hakuna jina la command/function lililopatikana kwenye "${targetInput}".`,
        }, { quoted: message });
        return;
    }

    const commandPath = resolveCommandPath(commandName);
    if (!commandPath) {
        await sock.sendMessage(chatId, {
            text: `❌ Function/command "${commandName}" haikupatikana kwenye commands/.`,
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
        const sandbox = createSandbox(sock, chatId, previewMessage, args, senderId, commandName, {
            previewMode: true,
        });
        sandbox.previewMode = true;
        sandbox.sock = createTrackedSocket(sock, sandbox);
        sandbox.core = sandbox.sock;

        const result = await safeInvokeHandler(handler, sandbox, sandbox.args);

        if (sandbox.__sentMessages.length) {
            await sock.sendMessage(chatId, {
                text: `🔎 *PREVIEW YA FUNCTION .${commandName}* — inafuata 👇`,
            }, { quoted: message });

            for (const entry of sandbox.__sentMessages) {
                try {
                    await sendPreviewAsBot(sock, chatId, entry.payload, entry.options, message);
                    await new Promise((r) => setTimeout(r, 900));
                } catch (err) {}
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
            text: `❌ Preview ya function .${commandName} imeshindwa:\n${error?.message || error}`,
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
        const quotedCode = quotedMessage?.conversation
            || quotedMessage?.extendedTextMessage?.text
            || quotedMessage?.imageMessage?.caption
            || quotedMessage?.videoMessage?.caption || '';

        if (body.match(/^list$/i)) {
            const commands = listCustomCommands();
            if (commands.length === 0) {
                await sock.sendMessage(chatId, { text: '📭 No custom commands found.' }, { quoted: message });
                return;
            }
            const commandList = commands.map((cmd) => `• .${cmd}`).join('\n');
            await sock.sendMessage(chatId, {
                text: `📋 Available custom commands:\n\n${commandList}\n\nTotal: ${commands.length} commands`,
            }, { quoted: message });
            return;
        }

        if (body.match(/^delete\s+(\S+)/i)) {
            const match = body.match(/^delete\s+(\S+)/i);
            try {
                deleteCustomCommand(match[1]);
                await sock.sendMessage(chatId, { text: `✅ Command .${match[1]} deleted successfully.` }, { quoted: message });
            } catch (error) {
                await sock.sendMessage(chatId, { text: `❌ Failed to delete command: ${error.message}` }, { quoted: message });
            }
            return;
        }

        if (body.match(/^help$/i)) {
            await sock.sendMessage(chatId, {
                text: `🛠️ Run Command Help:\n\nUsage:\n• .run <code> - Run code snippet\n• .run preview <code> - Preview action\n• .run execute <command_name> - Execute custom command\n• .run list - List commands\n• .run delete <command_name> - Delete command`,
            }, { quoted: message });
            return;
        }

        if (!body && !quotedCode) {
            await sock.sendMessage(chatId, {
                text: `🛠️ Usage:\n• Reply to code with .run\n• Or send .run <code>`,
            }, { quoted: message });
            return;
        }

        const explicitPreview = body.match(/^preview(?:\s+([\s\S]+))?$/i);
        const explicitExecute = body.match(/^execute(?:\s+([\s\S]+))?$/i);

        if (quotedCode) {
            const source = quotedCode.toString().trim();
            if (isRunnableCodeSnippet(source)) {
                if (explicitPreview) {
                    await previewSourceSnippet(sock, chatId, senderId, message, source);
                } else {
                    await executeSourceSnippet(sock, chatId, senderId, message, source);
                }
                return;
            }
            const functionName = extractFunctionName(source);
            if (functionName && functionName !== '>' && functionName !== '=>') {
                await previewCommand(sock, chatId, senderId, message, functionName);
                return;
            }
            await executeSourceSnippet(sock, chatId, senderId, message, source);
            return;
        }

        const snippetInput = explicitPreview?.[1] || explicitExecute?.[1] || body;
        let cleanBody = snippetInput.replace(/^\s*(?:=>|>)\s*/, '').trim();

        const looksLikeCode = isRunnableCodeSnippet(cleanBody) ||
            cleanBody.includes('relayMessage') ||
            cleanBody.includes('sendMessage') ||
            cleanBody.includes('await ') ||
            cleanBody.includes('client.') ||
            cleanBody.includes('sock.') ||
            cleanBody.includes('socket.');

        if (looksLikeCode) {
            const firstWord = cleanBody.split(/\s+/)[0].replace(/^\./, '').toLowerCase();
            const cmdPath = resolveCommandPath(firstWord);

            if (cmdPath && !cleanBody.includes('.') && !cleanBody.includes('(') &&
                !cleanBody.includes('=') && cleanBody.split(/\s+/).length <= 2) {
                await previewCommand(sock, chatId, senderId, message, cleanBody);
                return;
            }

            if (explicitPreview) {
                await previewSourceSnippet(sock, chatId, senderId, message, cleanBody);
            } else {
                await executeSourceSnippet(sock, chatId, senderId, message, cleanBody);
            }
            return;
        }

        const sourceFunction = extractFunctionName(cleanBody);
        let target = explicitPreview?.[1] || explicitExecute?.[1] || sourceFunction || cleanBody;
        target = String(target || '').trim();

        if (!target || target === '>' || target === '=>' || target.startsWith('=>') || target.startsWith('>')) {
            target = cleanBody;
        }

        if (!explicitExecute) {
            const firstWord = target.split(/\s+/)[0].replace(/^\./, '').toLowerCase();
            const cmdPath = resolveCommandPath(firstWord);

            if (!cmdPath && isRunnableCodeSnippet(target)) {
                await previewSourceSnippet(sock, chatId, senderId, message, target);
                return;
            }
            await previewCommand(sock, chatId, senderId, message, target);
            return;
        }

        const parts = target.split(/\s+/);
        const commandName = parts[0].replace(/^\./, '').toLowerCase();
        const commandPath = resolveCommandPath(commandName);

        if (commandPath) {
            const args = parts.slice(1);
            let commandModule;
            let handler;
            let aiRepaired = false;
            try {
                commandModule = loadCommandModule(commandPath);
                handler = findHandler(commandModule);
                if (!handler) throw new Error(`No runnable handler found in ${commandName}.js`);
            } catch (loadError) {
                const repairedCommand = await repairExistingGeneratedCommand(commandPath, loadError);
                if (!repairedCommand) {
                    await sock.sendMessage(chatId, {
                        text: `❌ Failed to load command file:\n${loadError?.message || loadError}`,
                    }, { quoted: message });
                    return;
                }
                commandModule = repairedCommand.commandModule;
                handler = repairedCommand.handler;
                aiRepaired = true;
            }

            let sandbox;
            let handlerResult;
            try {
                sandbox = createSandbox(sock, chatId, message, args, senderId, commandName, {
                    previewMode: false,
                });
                sandbox.sock = createTrackedSocket(sock, sandbox);
                sandbox.core = sandbox.sock;
                handlerResult = await safeInvokeHandler(handler, sandbox, sandbox.args);
            } catch (execError) {
                const repairedCommand = await repairExistingGeneratedCommand(commandPath, execError);
                if (!repairedCommand) {
                    await sock.sendMessage(chatId, {
                        text: `❌ Command .${commandName} failed:\n${execError?.message || execError}`,
                    }, { quoted: message });
                    return;
                }
                aiRepaired = true;

                if (sandbox?.__sentMessages?.length) {
                    await sock.sendMessage(chatId, {
                        text: `🤖 AI imehifadhi fix ya .${commandName}, lakini command ilikuwa tayari imetuma ujumbe; haikurudiwa kuzuia duplicate.`,
                    }, { quoted: message });
                    return;
                }

                try {
                    sandbox = createSandbox(sock, chatId, message, args, senderId, commandName, {
                        previewMode: false,
                    });
                    sandbox.sock = createTrackedSocket(sock, sandbox);
                    sandbox.core = sandbox.sock;
                    handlerResult = await safeInvokeHandler(repairedCommand.handler, sandbox, sandbox.args);
                    handler = repairedCommand.handler;
                } catch (retryError) {
                    await sock.sendMessage(chatId, {
                        text: `🤖 AI imehifadhi fix ya .${commandName}, lakini retry bado imeshindwa:\n${retryError?.message || retryError}`,
                    }, { quoted: message });
                    return;
                }
            }

            if (!sandbox.__sent && !sandbox.__sentMessages.length) {
                let response;
                if (handlerResult !== undefined) {
                    response = `✅ Command .${commandName} executed successfully.\nResult:\n${util.inspect(handlerResult, { depth: 2, colors: false })}`;
                } else if (sandbox.__logs.length) {
                    response = `✅ Command .${commandName} completed.\n\n📋 Logs:\n${sandbox.__logs.join('\n')}`;
                } else {
                    response = `✅ Command .${commandName} executed successfully.`;
                }
                if (aiRepaired) response = `🤖 AI imeirekebisha command.\n\n${response}`;
                await sock.sendMessage(chatId, { text: response }, { quoted: message });
            }
            return;
        }

        if (isRunnableCodeSnippet(target)) {
            await previewSourceSnippet(sock, chatId, senderId, message, target);
            return;
        }

        await sock.sendMessage(chatId, {
            text: `❌ Command/function "${commandName}" haikupatikana kwenye commands/.`,
        }, { quoted: message });

    } catch (error) {
        await sock.sendMessage(chatId, {
            text: `❌ Run command failed: ${error?.message || error}`,
        }, { quoted: message });
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
        const quotedCode = quotedMessage?.conversation
            || quotedMessage?.extendedTextMessage?.text
            || quotedMessage?.imageMessage?.caption
            || quotedMessage?.videoMessage?.caption || '';

        let commandName, sourceCode;

        if (quotedCode && !input.includes('module.exports')) {
            const nameMatch = input.match(/^\.cmdadd\s+([a-z0-9_\-]+)/i);
            if (!nameMatch) {
                await sock.sendMessage(chatId, {
                    text: '🛠️ Usage:\n.cmdadd <command_name> (with quoted code)',
                }, { quoted: message });
                return;
            }
            commandName = nameMatch[1];
            sourceCode = quotedCode;
        } else {
            const match = input.match(/^\.cmdadd\s+([a-z0-9_\-]+)\s*(.*)$/is);
            if (!match) {
                await sock.sendMessage(chatId, {
                    text: '🛠️ Usage:\n.cmdadd <command_name> <module_code>',
                }, { quoted: message });
                return;
            }
            commandName = match[1].trim();
            sourceCode = (match[2] || '').trim();
        }

        if (!sourceCode) {
            await sock.sendMessage(chatId, {
                text: '❌ Please provide command source code.',
            }, { quoted: message });
            return;
        }

        try {
            const { filePath, repaired } = await saveGeneratedCommandWithRepair(commandName, sourceCode);

            await sock.sendMessage(chatId, {
                text: `${repaired ? '🤖 AI imerekebisha command na validation imepita.\n\n' : ''}` +
                      `✅ Custom command saved as .${commandName}\n\nFile: ${path.relative(process.cwd(), filePath)}`,
            }, { quoted: message });
        } catch (saveError) {
            await sock.sendMessage(chatId, {
                text: `❌ Failed to save command: ${saveError?.message || saveError}`,
            }, { quoted: message });
        }
    } catch (error) {
        await sock.sendMessage(chatId, {
            text: `❌ Failed to add custom command: ${error?.message || error}`,
        }, { quoted: message });
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
    completeCodeIfTruncated,
    isCodeLikelyTruncated,
};

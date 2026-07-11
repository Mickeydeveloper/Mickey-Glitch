const fs = require('fs');
const path = require('path');
const vm = require('vm');
const util = require('util');
const { saveCustomCommand } = require('../lib/customCommands');

function resolveCommandPath(commandName) {
    const customPath = path.join(process.cwd(), 'commands', 'custom', `${commandName}.js`);
    const normalPath = path.join(process.cwd(), 'commands', `${commandName}.js`);
    if (fs.existsSync(customPath)) return customPath;
    if (fs.existsSync(normalPath)) return normalPath;
    return null;
}

function loadCommandModule(commandPath) {
    delete require.cache[require.resolve(commandPath)];
    return require(commandPath);
}

function findHandler(commandModule) {
    if (typeof commandModule === 'function') return commandModule;
    if (commandModule && typeof commandModule === 'object') {
        if (typeof commandModule.code === 'function') return commandModule.code;
        if (typeof commandModule.handler === 'function') return commandModule.handler;
        if (typeof commandModule.default === 'function') return commandModule.default;
    }
    return null;
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
        const quotedCode = quotedMessage?.conversation || quotedMessage?.extendedTextMessage?.text || quotedMessage?.imageMessage?.caption || quotedMessage?.videoMessage?.caption || '';

        if (!body && !quotedCode) {
            await sock.sendMessage(chatId, {
                text: '🛠️ Usage:\n• Reply to a code message and send .run\n• Or send .run <javascript code>\n• Or send .run <command_name> [args] to run a command file.'
            }, { quoted: message });
            return;
        }

        // If the user replied to code, execute the quoted message content.
        if (quotedCode) {
            const codeText = quotedCode.toString().trim();
            const args = body ? body.split(/\s+/) : [];
            const runSandbox = {
                sock,
                chatId,
                message,
                args,
                console: {
                    log: (...values) => runSandbox.__logs.push(values.map((v) => util.format(v)).join(' ')),
                    error: (...values) => runSandbox.__logs.push(values.map((v) => util.format(v)).join(' ')),
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
            };
            runSandbox.__logs = [];

            try {
                const script = new vm.Script(codeText, { filename: 'runCommand.js' });
                const context = vm.createContext(runSandbox);
                let result = script.runInContext(context, { timeout: 5000 });
                if (result && typeof result.then === 'function') result = await result;
                if (result === undefined && typeof runSandbox.module?.exports === 'function') {
                    result = await runSandbox.module.exports(sock, chatId, message, args, { senderId });
                }

                const output = result === undefined ? '✅ Code executed successfully.' : `✅ Code executed successfully.\nResult:\n${util.inspect(result, { depth: 2 })}`;
                const logs = runSandbox.__logs.length ? `\n\nLogs:\n${runSandbox.__logs.join('\n')}` : '';
                await sock.sendMessage(chatId, { text: `${output}${logs}` }, { quoted: message });
            } catch (execError) {
                await sock.sendMessage(chatId, { text: `❌ Code execution error:\n${execError?.stack || execError?.message || execError}` }, { quoted: message });
            }
            return;
        }

        // If body starts with an existing command file name, run that command file.
        const parts = body.split(/\s+/);
        const commandName = parts[0];
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
                await handler(sock, chatId, message, args, { senderId, commandName });
                await sock.sendMessage(chatId, { text: `✅ Command .${commandName} ran successfully.` }, { quoted: message });
            } catch (execError) {
                await sock.sendMessage(chatId, { text: `❌ Command .${commandName} failed:\n${execError?.stack || execError?.message || execError}` }, { quoted: message });
            }
            return;
        }

        // Otherwise execute body as inline JavaScript code.
        const codeText = body;
        const args = [];
        const runSandbox = {
            sock,
            chatId,
            message,
            args,
            console: {
                log: (...values) => runSandbox.__logs.push(values.map((v) => util.format(v)).join(' ')),
                error: (...values) => runSandbox.__logs.push(values.map((v) => util.format(v)).join(' ')),
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
        };
        runSandbox.__logs = [];

        try {
            const script = new vm.Script(codeText, { filename: 'runCommand.js' });
            const context = vm.createContext(runSandbox);
            let result = script.runInContext(context, { timeout: 5000 });
            if (result && typeof result.then === 'function') result = await result;
            if (result === undefined && typeof runSandbox.module?.exports === 'function') {
                result = await runSandbox.module.exports(sock, chatId, message, args, { senderId });
            }

            const output = result === undefined ? '✅ Code executed successfully.' : `✅ Code executed successfully.\nResult:\n${util.inspect(result, { depth: 2 })}`;
            const logs = runSandbox.__logs.length ? `\n\nLogs:\n${runSandbox.__logs.join('\n')}` : '';
            await sock.sendMessage(chatId, { text: `${output}${logs}` }, { quoted: message });
        } catch (execError) {
            await sock.sendMessage(chatId, { text: `❌ Code execution error:\n${execError?.stack || execError?.message || execError}` }, { quoted: message });
        }
    } catch (error) {
        console.error('runCommand error:', error);
        await sock.sendMessage(chatId, { text: `❌ Run command failed: ${error?.message || error}` }, { quoted: message });
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
        const match = input.match(/^\.cmdadd\s+([a-z0-9_\-]+)\s*(.*)$/is);
        if (!match) {
            await sock.sendMessage(chatId, {
                text: '🛠️ Usage:\n.cmdadd <command_name> <module_code>\n\nExample:\n.cmdadd button8 module.exports = { ... }'
            }, { quoted: message });
            return;
        }

        const commandName = match[1].trim();
        const sourceCode = (match[2] || '').trim();
        if (!sourceCode) {
            await sock.sendMessage(chatId, { text: '❌ Please provide command source code.' }, { quoted: message });
            return;
        }

        const cleaned = sourceCode
            .replace(/^```(?:js|javascript)?\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();

        if (!cleaned) {
            await sock.sendMessage(chatId, { text: '❌ Command source is empty.' }, { quoted: message });
            return;
        }

        const targetFile = path.join(process.cwd(), 'commands', 'custom', `${commandName}.js`);
        fs.mkdirSync(path.dirname(targetFile), { recursive: true });
        fs.writeFileSync(targetFile, cleaned, 'utf8');
        saveCustomCommand(commandName, cleaned);

        await sock.sendMessage(chatId, {
            text: `✅ Custom command saved as .${commandName}\n\nFile: ${path.relative(process.cwd(), targetFile)}`
        }, { quoted: message });
    } catch (error) {
        console.error('addcmd error:', error);
        await sock.sendMessage(chatId, { text: `❌ Failed to add custom command: ${error?.message || error}` }, { quoted: message });
    }
}

module.exports = {
    cmdaddCommand,
    runCommand,
};

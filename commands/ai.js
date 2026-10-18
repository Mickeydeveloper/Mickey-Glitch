/**
 * ai.js - Mickey AI Assistant (Enhanced Fully Integrated Version)
 * Creator: Mickdadi Hamza (Quantum Code Developer)
 */

const axios = require('axios');

const PRIMARY_API = 'https://engez.a7a.online/api/v1/ai/gpt';
const TIMEOUT = 30000;
const pendingActions = new Map();
const PENDING_ACTION_TTL_MS = 2 * 60 * 1000;
const AI_COMMAND_ALIASES = new Set(['ai', 'gpt', 'gemini', 'chatgpt', 'bot', 'mickey', 'boresha']);

function getCommandCatalogue() {
    const metadata = global.autoRegisteredCommandMeta;
    const commands = new Map();

    if (metadata instanceof Map) {
        for (const [registeredName, item] of metadata.entries()) {
            const primary = String(item?.primary || registeredName).trim().toLowerCase();
            if (!primary || primary.startsWith('_') || AI_COMMAND_ALIASES.has(primary)) continue;

            if (!commands.has(primary)) {
                commands.set(primary, {
                    name: primary,
                    description: String(item?.description || item?.category || 'Bot command').replace(/[\r\n]+/g, ' ').slice(0, 120),
                    aliases: new Set()
                });
            }

            if (registeredName !== primary && !AI_COMMAND_ALIASES.has(String(registeredName).toLowerCase())) {
                commands.get(primary).aliases.add(String(registeredName).toLowerCase());
            }
        }
    }

    return [...commands.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(({ name, description, aliases }) => `.${name}${aliases.size ? ` (aliases: ${[...aliases].join(', ')})` : ''} - ${description}`);
}

function isCommandListRequest(query) {
    return /\b(commands?|features?)\b|orodha\s+(ya\s+)?(commands?|features?)|commands?\s+zote|features?\s+zote/i.test(query);
}

function parseAiPlan(response) {
    const text = String(response || '').trim();
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    for (const candidate of [cleaned, cleaned.match(/\{[\s\S]*\}/)?.[0]]) {
        if (!candidate) continue;
        try {
            const parsed = JSON.parse(candidate);
            if (parsed && (parsed.type === 'answer' || parsed.type === 'command')) return parsed;
        } catch {}
    }

    return { type: 'answer', text };
}

function getPendingActionKey(chatId, senderId) {
    return `${chatId}:${senderId}`;
}

// ─── MAIN EXECUTION FUNCTION ──────────────────────────────────────────
async function aiCommand(sockOrCtx, chatIdParam, msgParam, argsParam) {
    let sock, chatId, msg, args;

    if (sockOrCtx && (sockOrCtx.sock || sockOrCtx.core)) {
        sock = sockOrCtx.sock || sockOrCtx.core;
        chatId = sockOrCtx.chatId || sockOrCtx.msg?.key?.remoteJid;
        msg = sockOrCtx.msg || sockOrCtx.quoted;
        args = sockOrCtx.args || [];
    } else {
        sock = sockOrCtx;
        chatId = chatIdParam;
        msg = msgParam;
        args = argsParam;
    }

    const query = Array.isArray(args) ? args.join(' ') : (args || '');
    const senderId = msg?.key?.participant || msg?.key?.remoteJid;
    const pendingKey = getPendingActionKey(chatId, senderId);
    const respond = async (text) => {
        if (sockOrCtx.reply) return sockOrCtx.reply(text);
        return sock.sendMessage(chatId, { text }, { quoted: msg });
    };

    for (const [key, action] of pendingActions.entries()) {
        if (action.expiresAt <= Date.now()) pendingActions.delete(key);
    }

    const normalizedQuery = query.trim().toLowerCase();
    if (['confirm', 'thibitisha', 'ndio'].includes(normalizedQuery)) {
        const pending = pendingActions.get(pendingKey);
        if (!pending || pending.expiresAt <= Date.now()) {
            pendingActions.delete(pendingKey);
            return respond('Hakuna command inayosubiri uthibitisho. Muulize AI tena kwanza.');
        }

        pendingActions.delete(pendingKey);
        if (typeof global.executeBotCommandFromAI !== 'function') {
            return respond('AI command execution haijaunganishwa na dispatcher ya bot.');
        }

        try {
            await global.executeBotCommandFromAI({ sock, chatId, message: msg, commandText: pending.commandText });
        } catch (error) {
            console.error('[AI] Confirmed command failed:', error?.message || error);
            await respond('Imeshindikana kutekeleza command hiyo. Angalia ruhusa au jaribu tena.');
        }
        return;
    }

    if (['cancel', 'futa', 'ghairi'].includes(normalizedQuery)) {
        const hadPending = pendingActions.delete(pendingKey);
        return respond(hadPending ? 'Sawa, command iliyopendekezwa imeghairiwa.' : 'Hakuna command inayosubiri kughairiwa.');
    }

    if (isCommandListRequest(query)) {
        const commandList = getCommandCatalogue();
        if (!commandList.length) return respond('Sijaweza kupata command registry kwa sasa.');

        for (let index = 0; index < commandList.length; index += 35) {
            const chunk = commandList.slice(index, index + 35);
            await respond(`*Commands za bot (${index + 1}-${index + chunk.length}/${commandList.length})*\n${chunk.join('\n')}`);
        }
        return;
    }

    if (!query.trim()) {
        return respond(
            '*MICKEY AI*\n' +
            'Uliza swali, sema feature unayotaka, au tumia `.ai commands` kuona commands.\n\n' +
            'AI ikipendekeza command: `.ai confirm` kutekeleza au `.ai cancel` kughairi.'
        );
    }

    if (query.length > 5000) return respond('Swali ni refu sana. Tafadhali lifupishe kidogo.');

    if (msg?.key) {
        try {
            await sock.sendMessage(chatId, { react: { text: '🧠', key: msg.key } });
        } catch {}
    }

    try {
        const commandCatalogue = getCommandCatalogue();
        const systemPrompt = `[ROLE]: Wewe ni MICKEY GLITCH V3, genius AI msaidizi uliyetengenezwa na MICKDADI HAMZA (Quantum Code Dev).
[CONTEXT]: Repo yako ipo hapa: https://github.com/Mickeydeveloper/Mickey-Glitch.
[RULES]:
- Ongea kishkaji (Bongo Swahili Slang).
- Jibu kwa ufupi na kwa usahihi, kwa kutumia command catalogue hapa chini.
- Ukihitajika kutekeleza feature ya bot, chagua command moja iliyopo kwenye catalogue; usibuni command.
- Usitoe command ya kubadilisha hali ya bot mpaka user ai-confirm kupitia .ai confirm.
- Usidai kuwa command imetekelezwa kabla ya confirmation.
- Ruhusa za owner/admin/PIN bado zinatekelezwa na bot; usidai kuzizunguka.
- Rudisha JSON moja tu, bila markdown fences. Jibu la kawaida: {"type":"answer","text":"..."}. Command: {"type":"command","command":"command-name","args":"arguments","reason":"sababu fupi"}.

[COMMAND CATALOGUE]:
${commandCatalogue.join('\n')}`;

        const fullQuery = `${systemPrompt}\n\nUser: ${query}\nAnswer:`;

        let finalReply = null;

        try {
            const { data } = await axios.get(PRIMARY_API, {
                params: { q: fullQuery },
                timeout: TIMEOUT
            });

            if (data?.success && data?.response?.success) {
                finalReply = data.response.result?.message || data.response.raw;
            }
        } catch (primaryErr) {
            console.log('⚠️ Primary Engez API failed, switching to backup providers...');
        }

        if (!finalReply) {
            const backupUrls = [
                `https://apiskeith.top/ai/gpt?q=${encodeURIComponent(fullQuery)}`,
                `https://apiskeith.top/ai/copilot?q=${encodeURIComponent(fullQuery)}`,
                `https://apiskeith.top/ai/venice?q=${encodeURIComponent(fullQuery)}`
            ];

            for (const url of backupUrls) {
                try {
                    const res = await axios.get(url, { timeout: 10000 });
                    const tempReply = res.data?.data || res.data?.result || res.data?.response || res.data?.reply;

                    if (tempReply && tempReply.length > 0) {
                        finalReply = tempReply;
                        break;
                    }
                } catch (backupErr) {
                    continue;
                }
            }
        }

        if (finalReply) {
            const plan = parseAiPlan(typeof finalReply === 'string' ? finalReply : JSON.stringify(finalReply));

            if (plan.type === 'command') {
                const requestedName = String(plan.command || '').trim().replace(/^\./, '').toLowerCase();
                const commandMeta = global.autoRegisteredCommandMeta;
                const registeredCommands = global.autoRegisteredCommands;
                const metadata = commandMeta instanceof Map ? commandMeta.get(requestedName) : null;
                const isRegistered = registeredCommands instanceof Map
                    ? registeredCommands.has(requestedName)
                    : !!registeredCommands?.[requestedName];

                if (!/^[a-z0-9_-]{1,32}$/.test(requestedName) || AI_COMMAND_ALIASES.has(requestedName) || !isRegistered) {
                    await respond('AI imechagua command isiyopatikana. Uliza tena ukitaja feature unayotaka.');
                    return;
                }

                const canonicalName = String(metadata?.primary || requestedName).toLowerCase();
                if (AI_COMMAND_ALIASES.has(canonicalName)) {
                    await respond('AI haiwezi kujiita yenyewe kama command. Eleza feature nyingine unayotaka.');
                    return;
                }

                const rawArgs = Array.isArray(plan.args) ? plan.args.map(String).join(' ') : String(plan.args || '').trim();
                if (rawArgs.length > 500 || /[\r\n]/.test(rawArgs)) {
                    await respond('Arguments za command hiyo si salama au ni ndefu sana; jaribu ombi fupi zaidi.');
                    return;
                }

                const commandText = `.${canonicalName}${rawArgs ? ` ${rawArgs}` : ''}`;
                pendingActions.set(pendingKey, {
                    commandText,
                    expiresAt: Date.now() + PENDING_ACTION_TTL_MS
                });

                await respond(
                    `AI inapendekeza: *${commandText}*\n` +
                    `${String(plan.reason || 'Hii ndiyo command inayolingana na ombi lako.').slice(0, 300)}\n\n` +
                    'Thibitisha kwa `.ai confirm` ndani ya dakika 2, au ghairi kwa `.ai cancel`. Command itapitia ruhusa za kawaida za bot.'
                );
                return;
            }

            const answerText = String(plan.text || finalReply).trim();
            await respond(`╭━━━━〔 *MICKEY AI* 〕━━━━┈⊷\n┃\n┃ ${answerText}\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷`);
            if (msg?.key) {
                try {
                    await sock.sendMessage(chatId, { react: { text: '✨', key: msg.key } });
                } catch {}
            }
        } else {
            throw new Error("ALL_APIS_UNAVAILABLE");
        }

    } catch (e) {
        console.error('AI Error:', e?.message || e);
        await respond('❌ AI haipatikani kwa sasa. Jaribu tena baada ya muda mfupi.');
        if (msg?.key) {
            try {
                await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
            } catch {}
        }
    }
}

// ─── EXPORTS (COMMONJS & HANDLER COMPATIBLE) ───────────────────────────
module.exports = {
    name: 'ai',
    aliases: ['gpt', 'chatgpt', 'bot', 'mickey', 'boresha', 'boresha'],
    category: 'ai',
    desc: 'Mickey AI Assistant',
    
    execute: aiCommand,
    run: aiCommand,
    handler: aiCommand,
    aiCommand: aiCommand
};

const crypto = require('crypto');
const { generateMessageIDV2, proto } = require('@whiskeysockets/baileys');

function tokenize(code, language) {
    const normalizedLanguage = language === 'py' ? 'python' : language;
    const keywords = new Set(({
        javascript: 'break case catch class const continue default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while yield async await null true false undefined',
        python: 'import from as def class return if elif else for while break continue try except finally raise with lambda pass del global and or not in is None True False async await self',
    }[normalizedLanguage] || '').split(' '));
    const tokens = [];

    const push = (codeContent, highlightType) => {
        if (!codeContent) return;
        const last = tokens[tokens.length - 1];
        if (last && last.highlightType === highlightType) last.codeContent += codeContent;
        else tokens.push({ codeContent, highlightType });
    };

    let index = 0;
    while (index < code.length) {
        const character = code[index];
        if (/\s/.test(character)) {
            const start = index;
            while (index < code.length && /\s/.test(code[index])) index++;
            push(code.slice(start, index), 0);
            continue;
        }
        if ((character === '/' && code[index + 1] === '/') ||
            (character === '#' && normalizedLanguage === 'python')) {
            const start = index;
            while (index < code.length && code[index] !== '\n') index++;
            push(code.slice(start, index), 5);
            continue;
        }
        if (character === '"' || character === "'" || character === '`') {
            const start = index;
            const quote = character;
            index++;
            while (index < code.length) {
                if (code[index] === '\\') index += 2;
                else if (code[index] === quote) {
                    index++;
                    break;
                } else index++;
            }
            push(code.slice(start, index), 3);
            continue;
        }
        if (/[0-9]/.test(character)) {
            const start = index;
            while (index < code.length && /[0-9]/.test(code[index])) index++;
            push(code.slice(start, index), 4);
            continue;
        }
        if (/[a-zA-Z_$]/.test(character)) {
            const start = index;
            while (index < code.length && /[a-zA-Z0-9_$]/.test(code[index])) index++;
            const word = code.slice(start, index);
            push(word, keywords.has(word) ? 1 : 0);
            continue;
        }
        push(character, 0);
        index++;
    }

    return tokens;
}

function toTableRows(table) {
    const [header, ...rows] = table;
    return {
        rows: [{ items: header.map(String), isHeading: true }, ...rows.map(row => ({ items: row.map(String) }))],
        unified_rows: [
            { items: header.map(String), type: 'HEADER' },
            ...rows.map(row => ({ items: row.map(String), type: 'DEFAULT' })),
        ],
    };
}

function getInput(message, args) {
    const source = message?.message?.conversation ||
        message?.message?.extendedTextMessage?.text ||
        message?.message?.imageMessage?.caption ||
        message?.message?.videoMessage?.caption;
    if (typeof source === 'string' && source.trim()) {
        return source.trim().replace(/^[.!/][^\s]+\s*/, '');
    }
    return Array.isArray(args) ? args.join(' ').trim() : String(args || '').trim();
}

async function test1(sock, chatId, message, args = []) {
    const raw = getInput(message, args);
    if (!raw) {
        await sock.sendMessage(chatId, {
            text: 'Matumizi:\n.test1 <text>\n.test1 code javascript <code>\n.test1 table H1,H2;row1a,row1b;row2a,row2b\n.test1 html <full HTML document>',
        }, { quoted: message });
        return;
    }

    const submessages = [];
    const sections = [];
    let title = 'AI Response';

    if (raw.startsWith('html ')) {
        const html = raw.slice(5).trim().replace(/\\n/g, '\n');
        title = 'HTML App';
        sections.push({
            view_model: {
                primitive: {
                    payload: html,
                    trusted_sources: [],
                    __typename: 'GenAIaeacdsnwHtmlPrimitive',
                },
                __typename: 'GenAISingleLayoutViewModel',
            },
        });
    } else if (raw.startsWith('code ')) {
        const body = raw.slice(5);
        const separator = body.indexOf(' ');
        const language = separator > 0 ? body.slice(0, separator) : 'javascript';
        const code = separator > 0 ? body.slice(separator + 1) : '';
        title = `Code - ${language}`;
        submessages.push({ messageType: 5, messageText: code });
        sections.push({
            view_model: {
                primitive: {
                    language,
                    code_blocks: tokenize(code, language).map(token => ({
                        content: token.codeContent,
                        type: { 0: 'DEFAULT', 1: 'KEYWORD', 2: 'METHOD', 3: 'STR', 4: 'NUMBER', 5: 'COMMENT' }[token.highlightType],
                    })),
                    __typename: 'GenAICodeUXPrimitive',
                },
                __typename: 'GenAISingleLayoutViewModel',
            },
        });
    } else if (raw.startsWith('table ')) {
        const table = raw.slice(6).split(';').map(row => row.split(',').map(cell => cell.trim()));
        if (table.length < 2 || !table[0].some(Boolean)) {
            await sock.sendMessage(chatId, {
                text: 'Jedwali linahitaji header na angalau row moja. Mfano: .test1 table Jina,Hali;Bot,Online',
            }, { quoted: message });
            return;
        }
        const meta = toTableRows(table);
        title = 'Table';
        submessages.push({ messageType: 4, tableMetadata: { rows: meta.rows } });
        sections.push({
            view_model: {
                primitive: { rows: meta.unified_rows, __typename: 'GenATableUXPrimitive' },
                __typename: 'GenAISingleLayoutViewModel',
            },
        });
    } else {
        submessages.push({ messageType: 2, messageText: raw });
        sections.push({
            view_model: {
                primitive: {
                    text: raw,
                    inline_entities: [],
                    __typename: 'GenAIMarkdownTextUXPrimitive',
                },
                __typename: 'GenAISingleLayoutViewModel',
            },
        });
    }

    sections.push({
        view_model: {
            primitives: [
                { prompt_text: 'Nice', prompt_type: 'SUGGESTED_PROMPT', __typename: 'GenAIFollowUpSuggestionPillPrimitive' },
                { prompt_text: 'More info', prompt_type: 'SUGGESTED_PROMPT', __typename: 'GenAIFollowUpSuggestionPillPrimitive' },
            ],
            __typename: 'GenAIActionRowLayoutViewModel',
        },
    });

    const content = {
        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: proto.AIRichResponseMessageType.AI_RICH_RESPONSE_TYPE_STANDARD,
                    submessages,
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify({ response_id: crypto.randomUUID(), sections })),
                    },
                    contextInfo: { forwardingScore: 1, isForwarded: true, forwardOrigin: 4 },
                },
            },
        },
    };

    try {
        await sock.relayMessage(chatId, content, {
            messageId: generateMessageIDV2(sock.user?.id),
        });
    } catch (error) {
        console.error('[TEST1] Failed to send AIRich response:', error?.message || error);
        await sock.sendMessage(chatId, {
            text: `Imeshindikana kutuma AIRich response (${title}). Hakikisha toleo la Baileys linaunga mkono richResponseMessage.`,
        }, { quoted: message });
    }
}

test1.description = 'Tuma Meta AI-style rich response ya text, code, table au HTML.';
test1.category = 'EXPERIMENTAL';

module.exports = test1;
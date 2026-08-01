/**
 * testnodes.js - Test all additional nodes types
 * Usage: .testnodes <type>
 * Types: mixed, payment, catalog, poll, event, review, replyai, all
 */

const { Button, ButtonV2, createCtx } = require('../lib/messageBuilder');
const { randomBytes } = require('crypto');

// ─── ADDITIONAL NODES TYPES ──────────────────────────────────────────────
const NODES = {
    // 1. MIXED - InteractiveMessage (mixed)
    mixed: {
        additionalNodes: [{
            tag: 'biz',
            attrs: {},
            content: [{
                tag: 'interactive',
                attrs: { type: 'native_flow', v: '1' },
                content: [{
                    tag: 'native_flow',
                    attrs: { v: '9', name: 'mixed' }
                }]
            }]
        }]
    },

    // 2. PAYMENT - InteractiveMessage (payment_key_info)
    payment: {
        additionalNodes: [{
            tag: 'biz',
            attrs: {},
            content: [{
                tag: 'interactive',
                attrs: { type: 'native_flow', v: '1' },
                content: [{
                    tag: 'native_flow',
                    attrs: { name: 'payment_key_info' }
                }]
            }]
        }]
    },

    // 3. CATALOG - InteractiveMessage (catalog_message)
    catalog: {
        additionalNodes: [{
            tag: 'biz',
            attrs: { native_flow_name: 'catalog_message' }
        }]
    },

    // 4. POLL - PollCreationMessage
    poll: {
        additionalNodes: [{
            tag: 'meta',
            attrs: { polltype: 'creation' }
        }]
    },

    // 5. EVENT - EventMessage
    event: {
        additionalNodes: [{
            tag: 'meta',
            attrs: { event_type: 'creation' }
        }]
    },

    // 6. REVIEW - InteractiveMessage (Review And Pay)
    review: {
        additionalNodes: [{
            tag: 'biz',
            attrs: { native_flow_name: 'order_details' }
        }]
    },

    // 7. REPLY AI - Reply AI
    replyai: {
        additionalNodes: [
            { tag: 'bot', attrs: { biz_bot: '1' } },
            { tag: 'biz', attrs: {} }
        ]
    }
};

// ─── MAIN TEST COMMAND ────────────────────────────────────────────────────
async function testNodesCommand(sock, chatId, message, args = []) {
    try {
        const ctx = createCtx(sock, chatId, message, { args });
        const type = args[0]?.toLowerCase() || 'all';

        // ─── SHOW HELP ──────────────────────────────────────────────────
        if (type === 'help' || !type) {
            return await ctx.reply(
                `🧪 *Test Nodes Usage*\n\n` +
                `.testnodes <type>\n\n` +
                `📌 *Types:*\n` +
                `• mixed - Interactive mixed\n` +
                `• payment - Payment key info\n` +
                `• catalog - Catalog message\n` +
                `• poll - Poll creation\n` +
                `• event - Event creation\n` +
                `• review - Review & pay\n` +
                `• replyai - Reply AI\n` +
                `• all - Test all\n\n` +
                `Example: .testnodes mixed`
            );
        }

        // ─── TEST SPECIFIC NODE ──────────────────────────────────────────
        if (type === 'all') {
            await testAllNodes(sock, chatId, message);
            return;
        }

        const node = NODES[type];
        if (!node) {
            return await ctx.reply(`❌ Unknown node type: ${type}\n\nUse .testnodes help for list`);
        }

        await testNode(sock, chatId, message, type, node);
        await ctx.reply(`✅ *Tested:* ${type.toUpperCase()}\n\nCheck the message above.`);

    } catch (error) {
        console.error('[TESTNODES ERROR]', error?.message || error);
        const ctx = createCtx(sock, chatId, message);
        await ctx.reply(`❌ Error: ${error.message}`);
    }
}

// ─── TEST SINGLE NODE ──────────────────────────────────────────────────────
async function testNode(sock, chatId, message, type, node) {
    try {
        const button = new Button(sock)
            .setTitle(`🧪 Test: ${type.toUpperCase()}`)
            .setBody(
                `*Testing ${type.toUpperCase()} Node*\n\n` +
                `This message uses additionalNodes:\n` +
                `\`\`\`json\n${JSON.stringify(node, null, 2)}\`\`\``
            )
            .setFooter('⚡ Node Test | Mickey Glitch Sub')
            .addReply('✅ Working', 'test_ok')
            .addReply('🔄 Retry', `.testnodes ${type}`);

        await button.send(chatId, {
            quoted: message,
            additionalNodes: node.additionalNodes,
            fallbackText: `🧪 Test: ${type.toUpperCase()} - Node working!`
        });

    } catch (error) {
        console.error(`[TEST ${type}]`, error.message);
        throw error;
    }
}

// ─── TEST ALL NODES ──────────────────────────────────────────────────────
async function testAllNodes(sock, chatId, message) {
    const ctx = createCtx(sock, chatId, message);
    await ctx.reply('🧪 *Testing all nodes...*\n⏳ Please wait...');

    const results = [];

    for (const [type, node] of Object.entries(NODES)) {
        try {
            await testNode(sock, chatId, message, type, node);
            results.push(`✅ ${type}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            results.push(`❌ ${type}: ${error.message}`);
        }
    }

    await ctx.reply(
        `✅ *All Nodes Tested!*\n\n` +
        results.join('\n') +
        `\n\n⚡ Check the messages above.`
    );
}

// ─── EXPORT ──────────────────────────────────────────────────────────────
module.exports = testNodesCommand;
module.exports.name = 'testnodes';
module.exports.aliases = ['nodes', 'tnodes'];
module.exports.category = 'test';
module.exports.default = testNodesCommand;
module.exports.handler = testNodesCommand;
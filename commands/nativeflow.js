const { ButtonV2 } = require('../lib/messageBuilder');

const nativeFlowCommand = {
  name: 'nativeflow',
  aliases: ['flow', 'orderflow', 'payflow'],
  description: 'Tuma native flow interactive message kwa muundo mbalimbali',
  category: 'utility',

  code: async (ctx) => {
    const { sock, chatId, msg, args, reply } = ctx;
    const flow = String(args[0] || 'mixed').toLowerCase();

    const flowMap = {
      mixed: {
        label: 'Mixed native flow',
        additionalNodes: [
          {
            tag: 'biz',
            attrs: {},
            content: [
              {
                tag: 'interactive',
                attrs: {
                  type: 'native_flow',
                  v: '1',
                },
                content: [
                  {
                    tag: 'native_flow',
                    attrs: {
                      v: '9',
                      name: 'mixed',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      payment: {
        label: 'Payment key info',
        additionalNodes: [
          {
            tag: 'biz',
            attrs: {},
            content: [
              {
                tag: 'interactive',
                attrs: {
                  type: 'native_flow',
                  v: '1',
                },
                content: [
                  {
                    tag: 'native_flow',
                    attrs: {
                      name: 'payment_key_info',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      catalog: {
        label: 'Catalog message',
        additionalNodes: [
          {
            tag: 'biz',
            attrs: {
              native_flow_name: 'catalog_message',
            },
          },
        ],
      },
      reviewpay: {
        label: 'Order details / Review and Pay',
        additionalNodes: [
          {
            tag: 'biz',
            attrs: {
              native_flow_name: 'order_details',
            },
          },
        ],
      },
      order_details: {
        label: 'Order details / Review and Pay',
        additionalNodes: [
          {
            tag: 'biz',
            attrs: {
              native_flow_name: 'order_details',
            },
          },
        ],
      },
      poll: {
        label: 'Poll creation',
        additionalNodes: [
          {
            tag: 'meta',
            attrs: {
              polltype: 'creation',
            },
          },
        ],
      },
      event: {
        label: 'Event creation',
        additionalNodes: [
          {
            tag: 'meta',
            attrs: {
              event_type: 'creation',
            },
          },
        ],
      },
      replyai: {
        label: 'Reply AI',
        additionalNodes: [
          {
            tag: 'bot',
            attrs: {
              biz_bot: '1',
            },
          },
          {
            tag: 'biz',
            attrs: {},
          },
        ],
      },
    };

    const selected = flowMap[flow] || flowMap.mixed;
    const helpText = `✅ Native flow payload: *${selected.label}*\n\n` +
      'Use `.nativeflow <type>` na zifuatazo:\n' +
      '`mixed`, `payment`, `catalog`, `reviewpay`, `poll`, `event`, `replyai`\n\n' +
      'Mfano: `.nativeflow payment`';

    const builder = new ButtonV2(sock)
      .setBody(`📌 ${selected.label}`)
      .setFooter('Mickey Glitch Native Flow Demo')
      .addRawButton({
        buttonText: { displayText: '✅ Endelea' },
        buttonId: '.menu',
        type: 1,
      })
      .addRawButton({
        buttonText: { displayText: '❌ Funga' },
        buttonId: '.alive',
        type: 1,
      });

    try {
      const builtMessage = await builder.build(chatId, { quoted: msg });
      await sock.relayMessage(builtMessage.key.remoteJid, builtMessage.message, {
        messageId: builtMessage.key.id,
        additionalNodes: selected.additionalNodes,
      });
      return;
    } catch (error) {
      console.error('nativeflow command error:', error);
      await reply(helpText);
    }
  },
};

module.exports = nativeFlowCommand;

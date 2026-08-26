const { AIRich } = require('../lib/messageBuilder');

const richCommand = async (sock, chatId, msg, args) => {
  const text = args && args.length ? args.join(' ') : 'Shiroko is my bini:';
  const body =
    `${text}\n` +
    `- Model 1: {{NIXEL_0}} NIXCODE {{/NIXEL_0}}\n` +
    `- Model 2: {{NIXEL_1}} NIXCODE {{/NIXEL_1}}`;

  const responseId = `rich-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const submessages = [
    {
      messageType: 2,
      messageText: body,
    },
  ];

  const unified = {
    response_id: responseId,
    sections: [
      {
        view_model: {
          primitive: {
            text: body,
            inline_entities: [
              {
                key: 'NIXEL_0',
                metadata: {
                  latex_expression: '\\text{ }', // Force text rendering mode
                  latex_image: {
                    url: 'https://cdn.ornzora.eu.cc/1ca0f9a4-a81f-498e-92e8-8a4c76abf1ef-FIORA.png',
                    width: 1279,
                    height: 825,
                  },
                  font_height: 100,
                  padding: 0, // Ondoa padding inayotengeneza vipeo vyeusi
                  __typename: 'GenAILatexItem',
                },
              },
              {
                key: 'NIXEL_1',
                metadata: {
                  latex_expression: '\\text{ }',
                  latex_image: {
                    url: 'https://cdn.ornzora.eu.cc/a3a756f2-6bb8-4814-a024-c325524a2308-FIORA.png',
                    width: 1429,
                    height: 1897,
                  },
                  font_height: 100,
                  padding: 0,
                  __typename: 'GenAILatexItem',
                },
              },
            ],
            __typename: 'GenAIMarkdownTextUXPrimitive',
          },
          __typename: 'GenAISingleLayoutViewModel',
        },
      },
    ],
  };

  try {
    const rich = new AIRich(sock)
      .setTitle('MICKEY RICH')
      .setContextInfo({
        forwardingScore: 1,
        isForwarded: true,
        forwardedAiBotMessageInfo: { botJid: '0@bot' },
        forwardOrigin: 4,
      })
      .addSection(unified.sections)
      .addSubmessage(submessages);

    await rich.send(chatId, {
      quoted: msg,
      forwarded: true,
      notification: false,
      bypassDownload: true,
    });
  } catch (error) {
    console.error('richCommand error:', error?.message || error);
    await sock.sendMessage(chatId, { text: '❌ Jambo limekosea kutuma rich message.' }, { quoted: msg });
  }
};

module.exports = richCommand;

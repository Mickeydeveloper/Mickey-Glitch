const galaxyCommand = async (sock, chatId, msg, args) => {
  const title = args && args.length ? args.join(' ') : '7eppsynC';

  const content = {
    interactiveResponseMessage: {
      body: {
        text: '\0',
        format: 1,
      },
      nativeFlowResponseMessage: {
        name: 'galaxy_message',
        paramsJson: JSON.stringify({
          wa_flow_response_params: {
            title,
          },
        }),
        version: 3,
      },
    },
  };

  try {
    await sock.relayMessage(chatId, content, {});
  } catch (error) {
    console.error('galaxyCommand error:', error?.message || error);
    await sock.sendMessage(chatId, { text: '❌ Error sending galaxy message.' }, { quoted: msg });
  }
};

module.exports = galaxyCommand;

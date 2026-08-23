const axios = require('axios');

const IQC_API = 'https://api.nexray.eu.cc/maker/v1/iqc';

function getQuotedText(message) {
    const quoted = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    return quoted?.conversation?.trim() ||
        quoted?.extendedTextMessage?.text?.trim() ||
        quoted?.imageMessage?.caption?.trim() ||
        quoted?.videoMessage?.caption?.trim() ||
        '';
}

function getCurrentTime() {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: process.env.BOT_TIMEZONE || 'Africa/Dar_es_Salaam',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(new Date());
}

module.exports = {
    name: 'iphonequotedchat',
    aliases: ['iqc', 'iphonequote', 'iosquote'],
    category: 'maker',
    description: 'Generate an iPhone quoted chat image.',
    code: async (ctx) => {
        const typedText = Array.isArray(ctx.args) ? ctx.args.join(' ').trim() : '';
        const input = typedText || getQuotedText(ctx.msg);

        if (!input) {
            await ctx.reply('Tuma text baada ya command au reply message, mfano: .iqc Hello from Mickey');
            return;
        }

        if (input.length > 1000) {
            await ctx.reply('❌ Maximum ni characters 1000.');
            return;
        }

        try {
            const response = await axios.get(IQC_API, {
                params: {
                    text: input,
                    provider: 'AXIS',
                    jam: getCurrentTime(),
                    baterai: Math.floor(Math.random() * 100) + 1,
                },
                responseType: 'arraybuffer',
                timeout: 60000,
                validateStatus: (status) => status >= 200 && status < 300,
            });

            const image = Buffer.from(response.data);
            if (!image.length) throw new Error('API imerudisha image tupu');

            await ctx.reply({ image });
        } catch (error) {
            console.error('iPhone quoted chat error:', error?.message || error);
            await ctx.reply('❌ Imeshindwa kutengeneza iPhone quote. Jaribu tena baadaye.');
        }
    },
};
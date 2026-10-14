const DEFAULT_AMOUNT = 19000000;
const BENEFICIARY = 'Aevendria VRA';
const IDENTIFIER = '08888';
const BANKS = ['SeaBank', 'Bank Jago', 'Bank Central Asia', 'Bank Mandiri'];
const WALLETS = ['DANA', 'GoPay', 'OVO'];

function formatPaymentDetails(amount) {
    const formattedAmount = amount.toLocaleString('en-US');
    const bankLines = BANKS.map((bank) => `- ${bank}: ${IDENTIFIER}`).join('\n');
    const walletLines = WALLETS.map((wallet) => `- ${wallet}: ${IDENTIFIER}`).join('\n');

    return [
        '*ESPADA*',
        '',
        `Payment details for ${BENEFICIARY}`,
        `Amount: IDR ${formattedAmount}`,
        '',
        '*Bank transfers*',
        bankLines,
        '',
        '*Digital wallets*',
        walletLines,
        '',
        `Beneficiary: ${BENEFICIARY}`
    ].join('\n');
}

module.exports = {
    name: 'payment',
    aliases: ['pay'],
    description: 'Show bank and digital wallet payment details',
    category: 'UTILITY',
    code: async (ctx) => {
        const { chatId, args = [], reply } = ctx || {};
        if (!chatId || typeof reply !== 'function') {
            throw new Error('Payment command context is incomplete.');
        }

        const textMode = String(args[0] || '').toLowerCase() === 'text';
        const rawAmount = String(args[textMode ? 1 : 0] ?? '').trim();
        const amount = rawAmount ? Number(rawAmount) : DEFAULT_AMOUNT;

        if (!Number.isSafeInteger(amount) || amount <= 0) {
            return reply('Kiasi si sahihi. Tumia: .payment [kiasi cha IDR] au .payment text [kiasi cha IDR].');
        }

        return reply(formatPaymentDetails(amount));
    }
};

const { createCtx } = require('../lib/messageBuilder');

async function halotelCommand(sock, chatId, message, args) {
    const ctx = createCtx(sock, chatId, message, { args });

    try {
        const ownerNumber = "255615944741";
        const waLink = `https://wa.me/${ownerNumber}`;

        const productList = [
            {
                title: "Halotel Internet Bundles 🌐",
                brand: "Mickey Glitch Engine",
                price: "TSH 10,000.00",
                sale_price: "TSH 50,000.00"
            },
            {
                title: "Halo Kasi 10GB (Siku 1)",
                brand: "Halotel Internet",
                price: "TSH 10,500",
                sale_price: "TSH 10,000"
            },
            {
                title: "Halo Kasi 20GB (Siku 3)",
                brand: "Halotel Internet",
                price: "TSH 21,000",
                sale_price: "TSH 20,000"
            },
            {
                title: "Halo Kasi 25GB (Wiki 1)",
                brand: "Halotel Internet",
                price: "TSH 26,000",
                sale_price: "TSH 25,000"
            },
            {
                title: "Halo Kasi 30GB (Mwezi 1)",
                brand: "Halotel Internet",
                price: "TSH 31,000",
                sale_price: "TSH 30,000"
            },
            {
                title: "Halo Kasi Unlimited (Mwezi 1)",
                brand: "Halotel Internet",
                price: "TSH 7=,000",
                sale_price: "TSH 75,000"
            }
        ];

        const listText = productList
            .map((p, i) => {
                const harga = p.sale_price
                    ? `~${p.price}~ ➜ *${p.sale_price}*`
                    : `*${p.price}*`;
                return `${i + 1}. *${p.title}* (${p.brand})\n   ${harga}`;
            })
            .join("\n\n");

        const text = `📶 *Halotel Data Menu*\n\n` +
            `\`Halotel Bundle Catalog\` 🛍️\n\n` +
            `${listText}\n\n` +
            `Je, unahitaji kujiunga na kifurushi chochote hapo juu?\n` +
            `Tuma namba ya kifurushi au wasiliana nasi: ${waLink}`;

        await sock.sendMessage(ctx.chatId, { text }, { quoted: ctx._msg });

    } catch (error) {
        console.error("Halotel Command Error:", error);
        ctx.reply(`❌ Error: ${error.message}`);
    }
}

// Keep compatibility with both direct imports and destructured imports
const getPendingRequest = () => null;

module.exports = halotelCommand;
module.exports.halotelCommand = halotelCommand;
module.exports.getPendingRequest = getPendingRequest;
module.exports.default = halotelCommand;

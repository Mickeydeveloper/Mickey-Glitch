const { AIRich, createCtx } = require('../lib/messageBuilder');

async function halotelCommand(sock, chatId, message, args) {
    // Tunatengeneza ctx hapa ndani ili kodi ya AIRich isiharibike
    const ctx = createCtx(sock, chatId, message, { args });
    
    try {
        const ownerNumber = "255719632816";
        const waLink = `https://wa.me/${ownerNumber}`;

        // Orodha ya Vifurushi vya Halotel (Products)
        const productList = [
            {
                title:      "Halotel Internet Bundles 🌐",
                brand:      "Mickey Glitch Engine",
                price:      "TSH 10,000.00",
                sale_price: "TSH 50,000.00",
                image:      "https://x.xcute.workers.dev/f/images/399f8732721b.jpg"
            },
            {
                title:      "Halo Kasi 1GB (Siku 1)",
                brand:      "Halotel Internet",
                price:      "TSH 1,500",
                sale_price: "TSH 1,000",
                image:      "https://x.xcute.workers.dev/f/images/b8066826a651.jpg"
            },
            {
                title:      "Halo Kasi 2.5GB (Siku 3)",
                brand:      "Halotel Internet",
                price:      "TSH 3,000",
                sale_price: "TSH 2,500",
                image:      "https://x.xcute.workers.dev/f/images/569c736b8940.jpg"
            },
            {
                title:      "Halo Kasi 5GB (Wiki 1)",
                brand:      "Halotel Internet",
                price:      "TSH 6,000",
                sale_price: "TSH 5,000",
                image:      "https://x.xcute.workers.dev/f/images/569c736b8940.jpg"
            },
            {
                title:      "Halo Kasi 12GB (Mwezi 1)",
                brand:      "Halotel Internet",
                price:      "TSH 15,000",
                sale_price: "TSH 13,000",
                image:      "https://x.xcute.workers.dev/f/images/738d07bc5e5b.jpg"
            },
            {
                title:      "Halo Kasi Unlimited (Mwezi 1)",
                brand:      "Halotel Internet",
                price:      "TSH 55,000",
                sale_price: "TSH 50,000",
                image:      "https://x.xcute.workers.dev/f/images/7d90efab1187.jpg"
            }
        ];

        const top  = productList[0];
        const rest = productList.slice(1);

        const listText = productList
            .map((p, i) => {
                const harga = p.sale_price
                    ? `~${p.price}~ ➜ *${p.sale_price}*`
                    : `*${p.price}*`;
                return `${i + 1}. *${p.title}* (${p.brand})\n   ${harga}`;
            })
            .join("\n\n");

        // Kuunda na kutuma Ujumbe wa AIRich
        await new AIRich(sock)
            .setTitle("📶 Halotel Data Menu")
            .setFooter("MICKEY BOT")
            .addText("`Halotel Bundle Catalog` 🛍️")

            .addProduct({
                title:      top.title,
                brand:      top.brand,
                price:      top.price,
                sale_price: top.sale_price,
                url:        waLink,
                image:      top.image,
                icon:       top.image
            })

            .addProduct(rest.map(p => ({
                title:      p.title,
                brand:      p.brand,
                price:      p.price,
                sale_price: p.sale_price,
                url:        waLink,
                image:      p.image,
                icon:       p.image
            })))

            .addText(
                `\`Available Bundles\` 📦\n\n` +
                `${listText}\n\n` +
                `Je, unahitaji kujiunga na kifurushi chochote hapo juu? Bofya\n` +
                `button ya bidhaa husika au wasiliana nasi moja kwa moja.`
            )

            .addTip("_Regards: © Mickey // Glitch Engine_")

            .addSuggest([
                `Chagua Kifurushi`,
                `.menu`,
                `.owner`
            ])

            .send(ctx.chatId, { quoted: ctx._msg });

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

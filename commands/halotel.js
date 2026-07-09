const { AIRich, createCtx } = require('../lib/messageBuilder');

async function halotelCommand(sock, chatId, message, args) {
    // Tunatengeneza ctx hapa ndani ili kodi ya AIRich isiharibike
    const ctx = createCtx(sock, chatId, message, { args });
    
    try {
        const ownerNumber = "255615944741";
        const waLink = `https://wa.me/${ownerNumber}`;

        // Orodha ya Vifurushi vya Halotel (Products)
        const productList = [
            {
                title:      "Halotel Internet Bundles 🌐",
                brand:      "Mickey Glitch Engine",
                price:      "TSH 10,000.00",
                sale_price: "TSH 50,000.00",
                image:      "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/halotel.jpg"
            },
            {
                title:      "Halo Kasi 10GB (Siku 1)",
                brand:      "Halotel Internet",
                price:      "TSH 10,500",
                sale_price: "TSH 10,000",
                image:      "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/halotel.jpg"
            },
            {
                title:      "Halo Kasi 20GB (Siku 3)",
                brand:      "Halotel Internet",
                price:      "TSH 21,000",
                sale_price: "TSH 20,000",
                image:      "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/halotel.jpg"
            },
            {
                title:      "Halo Kasi 25GB (Wiki 1)",
                brand:      "Halotel Internet",
                price:      "TSH 26,000",
                sale_price: "TSH 25,000",
                image:      "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/halotel.jpg"
            },
            {
                title:      "Halo Kasi 30GB (Mwezi 1)",
                brand:      "Halotel Internet",
                price:      "TSH 31,000",
                sale_price: "TSH 30,000",
                image:      "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/halotel.jpg"
            },
            {
                title:      "Halo Kasi Unlimited (Mwezi 1)",
                brand:      "Halotel Internet",
                price:      "TSH 7=,000",
                sale_price: "TSH 75,000",
                image:      "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/halotel.jpg"
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
            .setFooter("Mickey Glitch")
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

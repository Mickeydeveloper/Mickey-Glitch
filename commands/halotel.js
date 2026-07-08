const { AIRich } = require('../lib/messageBuilder');

module.exports = {
    name: "halotel",
    aliases: ["halochat", "bando_halotel", "halo"],
    category: "information",
    code: async (ctx) => {
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
                    image:      "https://x.xcute.workers.dev/f/images/399f8732721b.jpg" // Unaweza kubadili picha hizi baadae
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

            // Card ya kwanza inakuwa kama Header, zinazobaki zinaingia kwenye HScroll (Carousel)
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

            // Kuanza kujenga Ujumbe wa AI Rich Product Catalog
            await new AIRich(ctx.core)
                .setTitle("📶 Halotel Data Menu")
                .setFooter("MICKEY BOT")
                .addText("`Halotel Bundle Catalog` 🛍️")

                // Main Header Product Card
                .addProduct({
                    title:      top.title,
                    brand:      top.brand,
                    price:      top.price,
                    sale_price: top.sale_price,
                    url:        waLink,
                    image:      top.image,
                    icon:       top.image
                })

                // Kadi za kutelezesha (HScroll) za vifurushi vilivyobaki
                .addProduct(rest.map(p => ({
                    title:      p.title,
                    brand:      p.brand,
                    price:      p.price,
                    sale_price: p.sale_price,
                    url:        waLink,
                    image:      p.image,
                    icon:       p.image
                })))

                // Orodha nzima ya maandishi chini ya kadi
                .addText(
                    `\`Available Bundles\` 📦\n\n` +
                    `${listText}\n\n` +
                    `Je, unahitaji kujiunga na kifurushi chochote hapo juu? Bofya\n` +
                    `button ya bidhaa husika au wasiliana nasi moja kwa moja.`
                )

                .addTip("_Regards: © Mickey // Glitch Engine_")

                // Mapendekezo ya haraka chini (Pills/Suggestions)
                .addSuggest([
                    `Chagua Kifurushi`,
                    `${ctx.used?.prefix || '.'}menu`,
                    `${ctx.used?.prefix || '.'}owner`
                ])

                .send(ctx._msg.key.remoteJid, { quoted: ctx._msg });

        } catch (error) {
            console.error("Halotel Command Error:", error);
            if (global.tools?.cmd?.handleError) {
                await global.tools.cmd.handleError(ctx, error);
            } else {
                await ctx.reply(`❌ Error: ${error.message}`);
            }
        }
    }
};

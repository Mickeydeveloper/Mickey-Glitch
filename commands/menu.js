=> conn.relayMessage(
  m.chat,
  {
    interactiveMessage: {
      footer: {
        text: "© Shiroko Fork"
      },
      nativeFlowMessage: {
        buttons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              "title": "📂 PILIH KATEGORI",
              "sections": [
                {
                  "title": "✧ Journey Commands ✧",
                  "highlight_label": "Shiroko Fork",
                  "rows": [
                    {
                      "header": "",
                      "title": "🧭 Buka General",
                      "description": "Terdapat 5 perintah",
                      "id": ".menu general"
                    },
                    {
                      "header": "",
                      "title": "👑 Buka Owner",
                      "description": "Terdapat 44 perintah",
                      "id": ".menu owner"
                    },
                    {
                      "header": "",
                      "title": "🤖 Buka Ai",
                      "description": "Terdapat 4 perintah",
                      "id": ".menu ai"
                    },
                    {
                      "header": "",
                      "title": "🧩 Buka Bluearchive",
                      "description": "Terdapat 2 perintah",
                      "id": ".menu bluearchive"
                    },
                    {
                      "header": "",
                      "title": "🧩 Buka Canvas",
                      "description": "Terdapat 4 perintah",
                      "id": ".menu canvas"
                    },
                    {
                      "header": "",
                      "title": "📥 Buka Download",
                      "description": "Terdapat 6 perintah",
                      "id": ".menu download"
                    },
                    {
                      "header": "",
                      "title": "🎮 Buka Game",
                      "description": "Terdapat 25 perintah",
                      "id": ".menu game"
                    },
                    {
                      "header": "",
                      "title": "👥 Buka Group",
                      "description": "Terdapat 31 perintah",
                      "id": ".menu group"
                    },
                    {
                      "header": "",
                      "title": "🧩 Buka Handler",
                      "description": "Terdapat 1 perintah",
                      "id": ".menu handler"
                    },
                    {
                      "header": "",
                      "title": "🧩 Buka Menupanel",
                      "description": "Terdapat 2 perintah",
                      "id": ".menu menupanel"
                    },
                    {
                      "header": "",
                      "title": "🔞 Buka Nsfw",
                      "description": "Terdapat 1 perintah",
                      "id": ".menu nsfw"
                    },
                    {
                      "header": "",
                      "title": "⚔️ Buka Rpg",
                      "description": "Terdapat 12 perintah",
                      "id": ".menu rpg"
                    },
                    {
                      "header": "",
                      "title": "🔍 Buka Search",
                      "description": "Terdapat 8 perintah",
                      "id": ".menu search"
                    },
                    {
                      "header": "",
                      "title": "🏷️ Buka Sticker",
                      "description": "Terdapat 6 perintah",
                      "id": ".menu sticker"
                    },
                    {
                      "header": "",
                      "title": "🛠️ Buka Tools",
                      "description": "Terdapat 9 perintah",
                      "id": ".menu tools"
                    }
                  ]
                }
              ]
            })
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              "display_text": "👑 OWNER",
              "id": ".owner"
            })
          }
        ],
        messageParamsJson: "{}"
      },
      bloksWidget: {
        uuid: "766dfced-36ce-4feb-b5fc-b4a6ef3c04c9",
        data: "{\"version\":\"v0.9\",\"createSurface\":{\"surfaceId\":\"menu-widget=dd55e2aa-5105-42ee-9fbd-224a9034b7c5\",\"catalogId\":\"https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json\",\"components\":[{\"id\":\"root\",\"component\":\"Column\",\"children\":[\"header_title\",\"header_image\",\"user_card\",\"server_card\",\"menu_guide_card\",\"main_footer_info\"]},{\"id\":\"header_title\",\"component\":\"Text\",\"text\":\"✦ Shiroko Fork — Dashboard ✦\",\"variant\":\"h1\"},{\"id\":\"header_image\",\"component\":\"Image\",\"url\":\"https://files.catbox.moe/lnptmh.jpg\",\"variant\":\"header\",\"fit\":\"cover\"},{\"id\":\"user_card\",\"component\":\"Card\",\"child\":\"user_card_column\"},{\"id\":\"user_card_column\",\"component\":\"Column\",\"children\":[\"user_card_header\",\"user_card_body\",\"user_card_caption\"]},{\"id\":\"user_card_header\",\"component\":\"Text\",\"text\":\"👤 Informasi Pengguna\",\"variant\":\"h2\"},{\"id\":\"user_card_body\",\"component\":\"Text\",\"text\":\"• User: @6283140783763\\n• Role: Creator\\n• Lvl: 1253 (74%)\\n• Coin: 💰 1.0009092929292828e+32M\",\"variant\":\"body\"},{\"id\":\"user_card_caption\",\"component\":\"Text\",\"text\":\"Selamat datang kembali di Shiroko Fork.\",\"variant\":\"caption\"},{\"id\":\"server_card\",\"component\":\"Card\",\"child\":\"server_card_column\"},{\"id\":\"server_card_column\",\"component\":\"Column\",\"children\":[\"server_card_header\",\"server_card_body\"]},{\"id\":\"server_card_header\",\"component\":\"Text\",\"text\":\"⚡ Statistik Bot\",\"variant\":\"h2\"},{\"id\":\"server_card_body\",\"component\":\"Text\",\"text\":\"• Uptime: 0d 7h 38m\\n• Command: 160 Fitur\\n• Status: Online\",\"variant\":\"body\"},{\"id\":\"menu_guide_card\",\"component\":\"Card\",\"child\":\"menu_guide_column\"},{\"id\":\"menu_guide_column\",\"component\":\"Column\",\"children\":[\"menu_guide_header\",\"menu_guide_body\"]},{\"id\":\"menu_guide_header\",\"component\":\"Text\",\"text\":\"📖 Panduan\",\"variant\":\"h3\"},{\"id\":\"menu_guide_body\",\"component\":\"Text\",\"text\":\"Tekan tombol '📂 PILIH KATEGORI' di bawah untuk mengeksplor fitur.\",\"variant\":\"body\"},{\"id\":\"main_footer_info\",\"component\":\"Text\",\"text\":\"Ketik .menu all untuk menampilkan semua command.\",\"variant\":\"caption\"}]}}",
        type: "im_a2ui"
      },
      contextInfo: {
        mentionedJid: [
          "6283140783763@s.whatsapp.net"
        ]
      }
    }
  },
  {
    additionalNodes: [
      {
        tag: "biz",
        attrs: {
          actual_actors: "2",
          host_storage: "2",
          privacy_mode_ts: "1710967811"
        },
        content: [
          {
            tag: "engagement",
            attrs: {
              customer_service_state: "open",
              conversation_state: "open"
            }
          },
          {
            tag: "interactive",
            attrs: {
              type: "native_flow",
              v: "1"
            },
            content: [
              {
                tag: "native_flow",
                attrs: {
                  v: "9",
                  name: "mixed"
                }
              }
            ]
          }
        ]
      }
    ]
  }
)
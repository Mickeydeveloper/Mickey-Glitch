const moment = require("moment-timezone");
const axios = require("axios");

/**
 * Pterodactyl Panel & Server Creator
 * Inasoma config moja kwa moja kutoka global variables za config.js
 */
async function createPanel(ctx, { memo, cpu, disk }) {
  const text = ctx.text || "";
  const t = text.split("-");

  // -----------------------------------------------------------------
  // 1. DETERMINE TARGET USER & USERNAME
  // -----------------------------------------------------------------
  let username = "";
  let targetJid = null;

  // Ukireply message ya mtumiaji
  if (ctx.quoted) {
    targetJid = ctx.quoted.sender;
    username = t[0] ? t[0].trim().toLowerCase() : "";
  } else if (t.length >= 2) {
    username = t[0].trim().toLowerCase();
    targetJid = t[1].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  } else if (ctx.mentionedJid && ctx.mentionedJid.length > 0) {
    username = t[0].trim().toLowerCase();
    targetJid = ctx.mentionedJid[0];
  } else if (t[0] && t[0].trim().length > 0) {
    username = t[0].trim().toLowerCase();
    targetJid = ctx.sender || ctx._msg?.key?.participant || ctx._msg?.key?.remoteJid;
  }

  if (!username) {
    return await ctx.reply(
      `❌ *Muundo Sio Sahihi!*\n\n` +
      `1️⃣ *Ku-reply mtu:* Reply ujumbe wake kisha andika:\n` +
      `   \`${ctx.used?.prefix || "."}${ctx.used?.command || "buy"} username\`\n\n` +
      `2️⃣ *Kwa namba:* Andika:\n` +
      `   \`${ctx.used?.prefix || "."}${ctx.used?.command || "buy"} username-255712345678\``
    );
  }

  if (!targetJid) {
    return await ctx.reply("❌ Impeshindwa kupata namba ya mtumiaji. Tafadhali reply ujumbe wake au weka namba.");
  }

  // Soma configuration kutoka global.PTERODACTYL au global variables
  const domain = global.PTERODACTYL?.domain || global.domain;
  const plta = global.PTERODACTYL?.apiKey || global.plta;
  const eggs = global.PTERODACTYL?.eggId || global.eggs || "5";
  const locc = global.PTERODACTYL?.locationId || global.locc || "1";
  const nestId = global.PTERODACTYL?.nestId || global.nestId || "1";
  const timezone = global.PTERODACTYL?.timezone || global.TIMEZONE || "Africa/Nairobi";

  const email = `${username}@gmail.com`;
  const deskripsi = moment().tz(timezone).format("dddd, D MMMM - YYYY");
  const password = "@datManj@9";

  // -----------------------------------------------------------------
  // 2. CREATE USER KWENYE PTERODACTYL
  // -----------------------------------------------------------------
  let user;
  try {
    const resUser = await axios.post(
      `${domain}/api/application/users`,
      {
        email,
        username,
        first_name: username,
        last_name: username,
        language: "en",
        password: String(password)
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${plta}`
        },
        timeout: 10000
      }
    );

    const data = resUser.data;
    if (data.errors) {
      const errMsg = data.errors.map((e) => e.detail || JSON.stringify(e)).join("\n");
      return await ctx.reply(`❌ *User Creation Failed*\n\n\`\`\`\n${errMsg}\n\`\`\``);
    }
    user = data.attributes;
  } catch (error) {
    console.error("[createPanel] User creation error:", error.response?.data || error.message);
    const status = error.response?.status || "N/A";
    const detail = error.response?.data?.errors?.[0]?.detail || error.message || "Unknown error";
    return await ctx.reply(`❌ *User Creation Error*\n\nStatus: ${status}\nDetail: ${detail}`);
  }

  // -----------------------------------------------------------------
  // 3. FETCH EGG STARTUP COMMAND
  // -----------------------------------------------------------------
  let eggData;
  try {
    const eggRes = await axios.get(
      `${domain}/api/application/nests/${nestId}/eggs/${eggs}`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${plta}`
        },
        timeout: 10000
      }
    );
    eggData = eggRes.data.attributes;
  } catch (error) {
    console.error("[createPanel] Egg fetch error:", error.response?.data || error.message);
    const status = error.response?.status || "N/A";
    const detail = error.response?.data?.errors?.[0]?.detail || error.message || "Unknown error";
    return await ctx.reply(`❌ *Egg Fetch Error*\n\nStatus: ${status}\nDetail: ${detail}`);
  }

  await ctx.reply("⏳ *Inatengeneza Server na kutuma taarifa kwa mlengwa...*");
  const startupCmd = eggData.startup;

  // -----------------------------------------------------------------
  // 4. TUMA PANEL CREDENTIALS KWA MLENGWA (REPLIED USER)
  // -----------------------------------------------------------------
  const rThumbnail = "https://files.catbox.moe/54sbu9.png";
  const panelBody = 
    `🚀 *PTERODACTYL PANEL DATA*\n\n` +
    `👤 *Username:* ${user.username}\n` +
    `🔑 *Password:* ${password}\n` +
    `🌐 *Server URL:* ${domain}\n\n` +
    `_Hifadhi taarifa hizi kwa usalama na usimpe mtu yeyote._`;

  try {
    await new Button(ctx.core)
      .setTitle("Panel Credentials")
      .setBody(panelBody)
      .setImage(rThumbnail)
      .setFooter("© MICKEY GLITCH TECH")
      .addCopy("📋 Copy Username", user.username)
      .addCopy("🔑 Copy Password", String(password))
      .addUrl("🌐 Open Panel", domain, false)
      .send(targetJid, { quoted: null });
  } catch (error) {
    console.error("[createPanel] Button send error, sending text:", error.message);
    await ctx.core.sendMessage(targetJid, { text: panelBody });
  }

  // -----------------------------------------------------------------
  // 5. CREATE SERVER KWENYE PTERODACTYL
  // -----------------------------------------------------------------
  let server;
  try {
    const resServer = await axios.post(
      `${domain}/api/application/servers`,
      {
        name: username,
        description: deskripsi,
        user: user.id,
        egg: parseInt(eggs),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: startupCmd,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
          JS_FILE: "index.js",
          MAIN_FILE: "index.js"
        },
        limits: {
          memory: memo || 1024,
          swap: 0,
          disk: disk || 5120,
          io: 500,
          cpu: cpu || 100
        },
        feature_limits: {
          databases: 0,
          backups: 0,
          allocations: 0
        },
        deploy: {
          locations: [parseInt(locc)],
          dedicated_ip: false,
          port_range: []
        }
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${plta}`
        },
        timeout: 15000
      }
    );

    const res = resServer.data;
    if (res.errors) {
      const errMsg = res.errors.map((e) => e.detail || JSON.stringify(e)).join("\n");
      return await ctx.reply(`❌ *Server Creation Failed*\n\n\`\`\`\n${errMsg}\n\`\`\``);
    }
    server = res.attributes;
  } catch (error) {
    console.error("[createPanel] Server creation error:", error.response?.data || error.message);
    const status = error.response?.status || "N/A";
    const detail = error.response?.data?.errors?.[0]?.detail || error.message || "Unknown error";
    return await ctx.reply(`❌ *Server Creation Error*\n\nStatus: ${status}\nDetail: ${detail}`);
  }

  // -----------------------------------------------------------------
  // 6. TUMA CONFIRMATION CARD (PING2 NATIVE FLOW)
  // -----------------------------------------------------------------
  const ownerNumber = "255777580820";
  const phoneFormatted = ownerNumber.replace(/[^0-9]/g, "");
  const groupLink = "https://chat.whatsapp.com";
  const footerText = "© MICKEY GLITCH TECH";

  const bookingDescription =
    `🚀 *Server Created Successfully!*\n\n` +
    `› User ID: ${user.id}\n` +
    `› Server ID: ${server.id}\n` +
    `› RAM: ${memo || 1024} MB\n` +
    `› Disk: ${disk || 5120} MB\n` +
    `› CPU: ${cpu || 100}%\n\n` +
    `_Taarifa za login zimetumwa kwa mtumiaji._`;

  const outerBody =
    `🚀 *Server Created!*\n\n` +
    `› Name: ${username}\n` +
    `› RAM: ${memo || 1024} MB\n` +
    `› Disk: ${disk || 5120} MB\n` +
    `› CPU: ${cpu || 100}%\n\n` +
    `_Credentials zimetumwa kwa mlengwa._`;

  await ctx.core.relayMessage(
    ctx._msg.key.remoteJid,
    {
      messageContextInfo: {
        threadId: [],
        deviceListMetadata: { senderKeyIndexes: [], recipientKeyIndexes: [] },
        deviceListMetadataVersion: 2
      },
      interactiveMessage: {
        header: { title: "Server Created", hasMediaAttachment: false },
        body: { text: outerBody },
        footer: { text: footerText },
        nativeFlowMessage: {
          buttons: [
            {
              name: "booking_confirmation",
              buttonParamsJson: JSON.stringify({
                start_datetime: new Date().toISOString(),
                end_datetime: new Date(Date.now() + 600000).toISOString(),
                location: "Pterodactyl Panel",
                booking_url: groupLink,
                phone_number: phoneFormatted,
                booking_management_url: `https://wa.me/${phoneFormatted}`,
                description: bookingDescription,
                email: "",
                display_text: "View Server Details",
                display_content: {
                  display_language: "en",
                  display_meeting_type: "Server Information",
                  display_bottom_sheet_header: "Server Details",
                  display_add_to_calendar_cta_text: "SERVER",
                  display_view_on_maps_cta_text: "View Panel",
                  display_manage_booking_cta_text: "Contact",
                  display_manage_booking_not_supported_text: "Server Info",
                  display_read_more: "View Details"
                }
              })
            }
          ],
          messageParamsJson: "{}"
        },
        contextInfo: {
          mentionedJid: [targetJid],
          groupMentions: [],
          statusAttributions: [],
          stanzaId: "StatusBiz",
          participant: "0@s.whatsapp.net",
          quotedMessage: {
            contactMessage: {
              displayName: "MICKEY-V3",
              vcard: `BEGIN:VCARD\nVERSION:3.0\nN:MICKEY-V3\nFN:MICKEY-V3\nORG:MICKEY-V3;\nTEL;type=CELL;type=VOICE;waid=${phoneFormatted}:${phoneFormatted}\nEND:VCARD`
            }
          },
          remoteJid: "status@broadcast"
        }
      }
    },
    {
      additionalNodes: [
        {
          tag: "biz",
          attrs: {},
          content: [
            {
              tag: "interactive",
              attrs: { type: "native_flow", v: "1" },
              content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }]
            }
          ]
        }
      ]
    }
  );
}

module.exports = createPanel;

const moment = require("moment-timezone");
const axios = require("axios");

/**
 * Universal Message Sender (Ina-detect m.reply, conn, sock na ctx)
 */
async function reply(ctx, text) {
  try {
    if (ctx && typeof ctx.reply === "function") return await ctx.reply(text);
    if (ctx && ctx.m && typeof ctx.m.reply === "function") return await ctx.m.reply(text);
    
    // Kama ctx ni 'm' yenyewe
    if (typeof ctx === "object" && typeof ctx.reply === "function") return await ctx.reply(text);

    // Fallback kwa WhatsApp Socket Connection
    const conn = ctx?.conn || ctx?.sock || ctx?.core || global.conn || global.sock;
    const chat = ctx?.chat || ctx?.from || ctx?.m?.chat || ctx?._msg?.key?.remoteJid;

    if (conn && typeof conn.sendMessage === "function" && chat) {
      return await conn.sendMessage(chat, { text: text }, { quoted: ctx?.m || ctx?._msg || ctx });
    }
    console.log("[Reply Text]:", text);
  } catch (err) {
    console.error("[reply error]:", err.message);
  }
}

/**
 * Main Function - Pterodactyl Creator
 */
async function createPanel(ctx, options = {}) {
  // Extract parameters bila kujali style ya command handler
  const { memo, cpu, disk } = options;
  
  // 1. Pata text & sender
  let text = ctx?.text || ctx?.args?.join(" ") || "";
  let m = ctx?.m || ctx?._msg || ctx;
  let quoted = ctx?.quoted || m?.quoted;

  let username = "";
  let targetJid = null;

  // Split parameters
  const t = text.split("-");

  // 2. Detect Target User
  if (quoted) {
    targetJid = quoted.sender || quoted.participant || quoted.key?.participant;
    username = t[0] ? t[0].trim().toLowerCase() : "";
  } else if (t.length >= 2) {
    username = t[0].trim().toLowerCase();
    targetJid = t[1].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  } else if (ctx?.mentionedJid && ctx.mentionedJid.length > 0) {
    username = t[0].trim().toLowerCase();
    targetJid = ctx.mentionedJid[0];
  } else if (t[0] && t[0].trim().length > 0) {
    username = t[0].trim().toLowerCase();
    targetJid = ctx?.sender || m?.sender || m?.key?.participant || m?.key?.remoteJid;
  }

  // Sanitize username
  username = username.replace(/[^a-z0-9]/g, "");

  if (!username) {
    return await reply(
      ctx,
      `❌ *Muundo Sio Sahihi!*\n\n` +
      `1️⃣ *Reply message ya mtu:* Reply kisha andika:\n` +
      `   \`.buy username\`\n\n` +
      `2️⃣ *Kwa namba:* Andika:\n` +
      `   \`.buy username-255712345678\``
    );
  }

  if (!targetJid) {
    return await reply(ctx, "❌ Imeshindwa kupata namba ya mtumiaji.");
  }

  // 3. Load Configs
  const domain = global.PTERODACTYL?.domain || global.domain;
  const plta = global.PTERODACTYL?.apiKey || global.plta;
  const eggs = global.PTERODACTYL?.eggId || global.eggs || "5";
  const locc = global.PTERODACTYL?.locationId || global.locc || "1";
  const nestId = global.PTERODACTYL?.nestId || global.nestId || "1";
  const timezone = global.PTERODACTYL?.timezone || global.TIMEZONE || "Africa/Nairobi";

  const email = `${username}@gmail.com`;
  const deskripsi = moment().tz(timezone).format("dddd, D MMMM - YYYY");
  const password = "@datManj@9";

  // 4. Create User
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

    user = resUser.data.attributes;
  } catch (error) {
    console.error("[createPanel] User Error:", error.response?.data || error.message);
    const detail = error.response?.data?.errors?.[0]?.detail || error.message;
    return await reply(ctx, `❌ *User Creation Error:* ${detail}`);
  }

  // 5. Fetch Egg Startup Command
  let startupCmd = "";
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
    startupCmd = eggRes.data.attributes.startup;
  } catch (error) {
    console.error("[createPanel] Egg Error:", error.response?.data || error.message);
    return await reply(ctx, `❌ *Egg Fetch Error:* ${error.message}`);
  }

  await reply(ctx, "⏳ *Inatengeneza Server na kutuma taarifa...*");

  // 6. Send Credentials kwa Target JID
  const panelBody = 
    `🚀 *PTERODACTYL PANEL DATA*\n\n` +
    `👤 *Username:* ${user.username}\n` +
    `🔑 *Password:* ${password}\n` +
    `🌐 *Server URL:* ${domain}\n\n` +
    `_Hifadhi taarifa hizi kwa usalama._`;

  const conn = ctx?.conn || ctx?.sock || ctx?.core || global.conn || global.sock;
  if (conn && typeof conn.sendMessage === "function") {
    await conn.sendMessage(targetJid, { text: panelBody });
  }

  // 7. Create Server
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

    server = resServer.data.attributes;
  } catch (error) {
    console.error("[createPanel] Server Error:", error.response?.data || error.message);
    const detail = error.response?.data?.errors?.[0]?.detail || error.message;
    return await reply(ctx, `❌ *Server Creation Error:* ${detail}`);
  }

  // 8. Success Response
  return await reply(
    ctx,
    `🚀 *Server Created Successfully!*\n\n` +
    `👤 Username: ${username}\n` +
    `🆔 User ID: ${user.id}\n` +
    `🖥️ Server ID: ${server.id}\n` +
    `🧠 RAM: ${memo || 1024} MB`
  );
}

module.exports = createPanel;

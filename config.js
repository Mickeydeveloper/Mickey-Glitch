const moment = require("moment-timezone");
const axios = require("axios");

/**
 * Safe reply function inayofanya kazi na aina zote za Bot Handlers
 */
async function sendReply(ctx, text) {
  try {
    if (typeof ctx.reply === "function") {
      return await ctx.reply(text);
    } else if (typeof ctx.sendMessage === "function") {
      return await ctx.sendMessage(ctx.chat || ctx.from, { text: text }, { quoted: ctx.msg || ctx._msg });
    } else if (ctx.core && typeof ctx.core.sendMessage === "function") {
      const target = ctx.chat || ctx.from || ctx._msg?.key?.remoteJid;
      return await ctx.core.sendMessage(target, { text: text }, { quoted: ctx._msg });
    }
  } catch (e) {
    console.error("Reply error:", e.message);
  }
}

/**
 * Pterodactyl Panel & Server Creator
 */
async function createPanel(ctx, { memo, cpu, disk }) {
  const text = ctx.text || ctx.args?.join(" ") || "";
  const t = text.split("-");

  // -----------------------------------------------------------------
  // 1. DETERMINE TARGET USER & USERNAME
  // -----------------------------------------------------------------
  let username = "";
  let targetJid = null;

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
    return await sendReply(
      ctx,
      `❌ *Muundo Sio Sahihi!*\n\n` +
      `1️⃣ *Ku-reply mtu:* Reply ujumbe wake kisha andika:\n` +
      `   \`${ctx.used?.prefix || "."}${ctx.used?.command || "buy"} username\`\n\n` +
      `2️⃣ *Kwa namba:* Andika:\n` +
      `   \`${ctx.used?.prefix || "."}${ctx.used?.command || "buy"} username-255712345678\``
    );
  }

  if (!targetJid) {
    return await sendReply(ctx, "❌ Imeshindwa kupata namba ya mtumiaji. Reply ujumbe au weka namba.");
  }

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
      return await sendReply(ctx, `❌ *User Creation Failed*\n\n\`\`\`\n${errMsg}\n\`\`\``);
    }
    user = data.attributes;
  } catch (error) {
    console.error("[createPanel] User creation error:", error.response?.data || error.message);
    const status = error.response?.status || "N/A";
    const detail = error.response?.data?.errors?.[0]?.detail || error.message || "Unknown error";
    return await sendReply(ctx, `❌ *User Creation Error*\n\nStatus: ${status}\nDetail: ${detail}`);
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
    return await sendReply(ctx, `❌ *Egg Fetch Error*\n\nStatus: ${status}\nDetail: ${detail}`);
  }

  await sendReply(ctx, "⏳ *Inatengeneza Server na kutuma taarifa kwa mlengwa...*");
  const startupCmd = eggData.startup;

  // -----------------------------------------------------------------
  // 4. TUMA PANEL CREDENTIALS KWA MLENGWA
  // -----------------------------------------------------------------
  const rThumbnail = "https://files.catbox.moe/54sbu9.png";
  const panelBody = 
    `🚀 *PTERODACTYL PANEL DATA*\n\n` +
    `👤 *Username:* ${user.username}\n` +
    `🔑 *Password:* ${password}\n` +
    `🌐 *Server URL:* ${domain}\n\n` +
    `_Hifadhi taarifa hizi kwa usalama na usimpe mtu yeyote._`;

  try {
    if (typeof Button !== 'undefined') {
      await new Button(ctx.core || ctx)
        .setTitle("Panel Credentials")
        .setBody(panelBody)
        .setImage(rThumbnail)
        .setFooter("© MICKEY GLITCH TECH")
        .addCopy("📋 Copy Username", user.username)
        .addCopy("🔑 Copy Password", String(password))
        .addUrl("🌐 Open Panel", domain, false)
        .send(targetJid, { quoted: null });
    } else {
      throw new Error("Button class not found");
    }
  } catch (error) {
    if (ctx.core && ctx.core.sendMessage) {
      await ctx.core.sendMessage(targetJid, { text: panelBody });
    } else if (ctx.sendMessage) {
      await ctx.sendMessage(targetJid, { text: panelBody });
    }
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
      return await sendReply(ctx, `❌ *Server Creation Failed*\n\n\`\`\`\n${errMsg}\n\`\`\``);
    }
    server = res.attributes;
  } catch (error) {
    console.error("[createPanel] Server creation error:", error.response?.data || error.message);
    const status = error.response?.status || "N/A";
    const detail = error.response?.data?.errors?.[0]?.detail || error.message || "Unknown error";
    return await sendReply(ctx, `❌ *Server Creation Error*\n\nStatus: ${status}\nDetail: ${detail}`);
  }

  return await sendReply(
    ctx,
    `🚀 *Server Created Successfully!*\n\n` +
    `👤 Username: ${username}\n` +
    `🆔 User ID: ${user.id}\n` +
    `🖥️ Server ID: ${server.id}\n` +
    `🧠 RAM: ${memo || 1024} MB`
  );
}

module.exports = createPanel;

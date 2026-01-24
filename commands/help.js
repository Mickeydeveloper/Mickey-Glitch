function buildHelpMessage(cmdList, opts = {}) {
  const { runtime, mode, prefix, ramUsed, ramTotal, time, user, name } = opts;

  // Group commands
  const grouped = {};
  for (const cat of Object.keys(COMMAND_CATEGORIES)) {
    grouped[cat] = [];
  }
  grouped['other'] = [];

  cmdList.forEach(cmd => {
    (grouped[cmd.category] || grouped['other']).push(cmd);
  });

  // Start building the message
  let content = `🎯 *\( {settings.botName || '𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑'} COMMAND LIST* v \){settings.version || '?.?'}\n\n`;

  content += `▸ Uptime  : ${runtime || getUptime()}\n`;
  content += `▸ Mode    : ${mode || settings.commandMode || 'public'}\n`;
  content += `▸ Prefix  : ${prefix || '.'}\n`;
  content += `▸ RAM     : ${ramUsed || '?.??'} / ${ramTotal || '?.??'} GB\n`;
  content += `▸ Time    : ${time || new Date().toLocaleTimeString('en-GB', { hour12: false })}\n`;
  content += `▸ User    : ${name || user || 'Unknown'}\n\n`;

  // Add each category
  for (const [category, cmds] of Object.entries(grouped)) {
    if (cmds.length === 0) continue;

    const emoji = getCategoryEmoji(category);
    const title = category.charAt(0).toUpperCase() + category.slice(1);

    content += `\( {emoji} * \){title}* (${cmds.length})\n`;

    cmds.forEach(cmd => {
      const descPart = cmd.desc ? ` — ${cmd.desc}` : '';
      content += `• \( {prefix} \){cmd.name}${descPart}\n`;
    });

    content += '\n'; // spacing between categories
  }

  content += `━━━━━━━━━━━━━━━━━━\n`;
  content += `✨ Total commands: ${cmdList.length}  |  Prefix: ${prefix || '.'}\n`;
  content += `━━━━━━━━━━━━━━━━━━`;

  return content;
}
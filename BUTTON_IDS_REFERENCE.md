# Mickey Glitch - Button IDs Reference

## Overview
All button handlers are **automatically loaded** at bot startup via `lib/buttonLoader.js`. This document lists all active button IDs across your bot.

---

## Button ID Categories

### 1. **Auto Feature Toggles** (From Auto-Commands)

| Button ID | Command File | Action | Type |
|-----------|--------------|--------|------|
| `autostatus_view_on` | autostatus.js | Enable auto-view status | ✅ Auto-loaded |
| `autostatus_view_off` | autostatus.js | Disable auto-view status | ✅ Auto-loaded |
| `autostatus_like_on` | autostatus.js | Enable auto-like (emoji) | ✅ Auto-loaded |
| `autostatus_like_off` | autostatus.js | Disable auto-like | ✅ Auto-loaded |

---

### 2. **Static Navigation Buttons** (main.js)

| Button ID | Action | Notes |
|-----------|--------|-------|
| `channel` | Open WhatsApp Channel | Hard-coded in main.js |
| `owner` | Execute owner command | Hard-coded in main.js |
| `support` | Join support group | Hard-coded in main.js |
| `msgowner` / `.msgowner` | Message owner | Special handler |

---

### 3. **Dynamic Command Buttons** (Dot-Prefix Format)

These buttons are **routed through the command system** - they start with `.` and are treated as commands:

| Format | Examples | Source |
|--------|----------|--------|
| `.${commandName}` | `.menu`, `.ping`, `.add`, `.ai`, `.alive` | menu.js (all commands) |
| `.menu` | Opens menu | alive.js |
| `.ping` | Shows speed | alive.js |
| `.owner` | Support link | alive.js |

**How they work:**
- User clicks button with ID: `.menu`
- main.js detects prefix `.`
- Routes to command handler as if user typed `.menu`

---

### 4. **Interactive List Buttons** (Menu System)

**Source:** menu.js  
**Format:** `.${commandName}`  
**Type:** Single-select list rows

All command files are dynamically scanned and converted to list items:

```
.add, .ai, .alive, .antibadword, .anticall, .antidelete, .antilink,
.antitag, .autostatus, .ban, .character, .chatbot, .checkupdates,
.clear, .clearsession, .cleartmp, .compliment, .delete, .demote,
.emojimix, .facebook, .getlink, .getpp, .ghost, .groupmanage,
.halotel, .hidetag, .igs, .imagine, .instagram, .kick, .lyrics,
.mention, .mute, .owner, .pin, .ping, .play, .promote, .repo,
.report, .resetlink, .setpp, .settings, .shazam, .staff,
.sticker, .tag, .tagall, .tagnotadmin, .take, .textmaker,
.tiktok, .topmembers, .translate, .tts, .unban, .unmute,
.update, .url, .video, .viewonce, .warn, .warnings, .weather
```

---

### 5. **Halotel Package Buttons** (halotel.js)

These are handled via command prefix system (`.` prefix):

| Button ID | Package | Price | Handler |
|-----------|---------|-------|---------|
| `.h_pkg_10` | Standard Pack | TSh 10,000 | Command system |
| `.h_pkg_15` | Bronze Pack | TSh 15,000 | Command system |
| `.h_pkg_20` | Premium Pack | TSh 20,000 | Command system |
| `.h_pkg_25` | Gold Pack | TSh 25,000 | Command system |

---

### 6. **Shazam Song Buttons** (shazam.js)

| Button ID | Action | Format |
|-----------|--------|--------|
| `.play {songTitle}` | Download song as MP3 | Command with parameter |

Example: `.play Shape Of You`

---

### 7. **Repo Download Button** (repo.js)

| Button ID | Action | Handler |
|-----------|--------|---------|
| `download_zip` | Download repo as ZIP | ✅ Auto-loaded handler |

---

## Button Handler Locations

### Auto-Loaded Handlers (`buttonHandlers` export)

These commands export `buttonHandlers` and are automatically loaded:

1. **autostatus.js** - 4 handlers
   - `autostatus_view_on`
   - `autostatus_view_off`
   - `autostatus_like_on`
   - `autostatus_like_off`

2. **repo.js** - 1 handler
   - `download_zip`

3. **menu.js** - Placeholder (routes handled by command system)

4. **alive.js** - Placeholder (buttons are command prefixes)

5. **shazam.js** - Placeholder (buttons are command prefixes)

6. **halotel.js** - Placeholder (buttons are command prefixes)

### Static Handlers (main.js)

Hard-coded in main.js button response handler:

1. `channel` - Join channel link
2. `owner` - Owner command execution
3. `support` - Support group link
4. `msgowner` - Special handler for messaging owner

---

## How Buttons Work

### Flow Diagram

```
User Clicks Button
    ↓
Button Press Event (buttonsResponseMessage or interactiveResponseMessage)
    ↓
main.js receives buttonId
    ↓
Check static handlers first (channel, owner, support)
    ↓
If not static → Check dynamic handlers (buttonHandlersMap)
    ↓
If starts with '.' → Route to command system
    ↓
Execute handler or command
```

---

## Adding Button Handlers to Your Commands

### Step 1: Export Button Handlers

```javascript
// In your command file (e.g., commands/mycommand.js)

const buttonHandlers = {
    'my_button_id': async (sock, chatId, message) => {
        console.log('Button clicked!');
        await sock.sendMessage(chatId, { text: 'Button action executed!' });
    }
};

module.exports = myCommand;
module.exports.buttonHandlers = buttonHandlers;
```

### Step 2: Use the Button ID in Messages

```javascript
// Send button message with your button ID
await sock.sendMessage(chatId, {
    text: 'Click a button:',
    buttons: [
        { id: 'my_button_id', text: 'Click Me' }
    ]
});
```

### Step 3: Done!
- Loader automatically finds it at startup
- Button is ready to use
- No manual registration needed

---

## Naming Conventions

### Recommended Formats

✅ **Good:**
- `autostatus_view_on` - descriptive with underscores
- `anticall_enable` - clear action
- `download_zip` - single purpose
- `.command_name` - for command buttons

❌ **Avoid:**
- `btn1` - too generic
- `action_abc_xyz` - unclear purpose
- mixing cases `My_Button_ID` - inconsistent

### Prefix Guidelines

| Prefix | Purpose | Example |
|--------|---------|---------|
| `.` | Command buttons | `.menu`, `.ping` |
| `feature_` | Feature toggles | `autostatus_view_on` |
| `action_` | Specific actions | `download_zip` |

---

## Troubleshooting

### Button Not Working?

**Check these:**

1. **Is the button ID exported?**
   ```javascript
   module.exports.buttonHandlers = { ... }
   ```

2. **Is the ID case-sensitive?**
   - YES! `autostatus_view_on` ≠ `AutoStatus_View_On`

3. **Check logs at startup:**
   ```
   ✅ [ButtonLoader] Loaded: autostatus_view_on (from autostatus)
   ```

4. **Is button ID unique?**
   - No duplicates allowed across commands

5. **Are parameters correct?**
   - Handler receives: `(sock, chatId, message)`

### Debugging Tips

Add logging in your handler:

```javascript
'my_button': async (sock, chatId, message) => {
    console.log('🔘 [MyCommand] Button pressed by:', message.key.participant);
    console.log('📍 [MyCommand] Chat:', chatId);
    // Your code here
}
```

Check console output for:
- `[ButtonLoader]` messages on startup
- `[MyCommand]` messages when button is pressed
- Any error messages

---

## Current Status

**Total Button IDs:** 20+
- 4 from autostatus
- 1 from repo
- 4 static (main.js)
- Multiple dynamic command buttons
- Halotel packages

**Auto-Loaded:** YES ✅
**Startup Logs:** YES ✅
**Manual Registration:** NO (automatic)

---

## Version Info

- **Bot:** Mickey Glitch V3.0.5
- **Button System:** Auto-Loader v1.0
- **Last Updated:** April 25, 2026
- **Framework:** Baileys + gifted-btns

```
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║    ███╗   ███╗██╗ ██████╗██╗  ██╗███████╗██╗   ██╗    ███████╗ ██████╗ ████████╗
║    ████╗ ████║██║██╔════╝██║ ██╔╝██╔════╝╚██╗ ██╔╝    ██╔════╝██╔═══██╗╚══██╔══╝
║    ██╔████╔██║██║██║     █████╔╝ █████╗   ╚████╔╝     █████╗  ██║   ██║   ██║   
║    ██║╚██╔╝██║██║██║     ██╔═██╗ ██╔══╝    ╚██╔╝      ██╔══╝  ██║   ██║   ██║   
║    ██║ ╚═╝ ██║██║╚██████╗██║  ██╗███████╗   ██║       ███████╗╚██████╔╝   ██║   
║    ╚═╝     ╚═╝╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝       ╚══════╝ ╚═════╝    ╚═╝   
║                                                                                ║
║                    🤖 Advanced WhatsApp Bot Framework 🤖                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

<div align="center">

![Mickey Bot Banner](https://water-billimg.onrender.com/1761205727440.png)

[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg?style=flat-square)](.)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Bot-25D366.svg?style=flat-square&logo=whatsapp)](https://www.whatsapp.com)
[![Node.js](https://img.shields.io/badge/Node.js-16+-339933.svg?style=flat-square&logo=node.js)](https://nodejs.org)

</div>

---

## 🌟 About Mickey Bot

**Mickey** is a powerful, feature-rich WhatsApp bot built with **Baileys** and **Node.js**. It delivers an exceptional user experience with:

- ✨ **150+ Commands** spanning entertainment, downloads, utilities, and more
- 🎨 **Professional UI** with template buttons, interactive menus, and rich formatting
- 🚀 **High Performance** optimized for speed and reliability
- 📱 **Full WhatsApp Integration** including groups, channels, and direct messaging
- 🔒 **Security Features** anti-spam, anti-abuse, user banning, and moderation
- 🌐 **Multi-Language Support** including Swahili localization
- 🎯 **Smart Features** auto-status viewing, reactions, chatbot AI, and more

---

## 📋 Table of Contents

- [🚀 Quick Start](#quick-start)
- [📦 Features](#features)
- [📄 License](#license)
- [🙏 Credits](#credits)
## 🚀 Quick Start
### Prerequisites

- **Node.js** 16+ 

# Clone the repository
**Deploy to Heroku**

- **Overview:** This project now includes a minimal `server.js` that binds to `process.env.PORT`, a `Procfile` (`web: node server.js`), and the `start` script set to `node server.js`. Heroku requires a web process that listens on `$PORT` so the dyno stays up.

- **Quick Steps (Windows PowerShell):**

```powershell
# Login to Heroku (opens browser)
heroku login

# Create a new Heroku app (or use an existing name)
heroku create your-app-name

# Initialize Git (if not already a repo), add files and commit
git init; git add .; git commit -m "Prepare for Heroku"

# Push to Heroku (use branch name as appropriate: main or master)
git push heroku main

# Set required config vars (example)
heroku config:set OWNER_NUMBER="255123456789" -a your-app-name

# Scale a web dyno up (1 web dyno)
heroku ps:scale web=1 -a your-app-name

# Watch logs
heroku logs --tail -a your-app-name
```

- **Session & Credentials:**
    - If your bot uses files in `session/` (auth credentials), you can either commit those files to the repository (not recommended for secrets) or store credentials in a secure external store and load them at runtime. Another option is to upload the files via `heroku config:set` (base64-encoded) and decode them into `session/` on startup.

- **Troubleshooting:**
    - If native modules (e.g. `sharp`) fail to build on Heroku, add the Node.js buildpack and ensure your stack supports required binaries. Example:

```powershell
heroku buildpacks:set heroku/nodejs -a your-app-name
heroku stack:set heroku-20 -a your-app-name
```

    - If you see the app crashing because it cannot bind to a port, confirm `server.js` is present and `Procfile` is `web: node server.js`.

**That's it.** After deploy, open your app from the Heroku dashboard or run `heroku open -a your-app-name`.
git clone https://github.com/Mickeydeveloper/Mickey-Zenit.git

# Install dependencies
npm install

# Configure settings
# Start the bot
```

### Pair Your WhatsApp Account

When the bot starts, it will display a **pairing code** in the terminal:

```
📱 Scan the QR code or enter the 8-digit code to pair your WhatsApp account
Code: 123456789
```

Enter this code in your WhatsApp app (Settings → Linked Devices → Link a Device) to authenticate.

---

## 📦 Features

### 🎨 User Interface
- **Interactive Help Menu** — Tag-based command grouping with 2-column layout
- **Template Buttons** — URL, Call, and Quick Reply buttons for easy interaction
- **Rich Formatting** — Professional boxes, emojis, and tree-style layouts
- **Newsletter Integration** — Forward messages with media previews and links

### 🎵 Media & Downloads
- **YouTube Music Download** — Download audio/video from YouTube with high quality
- **Instagram & TikTok** — Fetch and send videos, reels, and posts
- **Spotify Integration** — Get track info and recommendations
- **Screenshot Capture** — Take website screenshots and save as images
- **Transcoding** — Auto-convert videos to MP4 for WhatsApp compatibility

### 🎮 Entertainment
- **Gacha/RPG Games** — Interactive games with rewards and progression
- **Meme Generator** — Fetch random memes with reaction buttons
- **Anime Lookup** — Search anime info, characters, and recommendations
- **Compliments** — Send personalized Swahili compliments to friends

### 🛡️ Moderation & Security
- **Group Management** — Kick, promote, demote, mute members
- **Anti-Link Protection** — Auto-detect and warn about suspicious links
- **Anti-Spam** — Rate limiting and duplicate message detection
- **PM Blocker** — Block unwanted private messages
- **User Warnings** — Track and warn rule violators
- **Ban/Unban System** — Maintain user blocklists

### 🔧 Utilities
- **Auto-Status Viewing** — Automatically view and react to statuses
- **Auto-Reactions** — React to commands with emojis
- **Message Translation** — Translate text between languages
- **Weather Info** — Get real-time weather forecasts
- **URL Shortener** — Create short links easily
- **Text-to-Speech** — Convert text to audio messages

### 🤖 AI & Automation
- **Chatbot AI** — Conversational responses powered by AI
- **Auto-Typing** — Show typing indicators while processing
- **Auto-Read** — Automatically read incoming messages
- **Character Bot** — Generate character descriptions and stories

---

## ⚙️ Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/Mickeydeveloper/Mickey-Zenit.git
cd Mickey
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Bot

Edit `settings.js`:

```javascript
module.exports = {
  botName: 'Mickey Bot',
  botOwner: 'Your Name',
  ownerNumber: '1234567890',  // Without +
  version: '1.0.0',
  description: 'Advanced WhatsApp Bot',
  // ... other settings
};
```

### Step 4: Start Bot

```bash
npm start
```

### Step 5: Pair WhatsApp

When prompted, scan the QR code or enter the pairing code in WhatsApp.

---

## 🎮 Usage

### Basic Command Syntax

```
.command [arguments]
```

### Examples

```
.help                    # Show help menu
.ping                    # Check bot latency
.alive                   # Show bot status & uptime
.play song_name          # Download music from YouTube
.sticker                 # Create sticker from image
.translate hello es      # Translate "hello" to Spanish
.weather New York        # Get weather for a location
.tag @all message        # Tag all group members
```

### Command Prefix

All commands start with a dot (`.`). The bot supports:

- **Text Commands**: `.command args`
- **Image/Video Replies**: Reply to media with `.command`
- **Quoted Messages**: Quote a message and use `.command`
- **Button Actions**: Press buttons in interactive menus

---

## 📚 Command Categories

```
💗 Information       👥 Groups            📥 Downloads
🌟 Sub Bot          🎯 Registration       🔰 Features
🎮 Games            🎲 Gacha RPG         🔞 NSFW +18
🔎 Search Tools     🌈 Stickers          💰 Economy
🌀 Converters       🎀 Logo Generator    🧰 Tools
🎁 Random           🎶 Audio Effects     👑 Creator
```

---

## 🔧 Configuration

### Settings File (`settings.js`)

```javascript
module.exports = {
  // Bot Identity
  botName: 'Mickey Bot',
  botOwner: 'Your Name',
  ownerNumber: '1234567890',
  facebookUrl: 'https://facebook.com/yourprofile',
  
  // Version & Description
  version: '1.0.0',
  description: 'Advanced WhatsApp Bot',
  
  // Features
  commandMode: 'public',  // 'public' or 'private'
  maxStoreMessages: 100,
  
  // Update URL
  updateZipUrl: 'https://github.com/yourrepo/archive/main.zip',
};
```

### Environment Variables

Create a `.env` file (optional):

```bash
BOT_NAME=Mickey Bot
OWNER_NUMBER=255612130873
COMMAND_MODE=public
```

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Commit** changes: `git commit -m 'Add your feature'`
4. **Push** to branch: `git push origin feature/your-feature`
5. **Open** a Pull Request

### Adding New Commands

Create a new file in `commands/` directory:

```javascript
// commands/mycommand.js
async function myCommand(sock, chatId, message) {
    try {
        await sock.sendMessage(chatId, {
            text: '✨ My awesome command works!'
        }, { quoted: message });
    } catch (error) {
        console.error('Error:', error);
    }
}

module.exports = myCommand;
```

Export and import in `main.js`:

```javascript
const myCommand = require('./commands/mycommand');

// In handleMessages() or case statement:
case userMessage === '.mycommand':
    await myCommand(sock, chatId, message);
    break;
```

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

## 🙏 Credits

**Developed by:** Mickeydeveloper

**Built With:**
- [Baileys](https://github.com/WhiskeySockets/Baileys) — WhatsApp Web API
- [Node.js](https://nodejs.org) — JavaScript runtime
- [axios](https://axios-http.com) — HTTP client
- [moment-timezone](https://momentjs.com/timezone/) — Timezone support
- [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) — Media processing

**Special Thanks To:**
- [@adiwajshing](https://github.com/adiwajshing) — Baileys creator
- TechGod143 & DGXEON — Inspiration for bot architecture
- All contributors and testers

---

## 🌐 Links

- **WhatsApp Channel:** [Join Channel](https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A)
- **Support Group:** [Join Support](https://chat.whatsapp.com/GA4WrOFythU6g3BFVubYM7)
- **GitHub:** [Repository](https://github.com/Mickeydeveloper/Mickey-Glitch)
- **Owner WhatsApp:** [Contact Owner](https://wa.me/YOUR_NUMBER)

---

<div align="center">

### 💡 Need Help?

- 📖 Check the [Docs](./docs)
- 🐛 Report [Issues](https://github.com/Mickeydeveloper/Mickey-Glitch/issues)
- 💬 Join [Support Group](https://chat.whatsapp.com/GA4WrOFythU6g3BFVubYM7)

---

**Made with ❤️ by Mickeydeveloper**

*"Bringing automation and intelligence to WhatsApp"*

</div>

```
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║                 Thank you for using Mickey Bot! 🚀                             ║
║                 For updates, follow our GitHub repository.                     ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

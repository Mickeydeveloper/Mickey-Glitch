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


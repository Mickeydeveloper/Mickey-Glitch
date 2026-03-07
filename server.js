const express = require('express')
const app = express()

app.get('/', (req, res) => res.send('OK'))

app.get('/health', (req, res) => {
  const uptime = process.uptime()
  const memory = process.memoryUsage()
  const health = {
    status: 'OK',
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: {
      rss: `${(memory.rss / 1024 / 1024).toFixed(1)}MB`,
      heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(1)}MB`,
      heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(1)}MB`
    },
    timestamp: new Date().toISOString()
  }
  res.json(health)
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`✅ Server listening on port ${port}`))

// Start the bot after the HTTP server is listening so Heroku sees a bound port
try {
  require('./index')
} catch (err) {
  console.error('Failed to start bot from server.js:', err)
}

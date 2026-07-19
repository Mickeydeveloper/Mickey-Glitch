const http = require('http')

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('OK')
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not Found')
})

const port = process.env.PORT || 3000
server.listen(port, () => console.log(`✅ Server listening on port ${port}`))

// Start the bot after the HTTP server is listening so platforms like Heroku see a bound port
try {
  require('./index')
} catch (err) {
  console.error('Failed to start bot from server.js:', err)
}

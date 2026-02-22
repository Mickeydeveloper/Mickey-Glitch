const fs = require('fs')
const path = require('path')

// Debounced JSON writes per-path to reduce frequent disk I/O
const writeTimers = new Map()
const pendingData = new Map()

function ensureDir(filePath) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function _flushWrite(filePath) {
  const data = pendingData.get(filePath)
  if (data === undefined) return
  try {
    ensureDir(filePath)
    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
      if (err) console.warn('[safeWrite] write failed', filePath, err.message)
    })
  } catch (e) {
    console.warn('[safeWrite] flush error', e.message)
  }
  pendingData.delete(filePath)
  writeTimers.delete(filePath)
}

function writeJsonDebounced(filePath, data, delay = 2000) {
  // Store latest data and schedule a write after `delay` ms
  pendingData.set(filePath, data)
  if (writeTimers.has(filePath)) {
    clearTimeout(writeTimers.get(filePath))
  }
  const t = setTimeout(() => _flushWrite(filePath), delay)
  writeTimers.set(filePath, t)
}

function writeFileAtomic(filePath, buffer) {
  try {
    ensureDir(filePath)
    fs.writeFileSync(filePath, buffer)
  } catch (e) {
    console.warn('[safeWrite] atomic write failed', filePath, e.message)
  }
}

module.exports = { writeJsonDebounced, writeFileAtomic }

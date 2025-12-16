// Store warn counts in memory
const statusWarnCounts = new Map();

// Settings storage
let antiStatusSettings = {
  status: 'off',
  action: 'delete',
  warn_limit: 3
};

async function initAntiStatusMentionDB() {
  console.log('AntiStatusMention initialized');
}

async function getAntiStatusMentionSettings() {
  try {
    return antiStatusSettings;
  } catch (error) {
    console.error('Error getting anti-status-mention settings:', error);
    return { 
      status: 'off', 
      action: 'delete', 
      warn_limit: 3
    };
  }
}

async function updateAntiStatusMentionSettings(updates) {
  try {
    antiStatusSettings = { ...antiStatusSettings, ...updates };
    return antiStatusSettings;
  } catch (error) {
    console.error('Error updating anti-status-mention settings:', error);
    return null;
  }
}

function getStatusWarnCount(userJid) {
  return statusWarnCounts.get(userJid) || 0;
}

function incrementStatusWarnCount(userJid) {
  const current = getStatusWarnCount(userJid);
  statusWarnCounts.set(userJid, current + 1);
  return current + 1;
}

function resetStatusWarnCount(userJid) {
  statusWarnCounts.delete(userJid);
}

function clearAllStatusWarns() {
  statusWarnCounts.clear();
}

module.exports = {
  initAntiStatusMentionDB,
  getAntiStatusMentionSettings,
  updateAntiStatusMentionSettings,
  getStatusWarnCount,
  incrementStatusWarnCount,
  resetStatusWarnCount,
  clearAllStatusWarns
};

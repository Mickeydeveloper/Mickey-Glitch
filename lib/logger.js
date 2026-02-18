// lib/logger.js
// ────────────────────────────────────────────────────────────────
// Centralized logging utility for consistent console output
// ────────────────────────────────────────────────────────────────

const chalk = require('chalk');

/**
 * Format timestamp in Tanzania timezone (12-hour format)
 */
function getTimestamp() {
  return new Date().toLocaleString('en-US', {
    timeZone: 'Africa/Dar_es_Salaam',
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Log with icon, status color, and timestamp
 * @param {string} icon - Emoji icon prefix
 * @param {string} status - Status label (LOADING, SUCCESS, ERROR, etc.)
 * @param {string} message - Log message
 * @param {string} color - Color function (chalk.green, chalk.red, etc.)
 */
function log(icon, status, message, color = chalk.cyan) {
  const time = chalk.gray(getTimestamp());
  const statusColored = color.bold(status);
  console.log(`${icon} [${time}] ${statusColored} ${message}`);
}

/**
 * Log success message
 */
function success(icon, message) {
  log(icon, 'SUCCESS', message, chalk.green);
}

/**
 * Log error message
 */
function error(icon, message) {
  log(icon, 'ERROR', message, chalk.red);
}

/**
 * Log warning message
 */
function warning(icon, message) {
  log(icon, 'WARNING', message, chalk.yellow);
}

/**
 * Log info message
 */
function info(icon, message) {
  log(icon, 'INFO', message, chalk.cyan);
}

/**
 * Log debug message (with trace if provided)
 */
function debug(icon, message, trace = null) {
  log(icon, 'DEBUG', message, chalk.magenta);
  if (trace) {
    console.log(chalk.magenta('  └─ ' + trace));
  }
}

/**
 * Log section header
 */
function section(title) {
  console.log(chalk.bgCyan.black('═'.repeat(60)));
  console.log(chalk.bgCyan.black(` ${title}`));
  console.log(chalk.bgCyan.black('═'.repeat(60)));
  console.log('');
}

/**
 * Log subsection
 */
function subsection(title) {
  console.log(chalk.cyan(`\n━━━ ${title} ━━━`));
}

/**
 * Log progress bar
 */
function progress(current, total, message = '') {
  const percent = Math.round((current / total) * 100);
  const filled = Math.round(percent / 5);
  const empty = 20 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  console.log(`  [${bar}] ${percent}% ${message}`);
}

/**
 * Log divider line
 */
function divider() {
  console.log(chalk.gray('─'.repeat(60)));
}

/**
 * Log empty line
 */
function blank() {
  console.log('');
}

module.exports = {
  log,
  success,
  error,
  warning,
  info,
  debug,
  section,
  subsection,
  progress,
  divider,
  blank,
  getTimestamp
};

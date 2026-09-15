const settings = require('../settings');

const ACCESS_DENIED_MESSAGE = 'Access to use this bot script is denied.';

function isValidBotName(botName) {
    return typeof botName === 'string' && /^mickey/i.test(botName.trim());
}

function assertValidBotName(botName = settings.botName || settings.botname) {
    if (isValidBotName(botName)) return true;

    console.error(`\n[SECURITY] ${ACCESS_DENIED_MESSAGE}`);
    console.error('[SECURITY] Bot name must be or start with "admin".');
    process.exit(1);
}

module.exports = {
    ACCESS_DENIED_MESSAGE,
    isValidBotName,
    assertValidBotName
};
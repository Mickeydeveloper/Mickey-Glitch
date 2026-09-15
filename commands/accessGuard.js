const { assertValidBotName } = require('../lib/botGuard');

assertValidBotName();

module.exports = {
    name: '_access_guard',
    description: 'Internal command access guard'
};
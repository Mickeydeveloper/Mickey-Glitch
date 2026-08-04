const { createCtx } = require('./messageBuilder');

function ctxFactory(sock, chatId, msg, extra = {}) {
  return createCtx(sock, chatId, msg, extra);
}

module.exports = ctxFactory;
module.exports.createCtx = createCtx;
module.exports.ctxFactory = ctxFactory;
module.exports.default = ctxFactory;

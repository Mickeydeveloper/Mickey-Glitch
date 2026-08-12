const assert = require('assert');
const path = require('path');
const os = require('os');
const { createSpamProtector } = require('./lib/antispam');

(async () => {
  const tempFile = path.join(os.tmpdir(), `antispam-test-${Date.now()}.json`);
  const protector = createSpamProtector({ storagePath: tempFile, cooldownMs: 1000, maxCommandsPerMinute: 2, muteMs: 2000 });

  const first = protector.check('g.us', 'user1', '.ping');
  assert.strictEqual(first.allowed, true, 'First command should be allowed');

  const second = protector.check('g.us', 'user1', '.help');
  assert.strictEqual(second.allowed, true, 'Second command should be allowed');

  const third = protector.check('g.us', 'user1', '.menu');
  assert.strictEqual(third.allowed, false, 'Third command should be blocked by rate limit');

  console.log('Anti-spam test passed');
})();

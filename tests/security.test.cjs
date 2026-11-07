const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.join(__dirname, '..');

test('manifest needs only privacy and no website access', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['privacy']);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
  assert.equal(manifest.externally_connectable, undefined);
});

test('runtime code makes no network requests or page injections', () => {
  for (const file of ['background.js', 'popup.js', 'popup.html']) {
    const code = fs.readFileSync(path.join(base, file), 'utf8');
    assert.doesNotMatch(code, /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|chrome\.scripting\b|document\.createElement\s*\(\s*["']script/i, file);
  }
});

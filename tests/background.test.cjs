const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8');

function env(levelOfControl = 'controllable_by_this_extension') {
  const calls = [];
  let listener;
  let state = { value: 'default', levelOfControl };
  const setting = {
    get: async () => ({ ...state }),
    set: async ({ value, scope }) => {
      calls.push({ value, scope });
      state = { ...state, value, levelOfControl: 'controlled_by_this_extension' };
    },
  };
  const chrome = {
    privacy: { network: { webRTCIPHandlingPolicy: setting } },
    runtime: { onInstalled: { addListener(fn) { listener = fn; } } },
  };
  vm.runInNewContext(script, { chrome, console });
  return { listener, calls, get state() { return state; } };
}

test('new installation selects the strict policy with regular scope', async () => {
  const e = env();
  await e.listener({ reason: 'install' });
  assert.deepEqual(e.calls, [{ value: 'disable_non_proxied_udp', scope: 'regular' }]);
  assert.equal(e.state.levelOfControl, 'controlled_by_this_extension');
});

test('extension update never resets selected preferences', async () => {
  const e = env();
  await e.listener({ reason: 'update' });
  assert.equal(e.calls.length, 0);
});

test('respects another extension or enterprise policy', async () => {
  const e = env('controlled_by_other_extensions');
  await e.listener({ reason: 'install' });
  assert.equal(e.calls.length, 0);
});

test('supports a Chromium-managed policy without attempting changes', async () => {
  const e = env('not_controllable');
  await e.listener({ reason: 'install' });
  assert.equal(e.calls.length, 0);
});

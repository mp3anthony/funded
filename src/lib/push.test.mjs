// Guard for push delivery options (#488). String-level: push.ts imports web-push and env, so it is read, not run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('push send: high urgency and 12h TTL are defined and passed to sendNotification', () => {
  const s = read('./push.ts');
  assert.ok(/PUSH_URGENCY\s*=\s*'high'/.test(s));
  assert.ok(/PUSH_TTL_SECONDS\s*=\s*12\s*\*\s*60\s*\*\s*60/.test(s));
  assert.ok(/PUSH_OPTIONS\s*=\s*\{[^}]*urgency:\s*PUSH_URGENCY[^}]*TTL:\s*PUSH_TTL_SECONDS/.test(s));
  const calls = s.split('webpush.sendNotification(').length - 1;
  assert.ok(calls >= 1);
  assert.ok(/payloadString,\s*PUSH_OPTIONS\s*\)/.test(s), 'options are the third argument');
});

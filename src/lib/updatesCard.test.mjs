// Unit tests for src/lib/updatesCard.ts (#260).
// Run with `npm run test` (node --test, Node's built-in TS type stripping).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickUpdatesCardEntry, updatesCardPreview, UPDATES_CARD_BULLETS } from './updatesCard.ts';
import { patchNotes } from './patch-notes.ts';
import { APP_VERSION } from './version.ts';

const entries = [{ version: '2' }, { version: '1' }];

test('pick: never seen shows the newest entry', () => {
  assert.equal(pickUpdatesCardEntry(null, '2', entries), entries[0]);
});

test('pick: older seen version shows the newest entry', () => {
  assert.equal(pickUpdatesCardEntry('1', '2', entries), entries[0]);
});

test('pick: same version seen shows nothing', () => {
  assert.equal(pickUpdatesCardEntry('2', '2', entries), null);
});

test('pick: empty list shows nothing', () => {
  assert.equal(pickUpdatesCardEntry(null, '2', []), null);
});

test('preview: 0, 1 and 2 bullets show all, no extras', () => {
  for (const n of [0, 1, 2]) {
    const h = Array.from({ length: n }, (_, i) => `b${i}`);
    const r = updatesCardPreview(h, UPDATES_CARD_BULLETS);
    assert.deepEqual(r.shown, h);
    assert.equal(r.moreCount, 0);
  }
});

test('preview: 3 and 5 bullets cap at 2 with +N more', () => {
  assert.deepEqual(updatesCardPreview(['a', 'b', 'c']), { shown: ['a', 'b'], moreCount: 1 });
  assert.deepEqual(updatesCardPreview(['a', 'b', 'c', 'd', 'e']), { shown: ['a', 'b'], moreCount: 3 });
});

test('preview: does not mutate the input', () => {
  const h = ['a', 'b', 'c'];
  updatesCardPreview(h);
  assert.deepEqual(h, ['a', 'b', 'c']);
});

test('guard: newest patch note matches APP_VERSION', () => {
  assert.equal(patchNotes[0].version, APP_VERSION);
});

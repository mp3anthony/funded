// Unit tests for src/lib/onboarding.ts (Setup hub helpers, R32 #419).
// Run with `npm run test` (node --test, Node's built-in TS type stripping).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUB_ROWS, emptyHubDone, markDone, rowDone } from './onboarding.ts';

test('hub has pay, bill, goal rows in order', () => {
  assert.deepEqual(HUB_ROWS.map((r) => r.key), ['pay', 'bill', 'goal']);
  assert.deepEqual(HUB_ROWS.map((r) => r.label), ['Add your pay', 'Add a bill', 'Add a goal']);
});

test('nothing is ticked at first', () => {
  const done = emptyHubDone();
  for (const r of HUB_ROWS) assert.equal(rowDone(done, r.key), false);
});

test('markDone ticks one row and leaves the others', () => {
  const done = markDone(emptyHubDone(), 'bill');
  assert.equal(rowDone(done, 'bill'), true);
  assert.equal(rowDone(done, 'pay'), false);
  assert.equal(rowDone(done, 'goal'), false);
});

test('markDone does not mutate and is idempotent', () => {
  const start = emptyHubDone();
  const once = markDone(start, 'pay');
  assert.equal(start.pay, false);
  assert.deepEqual(markDone(once, 'pay'), once);
});

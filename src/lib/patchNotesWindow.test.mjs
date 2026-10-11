// Unit tests for src/lib/patchNotesWindow.ts (#309).
// Run with `npm run test` (node --test, Node's built-in TS type stripping).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePatchNoteMonth, recentPatchNotes } from './patchNotesWindow.ts';
import { patchNotes } from './patch-notes.ts';

const e = (version, date) => ({ version, date });
const versions = (list) => list.map((x) => x.version);

test('parse: month value', () => {
  assert.equal(parsePatchNoteMonth('October 2026'), 2026 * 12 + 9);
  assert.equal(parsePatchNoteMonth('January 2027'), 2027 * 12);
});

test('parse: whitespace and case', () => {
  assert.equal(parsePatchNoteMonth('  october   2026 '), 2026 * 12 + 9);
  assert.equal(parsePatchNoteMonth('OCTOBER 2026'), 2026 * 12 + 9);
});

test('parse: Jan 2027 is one month after Dec 2026', () => {
  assert.equal(parsePatchNoteMonth('January 2027') - parsePatchNoteMonth('December 2026'), 1);
});

test('parse: invalid input returns null', () => {
  for (const bad of ['2026', 'October', 'Sept 2026', 'Smarch 2026', '', null, undefined, 42, {}]) {
    assert.equal(parsePatchNoteMonth(bad), null);
  }
});

test('months=2: newest month plus the one before', () => {
  const list = [e('4', 'October 2026'), e('3', 'October 2026'), e('2', 'September 2026'), e('1', 'August 2026')];
  assert.deepEqual(versions(recentPatchNotes(list, 2)), ['4', '3', '2']);
});

test('default window keeps only the newest month', () => {
  const list = [e('4', 'October 2026'), e('3', 'October 2026'), e('2', 'September 2026')];
  assert.deepEqual(versions(recentPatchNotes(list)), ['4', '3']);
});

test('single month', () => {
  const list = [e('2', 'October 2026'), e('1', 'October 2026')];
  assert.equal(recentPatchNotes(list).length, 2);
});

test('year boundary', () => {
  const list = [e('3', 'January 2027'), e('2', 'December 2026'), e('1', 'November 2026')];
  assert.deepEqual(versions(recentPatchNotes(list, 2)), ['3', '2']);
  assert.deepEqual(versions(recentPatchNotes(list)), ['3']);
});

test('out of order input still uses the max month', () => {
  const list = [e('1', 'August 2026'), e('3', 'October 2026'), e('2', 'September 2026')];
  assert.deepEqual(versions(recentPatchNotes(list)), ['3']);
});

test('unparseable date is kept', () => {
  const list = [e('3', 'October 2026'), e('2', 'Soon'), e('1', 'June 2026')];
  assert.deepEqual(versions(recentPatchNotes(list)), ['3', '2']);
});

test('all unparseable returns everything', () => {
  const list = [e('2', 'x'), e('1', 'y')];
  assert.deepEqual(recentPatchNotes(list), list);
});

test('empty list', () => {
  assert.deepEqual(recentPatchNotes([]), []);
});

test('gap months: window is calendar months, not months with entries', () => {
  const list = [e('2', 'October 2026'), e('1', 'July 2026')];
  assert.deepEqual(versions(recentPatchNotes(list)), ['2']);
});

test('months=1 keeps only the newest month', () => {
  const list = [e('2', 'October 2026'), e('1', 'September 2026')];
  assert.deepEqual(versions(recentPatchNotes(list, 1)), ['2']);
});

test('does not mutate the input', () => {
  const list = [e('2', 'October 2026'), e('1', 'June 2026')];
  const copy = JSON.parse(JSON.stringify(list));
  const out = recentPatchNotes(list);
  assert.deepEqual(list, copy);
  assert.notEqual(out, list);
});

test('real data: result is non-empty and keeps the newest entry first', () => {
  const result = recentPatchNotes(patchNotes);
  assert.ok(result.length > 0);
  assert.equal(result[0], patchNotes[0]);
});

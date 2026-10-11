// Unit tests for src/lib/householdTimezone.ts (#249).
// Run with `npm run test` (node --test, Node's built-in TS type stripping).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_HOUSEHOLD_TIMEZONE,
  isValidTimezone,
  resolveNewHouseholdTimezone,
} from './householdTimezone.ts';

test('isValidTimezone accepts real IANA zones', () => {
  for (const tz of ['Pacific/Auckland', 'Australia/Sydney', 'UTC']) {
    assert.equal(isValidTimezone(tz), true, tz);
  }
});

test('isValidTimezone rejects bad or non-string values', () => {
  for (const tz of ['', '   ', 'Not/AZone', 'Etc/Unknown', undefined, null, 42]) {
    assert.equal(isValidTimezone(tz), false, String(tz));
  }
});

test('resolveNewHouseholdTimezone passes through a valid device zone', () => {
  assert.equal(resolveNewHouseholdTimezone(() => 'Pacific/Auckland'), 'Pacific/Auckland');
  assert.equal(resolveNewHouseholdTimezone(() => 'America/New_York'), 'America/New_York');
});

test('resolveNewHouseholdTimezone falls back to Sydney on bad input', () => {
  assert.equal(DEFAULT_HOUSEHOLD_TIMEZONE, 'Australia/Sydney');
  assert.equal(resolveNewHouseholdTimezone(() => undefined), 'Australia/Sydney');
  assert.equal(resolveNewHouseholdTimezone(() => ''), 'Australia/Sydney');
  assert.equal(resolveNewHouseholdTimezone(() => 'Not/AZone'), 'Australia/Sydney');
  assert.equal(
    resolveNewHouseholdTimezone(() => {
      throw new Error('boom');
    }),
    'Australia/Sydney'
  );
});

test('resolveNewHouseholdTimezone with the real reader returns a valid zone', () => {
  const tz = resolveNewHouseholdTimezone();
  assert.ok(tz.length > 0);
  assert.equal(isValidTimezone(tz), true);
});

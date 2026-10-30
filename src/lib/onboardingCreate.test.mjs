// Unit tests for src/lib/onboardingCreate.ts (R31, #418).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HOUSEHOLD_NAME_MAX,
  DEFAULT_PAYMENT_MODE,
  PAYMENT_MODE_OPTIONS,
  isHouseholdNameValid,
  cleanHouseholdName,
  isJointFund,
  nextScreen,
  prevScreen,
  canContinue,
} from './onboardingCreate.ts';

test('name: blank is invalid, trimmed and capped when saved', () => {
  assert.equal(isHouseholdNameValid('   '), false);
  assert.equal(isHouseholdNameValid(' The Smiths '), true);
  assert.equal(cleanHouseholdName('  The Smiths  '), 'The Smiths');
  assert.equal(cleanHouseholdName('x'.repeat(100)).length, HOUSEHOLD_NAME_MAX);
});

test('payment mode: defaults to Direct Pay, Joint Fund maps to true', () => {
  assert.equal(DEFAULT_PAYMENT_MODE, 'direct');
  assert.equal(isJointFund('direct'), false);
  assert.equal(isJointFund('joint'), true);
  assert.deepEqual(PAYMENT_MODE_OPTIONS.map((o) => o.value), ['direct', 'joint']);
  for (const o of PAYMENT_MODE_OPTIONS) assert.ok(o.description.length > 20);
});

test('screens: name then mode; Back from name leaves the flow', () => {
  assert.equal(nextScreen('name'), 'mode');
  assert.equal(nextScreen('mode'), null);
  assert.equal(prevScreen('mode'), 'name');
  assert.equal(prevScreen('name'), null);
});

test('canContinue: name needs text, nothing while creating', () => {
  assert.equal(canContinue('name', { name: '', creating: false }), false);
  assert.equal(canContinue('name', { name: 'Home', creating: false }), true);
  assert.equal(canContinue('mode', { name: '', creating: false }), true);
  assert.equal(canContinue('mode', { name: 'Home', creating: true }), false);
});

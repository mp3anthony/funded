// Unit tests for src/lib/onboardingJoin.ts (R33, #420).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  JOIN_CODE_LENGTH,
  sanitizeCode,
  formatCode,
  canJoin,
  joinErrorMessage,
} from './onboardingJoin.ts';

test('sanitizeCode: strips non-alphanumerics, upper-cases, caps at 8', () => {
  assert.equal(JOIN_CODE_LENGTH, 8);
  assert.equal(sanitizeCode('abc-123'), 'ABC123');
  assert.equal(sanitizeCode(' a b!c 1234567'), 'ABC12345');
  assert.equal(sanitizeCode(''), '');
});

test('formatCode: dash after the third character', () => {
  assert.equal(formatCode(''), '');
  assert.equal(formatCode('ABC'), 'ABC');
  assert.equal(formatCode('ABCD'), 'ABC-D');
  assert.equal(formatCode('ABC123'), 'ABC-123');
});

test('canJoin: needs a full code and no join running', () => {
  assert.equal(canJoin('ABC12', false), false);
  assert.equal(canJoin('ABCD1234', false), true);
  assert.equal(canJoin('ABC123', false), true);
  assert.equal(canJoin('ABC123', true), false);
});

test('joinErrorMessage: maps known failures to plain wording', () => {
  const didntWork = "That code didn't work. Check it with the owner.";
  assert.equal(joinErrorMessage(new Error('Invalid code')), didntWork);
  assert.equal(joinErrorMessage(new Error('This code has EXPIRED')), didntWork);
  assert.equal(joinErrorMessage(new Error('You are already a member of this household')), "You're already in this household.");
});

test('joinErrorMessage: keeps other messages, falls back when empty', () => {
  const guard = 'You already belong to a household, so we\'ve reopened it instead of joining a new one.';
  assert.equal(joinErrorMessage(new Error(guard)), guard);
  assert.equal(joinErrorMessage(new Error('Something odd')), 'Something odd');
  const generic = "Couldn't join right now. Please check your connection and try again.";
  assert.equal(joinErrorMessage(new Error('')), generic);
  assert.equal(joinErrorMessage(undefined), generic);
});

// Unit tests for src/lib/onboarding.ts (#248).
// Run with `npm run test` (node --test, Node's built-in TS type stripping).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TOTAL_STEPS,
  SKIPPABLE_STEPS,
  isPaydayValid,
  isBillValid,
  isGoalValid,
  footerFor,
  summaryCell,
} from './onboarding.ts';

test('wizard has 6 steps and skips payday, bill, goal', () => {
  assert.equal(TOTAL_STEPS, 6);
  assert.deepEqual([...SKIPPABLE_STEPS], [3, 4, 5]);
});

test('payday: date required', () => {
  assert.equal(isPaydayValid({ date: '', isFixed: false, amount: '' }), false);
});

test('payday: variable pay needs no amount', () => {
  assert.equal(isPaydayValid({ date: '2026-10-20', isFixed: false, amount: '' }), true);
});

test('payday: fixed pay needs an amount above zero', () => {
  assert.equal(isPaydayValid({ date: '2026-10-20', isFixed: true, amount: '' }), false);
  assert.equal(isPaydayValid({ date: '2026-10-20', isFixed: true, amount: '0' }), false);
  assert.equal(isPaydayValid({ date: '2026-10-20', isFixed: true, amount: '-5' }), false);
  assert.equal(isPaydayValid({ date: '2026-10-20', isFixed: true, amount: 'abc' }), false);
  assert.equal(isPaydayValid({ date: '2026-10-20', isFixed: true, amount: '2500' }), true);
});

test('bill: name, amount above zero and due date all required', () => {
  const ok = { name: 'Rent', amount: '300', dueDate: '2026-11-01' };
  assert.equal(isBillValid(ok), true);
  assert.equal(isBillValid({ ...ok, name: '   ' }), false);
  assert.equal(isBillValid({ ...ok, amount: '' }), false);
  assert.equal(isBillValid({ ...ok, amount: '0' }), false);
  assert.equal(isBillValid({ ...ok, dueDate: '' }), false);
});

test('goal: name and target above zero', () => {
  assert.equal(isGoalValid({ name: 'Holiday', target: '1000' }), true);
  assert.equal(isGoalValid({ name: ' ', target: '1000' }), false);
  assert.equal(isGoalValid({ name: 'Holiday', target: '0' }), false);
  assert.equal(isGoalValid({ name: 'Holiday', target: '' }), false);
});

test('footer: no Back on step 1, no Skip on required steps', () => {
  assert.equal(footerFor(1, { saved: false }).showBack, false);
  assert.equal(footerFor(1, { saved: false }).showSkip, false);
  assert.equal(footerFor(2, { saved: false }).showBack, true);
  assert.equal(footerFor(2, { saved: false }).showSkip, false);
});

test('footer: Skip only on unsaved steps 3 to 5', () => {
  for (const step of [3, 4, 5]) {
    assert.equal(footerFor(step, { saved: false }).showSkip, true);
    assert.equal(footerFor(step, { saved: true }).showSkip, false);
    assert.equal(footerFor(step, { saved: false }).primary, 'next');
  }
});

test('footer: step 6 is Enter App with no Back or Skip', () => {
  assert.deepEqual(footerFor(6, { saved: true }), { showBack: false, showSkip: false, primary: 'enter' });
});

test('summary cell: skipped, variable, amount', () => {
  assert.deepEqual(summaryCell(null), { kind: 'skipped' });
  assert.deepEqual(summaryCell({ isFixed: false, amount: 0 }), { kind: 'variable' });
  assert.deepEqual(summaryCell({ isFixed: true, amount: 2500 }), { kind: 'amount', amount: 2500 });
  assert.deepEqual(summaryCell({ amount: 40 }), { kind: 'amount', amount: 40 });
});

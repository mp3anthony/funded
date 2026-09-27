// Unit tests for src/lib/billCycle.ts (Slice 17, #187).
// Run with `npm run test` (node --test, Node's built-in TS type stripping).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addCycles, computeRollover, UNPAID_STATUS } from './billCycle.ts';

test('weekly/fortnightly across month and year end', () => {
  assert.equal(addCycles('2026-01-28', 'weekly', 1), '2026-02-04');
  assert.equal(addCycles('2026-12-29', 'weekly', 1), '2027-01-05');
  assert.equal(addCycles('2026-12-25', 'fortnightly', 1), '2027-01-08');
  assert.equal(addCycles('2026-02-20', 'fortnightly', 1), '2026-03-06');
  assert.equal(addCycles('2026-01-01', 'weekly', 3), '2026-01-22');
});

test('weekly/fortnightly across Sydney DST weekends (no day drift)', () => {
  // DST ends Sun 5 Apr 2026, starts Sun 4 Oct 2026 in Australia/Sydney.
  assert.equal(addCycles('2026-04-03', 'weekly', 1), '2026-04-10');
  assert.equal(addCycles('2026-04-04', 'fortnightly', 1), '2026-04-18');
  assert.equal(addCycles('2026-10-02', 'weekly', 1), '2026-10-09');
  assert.equal(addCycles('2026-10-03', 'fortnightly', 1), '2026-10-17');
});

test('monthly clamps to month end from the base date', () => {
  assert.equal(addCycles('2026-01-31', 'monthly', 1), '2026-02-28');
  assert.equal(addCycles('2028-01-31', 'monthly', 1), '2028-02-29');
  assert.equal(addCycles('2026-01-31', 'monthly', 2), '2026-03-31');
  assert.equal(addCycles('2026-03-31', 'monthly', 1), '2026-04-30');
  assert.equal(addCycles('2026-12-15', 'monthly', 1), '2027-01-15');
});

test('yearly clamps Feb 29', () => {
  assert.equal(addCycles('2028-02-29', 'yearly', 1), '2029-02-28');
  assert.equal(addCycles('2028-02-29', 'yearly', 4), '2032-02-29');
});

test('unknown / mixed-case frequency behaves as monthly', () => {
  assert.equal(addCycles('2026-01-31', 'quarterly', 1), '2026-02-28');
  assert.equal(addCycles('2026-01-31', undefined, 1), '2026-02-28');
  assert.equal(addCycles('2026-01-31', 'Monthly', 1), '2026-02-28');
  assert.equal(addCycles('2026-01-01', 'Weekly', 1), '2026-01-08');
  assert.equal(addCycles('2026-01-01', 'FORTNIGHTLY', 1), '2026-01-15');
  assert.equal(addCycles('2028-02-29', 'Yearly', 1), '2029-02-28');
});

const base = {
  status: 'Paid',
  is_recurring: true,
  is_paused: false,
  due_date: '2026-09-27',
  invoice_date: '2026-09-13',
  frequency: 'monthly',
  payment_type: 'manual',
};

test('computeRollover returns null when it should not roll', () => {
  assert.equal(computeRollover({ ...base, status: 'Due Soon' }, '2026-09-27'), null);
  assert.equal(computeRollover({ ...base, status: 'Overdue' }, '2026-09-27'), null);
  assert.equal(computeRollover({ ...base, due_date: '2026-09-28' }, '2026-09-27'), null);
  assert.equal(computeRollover({ ...base, is_recurring: false }, '2026-09-27'), null);
  assert.equal(computeRollover({ ...base, is_paused: true }, '2026-09-27'), null);
  assert.equal(computeRollover({ ...base, due_date: null }, '2026-09-27'), null);
});

test('computeRollover rolls on the due date, invoice in lockstep', () => {
  assert.deepEqual(computeRollover(base, '2026-09-27'), {
    status: UNPAID_STATUS,
    due_date: '2026-10-27',
    invoice_date: '2026-10-13',
  });
});

test('computeRollover rolls only +1 cycle when far past due', () => {
  assert.deepEqual(computeRollover({ ...base, due_date: '2026-01-31', invoice_date: null }, '2026-09-27'), {
    status: UNPAID_STATUS,
    due_date: '2026-02-28',
    invoice_date: null,
  });
});

test('computeRollover: missing is_recurring counts as recurring; weekly lockstep', () => {
  const { is_recurring: _omit, ...rest } = base;
  void _omit;
  assert.deepEqual(computeRollover({ ...rest, frequency: 'weekly' }, '2026-09-30'), {
    status: UNPAID_STATUS,
    due_date: '2026-10-04',
    invoice_date: '2026-09-20',
  });
});

test('computeRollover: autopay only resets status', () => {
  assert.deepEqual(computeRollover({ ...base, payment_type: 'Auto' }, '2026-09-27'), { status: UNPAID_STATUS });
  assert.deepEqual(computeRollover({ ...base, payment_type: 'auto', due_date: '2026-01-01' }, '2026-09-27'), {
    status: UNPAID_STATUS,
  });
});

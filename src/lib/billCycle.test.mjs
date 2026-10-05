// Unit tests for src/lib/billCycle.ts (Slice 17, #187).
// Run with `npm run test` (node --test, Node's built-in TS type stripping).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addCycles,
  computeRollover,
  computePaidRoll,
  computeUndoPaidRoll,
  canUndoPayment,
  computeUndoPayment,
  paidForLabel,
  billSendsReminders,
  pausedFieldForEdit,
  computeResumeRoll,
  oldCycleNotificationKeyPrefix,
  paidRollToastMessage,
  sameDueDate,
  UNPAID_STATUS,
} from './billCycle.ts';

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
    last_paid_for: '2026-09-27',
  });
});

test('computeRollover rolls only +1 cycle when far past due', () => {
  assert.deepEqual(computeRollover({ ...base, due_date: '2026-01-31', invoice_date: null }, '2026-09-27'), {
    status: UNPAID_STATUS,
    due_date: '2026-02-28',
    invoice_date: null,
    last_paid_for: '2026-01-31',
  });
});

test('computeRollover: missing is_recurring counts as recurring; weekly lockstep', () => {
  const { is_recurring: _omit, ...rest } = base;
  void _omit;
  assert.deepEqual(computeRollover({ ...rest, frequency: 'weekly' }, '2026-09-30'), {
    status: UNPAID_STATUS,
    due_date: '2026-10-04',
    invoice_date: '2026-09-20',
    last_paid_for: '2026-09-27',
  });
});

test('computeRollover: autopay only resets status', () => {
  assert.deepEqual(computeRollover({ ...base, payment_type: 'Auto' }, '2026-09-27'), { status: UNPAID_STATUS });
  assert.deepEqual(computeRollover({ ...base, payment_type: 'auto', due_date: '2026-01-01' }, '2026-09-27'), {
    status: UNPAID_STATUS,
  });
});

/* ── #205 instant roll at Mark-as-Paid time ───────────────────────────── */

const unpaid = { ...base, status: 'Due Soon', due_date: '2026-09-27', invoice_date: '2026-09-13' };

test('computePaidRoll rolls when due today or earlier, whatever the current unpaid status', () => {
  const expected = { status: UNPAID_STATUS, due_date: '2026-10-27', invoice_date: '2026-10-13', last_paid_for: '2026-09-27' };
  assert.deepEqual(computePaidRoll(unpaid, '2026-09-27'), expected); // due today
  assert.deepEqual(computePaidRoll(unpaid, '2026-09-28'), expected); // overdue by a day
  assert.deepEqual(computePaidRoll({ ...unpaid, status: 'Overdue' }, '2026-09-28'), expected);
  assert.deepEqual(computePaidRoll({ ...unpaid, status: null }, '2026-09-28'), expected);
});

test('computePaidRoll: household-tz today decides (due date = tomorrow there → no roll)', () => {
  // Device might already be on the 27th, but the household's today is the 26th.
  assert.equal(computePaidRoll(unpaid, '2026-09-26'), null);
});

test('computePaidRoll returns null for early pay, one-off, paused, autopay, no date', () => {
  assert.equal(computePaidRoll({ ...unpaid, due_date: '2026-10-02' }, '2026-09-27'), null);
  assert.equal(computePaidRoll({ ...unpaid, is_recurring: false }, '2026-09-28'), null);
  assert.equal(computePaidRoll({ ...unpaid, is_paused: true }, '2026-09-28'), null);
  assert.equal(computePaidRoll({ ...unpaid, payment_type: 'Auto' }, '2026-09-28'), null);
  assert.equal(computePaidRoll({ ...unpaid, due_date: null }, '2026-09-28'), null);
});

test('computePaidRoll: only +1 cycle and month-end clamp', () => {
  assert.deepEqual(computePaidRoll({ ...unpaid, due_date: '2026-01-31', invoice_date: null }, '2026-09-27'), {
    status: UNPAID_STATUS,
    due_date: '2026-02-28',
    invoice_date: null,
    last_paid_for: '2026-01-31',
  });
});

test('computeUndoPaidRoll restores the exact pre-tap row (no reverse-clamp drift)', () => {
  // Jan 31 → Feb 28 on roll; Undo must give back Jan 31, not Jan 28.
  assert.deepEqual(
    computeUndoPaidRoll({ ...unpaid, status: 'Due Soon', due_date: '2026-01-31', invoice_date: '2026-01-17' }),
    { status: 'Due Soon', due_date: '2026-01-31', invoice_date: '2026-01-17', last_paid_for: null }
  );
  // last_paid_for goes back to its pre-tap value exactly.
  assert.equal(computeUndoPaidRoll({ ...unpaid, last_paid_for: '2026-08-27' }).last_paid_for, '2026-08-27');
  assert.equal(computeUndoPaidRoll({ ...unpaid, last_paid_for: undefined }).last_paid_for, null);
  assert.deepEqual(computeUndoPaidRoll({ ...unpaid, invoice_date: undefined }), {
    status: 'Due Soon',
    due_date: '2026-09-27',
    invoice_date: null,
    last_paid_for: null,
  });
  // Never restore 'Paid' on a due/past date — the cron would just roll it again.
  assert.equal(computeUndoPaidRoll({ ...unpaid, status: 'Paid' }).status, UNPAID_STATUS);
  assert.equal(computeUndoPaidRoll({ ...unpaid, status: null }).status, UNPAID_STATUS);
  assert.equal(computeUndoPaidRoll({ ...unpaid, due_date: null }), null);
});

test('paidRollToastMessage names the paid month and the next due date', () => {
  assert.equal(paidRollToastMessage('2026-09-27', '2026-10-27'), 'Paid for September — next due October 27');
  assert.equal(paidRollToastMessage('2026-09-05', '2026-10-05'), 'Paid for September — next due October 5');
  assert.equal(paidRollToastMessage('2026-12-30', '2027-01-06'), 'Paid for December — next due January 6, 2027');
  assert.equal(paidRollToastMessage('bad', '2026-10-27'), 'Marked as paid');
});

test('sameDueDate compares the calendar day only', () => {
  assert.equal(sameDueDate('2026-09-27', '2026-09-27'), true);
  assert.equal(sameDueDate('2026-09-27T00:00:00+00:00', '2026-09-27'), true);
  assert.equal(sameDueDate('2026-10-27', '2026-09-27'), false);
  assert.equal(sameDueDate(null, undefined), true);
  assert.equal(sameDueDate('2026-09-27', null), false);
});

test('oldCycleNotificationKeyPrefix matches only that cycle\'s reminder keys', () => {
  const prefix = oldCycleNotificationKeyPrefix('abc-1', '2026-09-27');
  assert.equal(prefix, 'abc-1-2026-09-27-');
  // Key shapes from generateReminders.ts:
  assert.ok('abc-1-2026-09-27-manual_bill'.startsWith(prefix));
  assert.ok('abc-1-2026-09-27-manual_bill-overdue-2026-09-28'.startsWith(prefix));
  // Next cycle's reminders are not touched.
  assert.ok(!'abc-1-2026-10-27-manual_bill'.startsWith(prefix));
  assert.equal(oldCycleNotificationKeyPrefix(42, '2026-09-27T00:00:00'), '42-2026-09-27-');
});

/* ── #211 last paid record and Undo payment ───────────────────────────── */

const rolled = {
  ...base,
  status: 'Due Soon',
  due_date: '2026-10-27',
  invoice_date: '2026-10-13',
  last_paid_for: '2026-09-27',
};

test('canUndoPayment true for a rolled manual monthly bill, incl. month-end', () => {
  assert.equal(canUndoPayment(rolled), true);
  assert.equal(canUndoPayment({ ...rolled, status: 'Overdue' }), true);
  assert.equal(
    canUndoPayment({ ...rolled, last_paid_for: '2026-01-31', due_date: '2026-02-28' }),
    true
  );
});

test('canUndoPayment false when ineligible', () => {
  assert.equal(canUndoPayment({ ...rolled, last_paid_for: null }), false);
  assert.equal(canUndoPayment({ ...rolled, last_paid_for: 'bad' }), false);
  assert.equal(canUndoPayment({ ...rolled, payment_type: 'Auto' }), false);
  assert.equal(canUndoPayment({ ...rolled, is_recurring: false }), false);
  assert.equal(canUndoPayment({ ...rolled, is_paused: true }), false);
  assert.equal(canUndoPayment({ ...rolled, status: 'Paid' }), false);
  assert.equal(canUndoPayment({ ...rolled, due_date: '2026-10-28' }), false); // edited away
  assert.equal(canUndoPayment({ ...rolled, frequency: 'weekly' }), false); // frequency changed
  assert.equal(canUndoPayment({ ...rolled, due_date: null }), false);
});

test('computeUndoPayment restores the paid cycle exactly', () => {
  assert.deepEqual(computeUndoPayment(rolled), {
    status: UNPAID_STATUS,
    due_date: '2026-09-27',
    invoice_date: '2026-09-13',
    last_paid_for: null,
  });
  // Jan 31 stays Jan 31 (no reverse-clamp drift from Feb 28).
  assert.equal(
    computeUndoPayment({ ...rolled, last_paid_for: '2026-01-31', due_date: '2026-02-28' }).due_date,
    '2026-01-31'
  );
  assert.equal(computeUndoPayment({ ...rolled, invoice_date: null }).invoice_date, null);
  assert.equal(computeUndoPayment({ ...rolled, last_paid_for: null }), null);
  assert.equal(computeUndoPayment({ ...rolled, is_paused: true }), null);
});

test('paidForLabel adds the year only when it is not the current year', () => {
  assert.equal(paidForLabel('2026-09-27', '2026-10-02'), 'Paid for September');
  assert.equal(paidForLabel('2025-12-30', '2026-10-02'), 'Paid for December 2025');
  assert.equal(paidForLabel('2026-12-30', '2027-01-03'), 'Paid for December 2026');
  assert.equal(paidForLabel('2026-09-27T00:00:00+00:00', '2026-10-02'), 'Paid for September');
  assert.equal(paidForLabel(null, '2026-10-02'), null);
  assert.equal(paidForLabel(undefined, '2026-10-02'), null);
  assert.equal(paidForLabel('bad', '2026-10-02'), null);
});

/* ── Paused bills (#201) ── */

test('billSendsReminders', () => {
  assert.equal(billSendsReminders({ is_paused: true }), false);
  assert.equal(billSendsReminders({ status: 'Paused' }), false);
  assert.equal(billSendsReminders({ is_paused: false, status: 'Due Soon' }), true);
  assert.equal(billSendsReminders({}), true);
});

test('pausedFieldForEdit only passes real booleans', () => {
  assert.deepEqual(pausedFieldForEdit({}), {});
  assert.deepEqual(pausedFieldForEdit({ is_paused: true }), { is_paused: true });
  assert.deepEqual(pausedFieldForEdit({ is_paused: false }), { is_paused: false });
  assert.deepEqual(pausedFieldForEdit({ is_paused: 'yes' }), {});
  assert.deepEqual(pausedFieldForEdit({ is_paused: undefined }), {});
});

const RT = '2026-10-05';
const pausedBill = {
  status: 'Due Soon', is_recurring: true, is_paused: true, frequency: 'monthly',
  payment_type: 'manual', due_date: '2026-08-03', invoice_date: '2026-07-20',
};

test('computeResumeRoll unpaid past due skips missed cycles', () => {
  const p = computeResumeRoll(pausedBill, RT);
  assert.equal(p.due_date, '2026-11-03');
  assert.equal(p.invoice_date, '2026-10-20');
  assert.equal(p.status, 'Due Soon');
  assert.equal('last_paid_for' in p, false);
});

test('computeResumeRoll unpaid due today or future is null', () => {
  assert.equal(computeResumeRoll({ ...pausedBill, due_date: RT }, RT), null);
  assert.equal(computeResumeRoll({ ...pausedBill, due_date: '2026-10-20' }, RT), null);
});

test('computeResumeRoll Paid bills record last_paid_for', () => {
  const paid = { ...pausedBill, status: 'Paid' };
  const p = computeResumeRoll(paid, RT);
  assert.equal(p.due_date, '2026-11-03');
  assert.equal(p.last_paid_for, '2026-08-03');
  assert.equal(canUndoPayment({ ...paid, ...p, is_paused: false }), false);

  const p2 = computeResumeRoll({ ...paid, due_date: '2026-09-30', invoice_date: '2026-09-16' }, RT);
  assert.equal(p2.due_date, '2026-10-30');
  assert.equal(p2.last_paid_for, '2026-09-30');
  assert.equal(
    canUndoPayment({ ...paid, due_date: '2026-09-30', ...p2, is_paused: false }),
    true,
  );

  assert.equal(computeResumeRoll({ ...paid, due_date: RT }, RT).due_date, '2026-11-05');
  assert.equal(computeResumeRoll({ ...paid, due_date: '2026-10-20' }, RT), null);
});

test('computeResumeRoll counts from the base date', () => {
  assert.equal(
    computeResumeRoll({ ...pausedBill, due_date: '2026-01-31', invoice_date: null }, '2026-04-15').due_date,
    '2026-04-30',
  );
  assert.equal(computeResumeRoll({ ...pausedBill, frequency: 'weekly', due_date: '2026-09-01' }, RT).due_date, '2026-10-06');
  assert.equal(computeResumeRoll({ ...pausedBill, frequency: 'fortnightly', due_date: '2026-09-01' }, RT).due_date, '2026-10-13');
});

test('computeResumeRoll edge cases', () => {
  assert.equal(computeResumeRoll({ ...pausedBill, is_recurring: false }, RT), null);
  assert.equal(computeResumeRoll({ ...pausedBill, due_date: null }, RT), null);
  assert.equal(computeResumeRoll({ ...pausedBill, due_date: 'bad' }, RT), null);
  assert.deepEqual(computeResumeRoll({ ...pausedBill, payment_type: 'Auto', status: 'Paid' }, RT), { status: 'Due Soon' });
  assert.equal(computeResumeRoll({ ...pausedBill, payment_type: 'Auto' }, RT), null);
  const p = computeResumeRoll({ ...pausedBill, last_paid_for: '2026-07-03' }, RT);
  assert.equal('last_paid_for' in p, false);
});

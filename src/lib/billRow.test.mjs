// Unit tests for src/lib/billRow.ts (R15, #402).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayDiff, dueCountdown, showTick, compareRows, categorySubtotal } from './billRow.ts';

const TODAY = '2026-10-24';
const bill = (o = {}) => ({ id: 1, name: 'Rent', amount: 100, status: 'Unpaid', payment_type: 'manual', due_date: '2026-10-30', ...o });

test('dayDiff counts whole days across months and leap days', () => {
  assert.equal(dayDiff('2026-10-24', '2026-10-24'), 0);
  assert.equal(dayDiff('2026-10-31', '2026-11-01'), 1);
  assert.equal(dayDiff('2028-02-28', '2028-03-01'), 2);
  assert.equal(dayDiff('2026-10-24', '2026-10-20'), -4);
});

test('countdown wording for future, today, tomorrow and overdue', () => {
  assert.deepEqual(dueCountdown(bill({ due_date: '2026-10-24' }), TODAY), { text: 'Due today', tone: 'neutral' });
  assert.deepEqual(dueCountdown(bill({ due_date: '2026-10-25' }), TODAY), { text: 'Due tomorrow', tone: 'neutral' });
  assert.deepEqual(dueCountdown(bill({ due_date: '2026-10-27' }), TODAY), { text: 'Due in 3 days', tone: 'neutral' });
  assert.deepEqual(dueCountdown(bill({ due_date: '2026-10-23' }), TODAY), { text: '1 day overdue', tone: 'overdue' });
  assert.deepEqual(dueCountdown(bill({ due_date: '2026-10-20' }), TODAY), { text: '4 days overdue', tone: 'overdue' });
});

test('Paid beats overdue; dateless Paid says so', () => {
  assert.deepEqual(dueCountdown(bill({ status: 'Paid', due_date: '2026-10-01' }), TODAY), { text: 'Paid', tone: 'paid' });
  assert.deepEqual(dueCountdown(bill({ status: 'Paid', due_date: null }), TODAY, 'paid-no-due-date'), { text: 'Paid · no due date', tone: 'paid' });
});

test('labels win, dateless is muted', () => {
  assert.deepEqual(dueCountdown(bill({ dueLabel: 'Paused', status: 'Paid' }), TODAY), { text: 'Paused', tone: 'muted' });
  assert.deepEqual(dueCountdown(bill({ dueLabel: 'One-off' }), TODAY), { text: 'One-off', tone: 'muted' });
  assert.deepEqual(dueCountdown(bill({ due_date: null }), TODAY, 'add-due-date'), { text: 'No due date', tone: 'muted' });
  assert.deepEqual(dueCountdown(bill({ due_date: '' }), TODAY), { text: 'No due date', tone: 'muted' });
});

test('autopay uses the same countdown', () => {
  assert.equal(dueCountdown(bill({ payment_type: 'auto', due_date: '2026-10-26' }), TODAY).text, 'Due in 2 days');
});

test('showTick only for unpaid, unpaused, unlabelled manual bills', () => {
  assert.equal(showTick(bill()), true);
  assert.equal(showTick(bill({ status: 'Overdue' })), true);
  assert.equal(showTick(bill({ status: 'Paid' })), false);
  assert.equal(showTick(bill({ payment_type: 'auto' })), false);
  assert.equal(showTick(bill({ payment_type: 'AUTO' })), false);
  assert.equal(showTick(bill({ is_paused: true })), false);
  assert.equal(showTick(bill({ dueLabel: 'One-off' })), false);
});

test('compareRows: name, then bill before expense, then id', () => {
  const r = (kind, id, name) => ({ kind, item: { id, name } });
  const rows = [r('expense', 2, 'rent'), r('bill', 9, 'Rent'), r('bill', 3, 'Power'), r('bill', 10, 'Rent'), r('expense', 1, 'Aaa')];
  rows.sort(compareRows);
  assert.deepEqual(rows.map((x) => x.kind + x.item.id), ['expense1', 'bill3', 'bill9', 'bill10', 'expense2']);
});

test('categorySubtotal converts bills and weekly expenses, skipping uncounted bills', () => {
  const convert = (amt, from, to) => (from === to ? amt : amt * (from === 'weekly' ? 2 : 0.5));
  const countsTowardTotals = (b) => b.is_paused !== true && !b.dueLabel;
  const rows = [
    { kind: 'bill', item: { amount: 100, frequency: 'monthly' } },
    { kind: 'bill', item: { amount: 50, frequency: 'monthly', is_paused: true } },
    { kind: 'bill', item: { amount: 70, frequency: 'monthly', dueLabel: 'One-off' } },
    { kind: 'expense', item: { amount: 10 } },
  ];
  assert.equal(categorySubtotal(rows, 'yearly', { convert, countsTowardTotals }), 50 + 20);
  assert.equal(categorySubtotal([], 'weekly', { convert, countsTowardTotals }), 0);
});

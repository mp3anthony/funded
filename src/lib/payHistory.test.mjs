// Unit tests for src/lib/payHistory.ts (R19, #406).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  averagePay, latestLoggedAmount, buildPendingPayRows, lodgePaymentDedupeKey,
  pendingPayPhrase, isPendingPay, AVERAGE_PAY_WINDOW, AVERAGE_PAY_MIN_CONFIRMED,
} from './payHistory.ts';

const row = (o = {}) => ({
  id: 'h1', pay_schedule_id: 's1', pay_date: '2026-10-01', created_at: '2026-10-01T00:00:00Z',
  amount: 100, status: 'confirmed', ...o,
});

test('constants', () => {
  assert.equal(AVERAGE_PAY_WINDOW, 4);
  assert.equal(AVERAGE_PAY_MIN_CONFIRMED, 2);
});

test('isPendingPay', () => {
  assert.equal(isPendingPay({ status: 'pending' }), true);
  assert.equal(isPendingPay({ status: 'confirmed' }), false);
  assert.equal(isPendingPay({}), false);
});

test('averagePay needs at least 2 confirmed pays', () => {
  assert.equal(averagePay('s1', []), null);
  assert.equal(averagePay('s1', [row()]), null);
  assert.equal(averagePay('s1', [row({ amount: 100 }), row({ pay_date: '2026-10-08', amount: 200 })]), 150);
});

test('averagePay uses only the newest 4 confirmed pays', () => {
  const h = [
    row({ pay_date: '2026-09-01', amount: 1000 }),
    row({ pay_date: '2026-09-08', amount: 100 }),
    row({ pay_date: '2026-09-15', amount: 200 }),
    row({ pay_date: '2026-09-22', amount: 300 }),
    row({ pay_date: '2026-09-29', amount: 400 }),
  ];
  assert.equal(averagePay('s1', h), 250);
});

test('averagePay ignores Pending, null amounts and other schedules; null status counts as confirmed', () => {
  const h = [
    row({ pay_date: '2026-10-01', amount: 100 }),
    row({ pay_date: '2026-10-08', amount: 300, status: null }),
    row({ pay_date: '2026-10-15', amount: null, status: 'pending' }),
    row({ pay_date: '2026-10-16', amount: 999, status: 'pending' }),
    row({ pay_date: '2026-10-17', amount: 5000, pay_schedule_id: 's2' }),
  ];
  assert.equal(averagePay('s1', h), 200);
});

test('averagePay does not depend on fetch order and matches ids as strings', () => {
  const a = row({ pay_date: '2026-10-01', amount: 100, pay_schedule_id: 7 });
  const b = row({ pay_date: '2026-10-08', amount: 300, pay_schedule_id: 7 });
  assert.equal(averagePay('7', [a, b]), 200);
  assert.equal(averagePay(7, [b, a]), 200);
});

test('latestLoggedAmount is the newest row with an amount, ties broken by created_at', () => {
  assert.equal(latestLoggedAmount('s1', []), null);
  const h = [
    row({ pay_date: '2026-10-01', amount: 100 }),
    row({ pay_date: '2026-10-08', amount: 250, created_at: '2026-10-08T01:00:00Z' }),
    row({ pay_date: '2026-10-08', amount: 275, created_at: '2026-10-08T05:00:00Z' }),
    row({ pay_date: '2026-10-15', amount: null, status: 'pending' }),
  ];
  assert.equal(latestLoggedAmount('s1', h), 275);
  assert.equal(latestLoggedAmount('s1', [...h].reverse()), 275);
  assert.equal(latestLoggedAmount('other', h), null);
});

test('buildPendingPayRows: fixed schedule keeps its amount, variable gets null', () => {
  const fixed = { id: 's1', member_id: 'm1', is_fixed_amount: true, amount: 1200 };
  const rows = buildPendingPayRows(fixed, ['2026-10-01', '2026-10-08'], 'hh1');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    household_id: 'hh1', member_id: 'm1', pay_schedule_id: 's1', amount: 1200,
    pay_date: '2026-10-01', notes: 'Automatically logged missed pay', status: 'pending',
  });
  const variable = { id: 's2', member_id: 'm1', is_fixed_amount: false, amount: null };
  const v = buildPendingPayRows(variable, ['2026-10-01'], 'hh1');
  assert.equal(v[0].amount, null);
  assert.equal(v[0].notes, 'Automatically logged missed pay — amount needs review');
  const zero = buildPendingPayRows({ ...fixed, amount: 0 }, ['2026-10-01'], 'hh1');
  assert.equal(zero[0].amount, null);
  assert.deepEqual(buildPendingPayRows(fixed, [], 'hh1'), []);
});

test('lodgePaymentDedupeKey is per pay per day', () => {
  assert.equal(lodgePaymentDedupeKey('abc', '2026-10-24'), 'abc-lodge_payment-2026-10-24');
  assert.notEqual(lodgePaymentDedupeKey('abc', '2026-10-24'), lodgePaymentDedupeKey('abc', '2026-10-25'));
});

test('pendingPayPhrase buckets', () => {
  const today = '2026-10-24'; // a Saturday
  assert.equal(pendingPayPhrase('2026-10-24', today), "today's pay");
  assert.equal(pendingPayPhrase('2026-10-23', today), "yesterday's pay");
  assert.equal(pendingPayPhrase('2026-10-22', today), "Thursday's pay");
  assert.equal(pendingPayPhrase('2026-10-18', today), "Sunday's pay");
  assert.equal(pendingPayPhrase('2026-10-17', today), "last week's pay");
  assert.equal(pendingPayPhrase('2026-10-11', today), "last week's pay");
  assert.equal(pendingPayPhrase('2026-10-10', today), 'your pay from 10 Oct');
  assert.equal(pendingPayPhrase('2026-10-04', today), 'your pay from 4 Oct');
  assert.equal(pendingPayPhrase('2026-10-25', today), 'your pay');
  assert.equal(pendingPayPhrase('nonsense', today), 'your pay');
  assert.equal(pendingPayPhrase('2026-10-04', 'nope'), 'your pay');
});

test('latestLoggedAmount ignores Pending rows and $0 rows (F01)', () => {
  const h = [
    row({ pay_date: '2026-10-01', amount: 900 }),
    row({ pay_date: '2026-10-08', amount: 0 }),
    row({ pay_date: '2026-10-15', amount: 500, status: 'pending' }),
  ];
  assert.equal(latestLoggedAmount('s1', h), 900);
  assert.equal(latestLoggedAmount('s1', [row({ amount: 0 }), row({ amount: 40, status: 'pending' })]), null);
});

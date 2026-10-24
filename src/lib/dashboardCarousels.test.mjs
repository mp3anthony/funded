// Unit tests for src/lib/dashboardCarousels.ts (R27, #414).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dashboardBills, dashboardGoals } from './dashboardCarousels.ts';
import { savingGoals, isReached, sortByProgress, weeklyFromRules } from './goalPace.ts';

const TODAY = '2026-10-24';
const bill = (o = {}) => ({ id: 1, name: 'Rent', status: 'Unpaid', payment_type: 'manual', due_date: '2026-10-30', ...o });

test('bills: auto-pay, paused (#359), labelled and paid bills are left out', () => {
  const list = [
    bill({ id: 1 }),
    bill({ id: 2, payment_type: 'auto' }),
    bill({ id: 3, is_paused: true }),
    bill({ id: 4, dueLabel: 'One-off' }),
    bill({ id: 5, status: 'Paid' }),
  ];
  assert.deepEqual(dashboardBills(list, TODAY).map((b) => b.id), [1]);
});

test('bills: overdue oldest first, then soonest, dateless last A to Z', () => {
  const list = [
    bill({ id: 1, name: 'Soon', due_date: '2026-10-26' }),
    bill({ id: 2, name: 'Zed', due_date: null }),
    bill({ id: 3, name: 'Old', due_date: '2026-10-01' }),
    bill({ id: 4, name: 'Alpha', due_date: '' }),
    bill({ id: 5, name: 'Late', due_date: '2026-10-20' }),
  ];
  assert.deepEqual(dashboardBills(list, TODAY).map((b) => b.id), [3, 5, 1, 4, 2]);
});

test('bills: capped at 5', () => {
  const list = Array.from({ length: 8 }, (_, i) => bill({ id: i, name: `B${i}`, due_date: `2026-11-0${i + 1}` }));
  assert.equal(dashboardBills(list, TODAY).length, 5);
});

const fund = (o = {}) => ({ id: 1, name: 'Trip', currentAmount: 50, targetAmount: 100, status: 'in_progress', ...o });
const deps = { savingGoals, isReached, sortByProgress, weeklyFromRules };
const rule = { member_id: 'm1', threshold_amount: 0, action_type: 'goal', action_target_id: 2, amount_to_add: 20, amount_type: 'fixed', is_active: true };
const sched = { member_id: 'm1', amount: 1000, frequency: 'weekly', is_fixed_amount: true };

test('goals: Just tracking and Reached are left out', () => {
  const funds = [fund({ id: 1 }), fund({ id: 2, status: 'paused' }), fund({ id: 3, currentAmount: 100 })];
  assert.deepEqual(dashboardGoals(funds, [], [], deps).map((g) => g.goal.id), [1]);
});

test('goals: most progress first, capped at 3', () => {
  const funds = [
    fund({ id: 1, currentAmount: 10 }),
    fund({ id: 2, currentAmount: 90 }),
    fund({ id: 3, currentAmount: 60 }),
    fund({ id: 4, currentAmount: 30 }),
  ];
  assert.deepEqual(dashboardGoals(funds, [], [], deps).map((g) => g.goal.id), [2, 3, 4]);
});

test('goals: weekly text from rules, else "No contribution set"', () => {
  const out = dashboardGoals([fund({ id: 2 }), fund({ id: 1, currentAmount: 10 })], [rule], [sched], deps);
  assert.equal(out[0].goal.id, 2);
  assert.equal(out[0].weeklyText, '+$20 a week');
  assert.equal(out[0].hasContribution, true);
  assert.equal(out[1].weeklyText, 'No contribution set');
  assert.equal(out[1].hasContribution, false);
  assert.equal(out[0].percent, 50);
});

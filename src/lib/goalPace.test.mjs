// Unit tests for src/lib/goalPace.ts (R17, #404).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isTracking, isReached, savingGoals, savingTotals, sortByProgress, sortByCost,
  daysUntil, weeksUntil, shortDate, weeklyFromRules, pace,
} from './goalPace.ts';

const goal = (o = {}) => ({ id: 'g1', name: 'Trip', currentAmount: 100, targetAmount: 1000, deadline: null, status: 'in_progress', ...o });
const rule = (o = {}) => ({
  member_id: 'm1', threshold_amount: 0, action_type: 'goal', action_target_id: 'g1',
  amount_to_add: 25, amount_type: 'fixed', is_active: true, ...o,
});
const sched = (o = {}) => ({ member_id: 'm1', amount: 1000, frequency: 'weekly', is_fixed_amount: true, ...o });
const TODAY = '2026-10-24';

test('isTracking and savingGoals use status paused', () => {
  assert.equal(isTracking({ status: 'paused' }), true);
  assert.equal(isTracking({ status: 'completed' }), false);
  const list = [goal({ id: 1 }), goal({ id: 2, status: 'paused' }), goal({ id: 3, status: 'completed' })];
  assert.deepEqual(savingGoals(list).map((g) => g.id), [1, 3]);
});

test('Reached is saved >= target, never the status', () => {
  assert.equal(isReached({ currentAmount: 1000, targetAmount: 1000 }), true);
  assert.equal(isReached({ currentAmount: 999, targetAmount: 1000 }), false);
  assert.equal(isReached({ currentAmount: 5, targetAmount: 0 }), false);
  assert.equal(pace(goal({ status: 'completed', currentAmount: 10 }), [], [], TODAY).kind, 'none');
});

test('savingTotals: saved sums all, to-go skips Reached', () => {
  const t = savingTotals([
    { currentAmount: 100, targetAmount: 1000 },
    { currentAmount: 500, targetAmount: 500 },
    { currentAmount: 700, targetAmount: 600 },
  ]);
  assert.deepEqual(t, { count: 3, saved: 1300, toGo: 900 });
  assert.deepEqual(savingTotals([]), { count: 0, saved: 0, toGo: 0 });
});

test('sortByProgress: high to low, Reached last, then name', () => {
  const out = sortByProgress([
    { name: 'B', currentAmount: 10, targetAmount: 100 },
    { name: 'Done', currentAmount: 100, targetAmount: 100 },
    { name: 'A', currentAmount: 10, targetAmount: 100 },
    { name: 'C', currentAmount: 90, targetAmount: 100 },
  ]);
  assert.deepEqual(out.map((g) => g.name), ['C', 'A', 'B', 'Done']);
});

test('sortByCost: high to low', () => {
  assert.deepEqual(
    sortByCost([{ name: 'a', targetAmount: 5 }, { name: 'b', targetAmount: 50 }]).map((g) => g.name),
    ['b', 'a']
  );
});

test('week maths', () => {
  assert.equal(daysUntil('2026-10-31', TODAY), 7);
  assert.equal(daysUntil('2026-10-20', TODAY), -4);
  assert.equal(daysUntil('junk', TODAY), null);
  assert.equal(weeksUntil('2026-11-07', TODAY), 2);
  assert.equal(weeksUntil('2026-10-25', TODAY), 1); // under a week counts as one
  assert.equal(weeksUntil('2026-10-20', TODAY), null);
  // month end and year end
  assert.equal(daysUntil('2026-11-01', '2026-10-31'), 1);
  assert.equal(daysUntil('2027-01-01', '2026-12-31'), 1);
});

test('shortDate', () => {
  assert.equal(shortDate('2026-12-12'), '12 Dec');
  assert.equal(shortDate('2026-01-05T00:00:00Z'), '5 Jan');
});

test('weeklyFromRules: frequencies, threshold, variable pay, percentage, inactive, other goal', () => {
  assert.equal(weeklyFromRules('g1', [rule()], [sched()]), 25);
  assert.equal(weeklyFromRules('g1', [rule()], [sched({ frequency: 'fortnightly' })]), 12.5);
  assert.ok(Math.abs(weeklyFromRules('g1', [rule({ amount_to_add: 52 })], [sched({ frequency: 'monthly' })]) - 12) < 1e-9);
  // strictly above threshold
  assert.equal(weeklyFromRules('g1', [rule({ threshold_amount: 1000 })], [sched()]), 0);
  assert.equal(weeklyFromRules('g1', [rule({ threshold_amount: 999 })], [sched()]), 25);
  // variable pay, null amount, percentage, inactive, other goal, other member
  assert.equal(weeklyFromRules('g1', [rule()], [sched({ is_fixed_amount: false })]), 0);
  assert.equal(weeklyFromRules('g1', [rule()], [sched({ amount: null })]), 0);
  assert.equal(weeklyFromRules('g1', [rule({ amount_type: 'percentage' })], [sched()]), 0);
  assert.equal(weeklyFromRules('g1', [rule({ is_active: false })], [sched()]), 0);
  assert.equal(weeklyFromRules('g1', [rule({ action_target_id: 'g2' })], [sched()]), 0);
  assert.equal(weeklyFromRules('g1', [rule()], [sched({ member_id: 'm2' })]), 0);
  assert.equal(weeklyFromRules('g1', [rule({ action_type: 'contribution' })], [sched()]), 0);
  // two schedules each count at their own frequency
  assert.equal(weeklyFromRules('g1', [rule()], [sched(), sched({ frequency: 'fortnightly' })]), 37.5);
  // ids may be numbers
  assert.equal(weeklyFromRules(7, [rule({ action_target_id: '7' })], [sched()]), 25);
});

test('pace: reached', () => {
  assert.deepEqual(pace(goal({ currentAmount: 1000 }), [], [], TODAY), { kind: 'reached', text: 'Reached' });
});

test('pace: none and rule without a deadline', () => {
  assert.deepEqual(pace(goal(), [], [], TODAY), { kind: 'none', text: 'No contribution set' });
  assert.deepEqual(pace(goal(), [rule()], [sched()], TODAY), { kind: 'rule', text: '+$25 a week' });
  assert.equal(pace(goal(), [rule({ amount_to_add: 52 })], [sched({ frequency: 'monthly' })], TODAY).text, '+$12 a week');
  assert.equal(pace(goal(), [rule({ amount_to_add: 10 })], [sched({ frequency: 'monthly' })], TODAY).text, '+$2.31 a week');
});

test('pace: needs, rounded up to whole dollars', () => {
  // 900 left, 10 weeks -> $90
  const g = goal({ deadline: '2027-01-02' });
  assert.deepEqual(pace(g, [], [], TODAY), { kind: 'needs', text: 'Needs $90 a week for 2 Jan' });
  // 1000 left over 3 weeks -> 333.33 -> 334
  const g2 = goal({ currentAmount: 0, deadline: '2026-11-14' });
  assert.equal(pace(g2, [], [], TODAY).text, 'Needs $334 a week for 14 Nov');
});

test('pace: on track when the rules cover it, needs when they do not', () => {
  const g = goal({ deadline: '2027-01-02' }); // 900 left, 10 weeks
  assert.deepEqual(pace(g, [rule({ amount_to_add: 90 })], [sched()], TODAY), { kind: 'onTrack', text: 'On track for 2 Jan' });
  assert.equal(pace(g, [rule({ amount_to_add: 50 })], [sched()], TODAY).kind, 'needs');
});

test('pace: deadline this week needs it all; past deadline reads Deadline reached', () => {
  assert.equal(pace(goal({ currentAmount: 900, deadline: '2026-10-26' }), [], [], TODAY).text, 'Needs $100 a week for 26 Oct');
  assert.deepEqual(pace(goal({ deadline: '2026-10-01' }), [rule()], [sched()], TODAY), { kind: 'past', text: 'Deadline reached' });
});

test('pace: unreadable deadline falls back to the rule line', () => {
  assert.equal(pace(goal({ deadline: 'junk' }), [rule()], [sched()], TODAY).kind, 'rule');
});

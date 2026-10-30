// Unit tests for src/lib/billsFilters.ts (R14, #401).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NO_FILTERS,
  isFilterActive,
  dueAfterTypeChange,
  matchesBillFilters,
  matchesExpenseFilters,
  expensesHiddenByDue,
  splitTotals,
  DEFAULT_DRAFT,
  draftFromFilters,
  normaliseDraft,
  isDraftDefault,
  isFilterChipActive,
} from './billsFilters.ts';

const today = new Date(2026, 9, 20); // 20 Oct 2026, local midnight
const deps = {
  isDateless: (b) => !(b.due_date && String(b.due_date).trim()),
  countsTowardTotals: (b) => b.is_paused !== true && !b.dueLabel,
  convert: (amount, from, to) => (from === to ? amount : amount * 2), // simple stand-in
};
const s = (over) => ({ ...NO_FILTERS, ...over });
const bill = (due_date, over = {}) => ({
  name: 'Rent', category: 'Living Costs', amount: 100, frequency: 'weekly', due_date, status: 'Due Soon', ...over,
});

test('isFilterActive', () => {
  assert.equal(isFilterActive(NO_FILTERS), false);
  assert.equal(isFilterActive(s({ type: 'bills' })), true);
  assert.equal(isFilterActive(s({ due: 'week' })), true);
  assert.equal(isFilterActive(s({ category: 'Loans' })), true);
  assert.equal(isFilterActive(s({ search: 'x' })), true);
  assert.equal(isFilterActive(s({ search: '   ' })), false);
});

test('due windows: week 0..7, month 0..30', () => {
  const m = (date, due) => matchesBillFilters(bill(date), s({ due }), today, deps);
  assert.equal(m('2026-10-20', 'week'), true);
  assert.equal(m('2026-10-27', 'week'), true);
  assert.equal(m('2026-10-28', 'week'), false);
  assert.equal(m('2026-10-19', 'week'), false);
  assert.equal(m('2026-11-19', 'month'), true);
  assert.equal(m('2026-11-20', 'month'), false);
});

test('overdue: before today and not Paid', () => {
  const m = (date, over) => matchesBillFilters(bill(date, over), s({ due: 'overdue' }), today, deps);
  assert.equal(m('2026-10-19'), true);
  assert.equal(m('2026-10-19', { status: 'Paid' }), false);
  assert.equal(m('2026-10-20'), false);
});

test('dateless and labelled bills only appear under Any due', () => {
  const dateless = bill(null);
  const labelled = bill('2026-10-21', { dueLabel: 'Paused' });
  assert.equal(matchesBillFilters(dateless, s(), today, deps), true);
  assert.equal(matchesBillFilters(labelled, s(), today, deps), true);
  for (const due of ['week', 'month', 'overdue']) {
    assert.equal(matchesBillFilters(dateless, s({ due }), today, deps), false);
    assert.equal(matchesBillFilters(labelled, s({ due }), today, deps), false);
  }
});

test('search and category apply to bills and expenses', () => {
  assert.equal(matchesBillFilters(bill('2026-10-21'), s({ search: 'ren' }), today, deps), true);
  assert.equal(matchesBillFilters(bill('2026-10-21'), s({ search: 'zzz' }), today, deps), false);
  assert.equal(matchesBillFilters(bill('2026-10-21'), s({ category: 'Loans' }), today, deps), false);
  const e = { name: 'Groceries', category: 'Living Costs', amount: 50 };
  assert.equal(matchesExpenseFilters(e, s({ search: 'groc' })), true);
  assert.equal(matchesExpenseFilters(e, s({ category: 'Loans' })), false);
});

test('type filter and expense hiding', () => {
  const e = { name: 'Groceries', category: 'Living Costs', amount: 50 };
  assert.equal(matchesBillFilters(bill('2026-10-21'), s({ type: 'expenses' }), today, deps), false);
  assert.equal(matchesExpenseFilters(e, s({ type: 'bills' })), false);
  assert.equal(matchesExpenseFilters(e, s({ due: 'week' })), false);
  assert.equal(expensesHiddenByDue([e], s({ due: 'week' })), true);
  assert.equal(expensesHiddenByDue([e], s({ due: 'week', type: 'bills' })), false);
  assert.equal(expensesHiddenByDue([e], s()), false);
  assert.equal(expensesHiddenByDue([], s({ due: 'week' })), false);
});

test('Type = Expenses resets Due', () => {
  assert.equal(dueAfterTypeChange('expenses', 'overdue'), 'all');
  assert.equal(dueAfterTypeChange('bills', 'overdue'), 'overdue');
  assert.equal(dueAfterTypeChange('all', 'week'), 'week');
});

test('unfiltered total counts everything counted, plus goals', () => {
  const bills = [bill('2026-10-21'), bill('2026-10-22', { is_paused: true })];
  const expenses = [{ name: 'g', amount: 10 }];
  const t = splitTotals({
    bills, expenses, listedBills: bills, listedExpenses: expenses,
    goalsTotal: 30, filterActive: false, frequency: 'weekly', deps,
  });
  assert.deepEqual(t, { bills: 100, expenses: 10, goals: 30, total: 140, listedCount: 3, totalCount: 3 });
});

test('filtered total uses listed rows only, paused count 0, no goals', () => {
  const live = bill('2026-10-21');
  const paused = bill('2026-10-22', { is_paused: true });
  const finished = bill('2026-10-23', { dueLabel: 'One-off' });
  const bills = [live, paused, finished, bill('2026-10-24')];
  const expenses = [{ name: 'g', amount: 10 }, { name: 'h', amount: 5 }];
  const t = splitTotals({
    bills, expenses,
    listedBills: [live, paused, finished],
    listedExpenses: [expenses[0]],
    goalsTotal: 30, filterActive: true, frequency: 'monthly', deps,
  });
  assert.equal(t.bills, 200);
  assert.equal(t.expenses, 20);
  assert.equal(t.goals, 0);
  assert.equal(t.total, 220);
  assert.equal(t.listedCount, 4);
  assert.equal(t.totalCount, 6);
});

test('draft: seeded from live filters, Expenses forces Any due, default check', () => {
  assert.deepEqual(draftFromFilters(NO_FILTERS), DEFAULT_DRAFT);
  assert.deepEqual(draftFromFilters(s({ type: 'bills', due: 'week', category: 'Loans', search: 'x' })), {
    type: 'bills', due: 'week', category: 'Loans',
  });
  assert.deepEqual(normaliseDraft({ type: 'expenses', due: 'overdue', category: 'All' }), {
    type: 'expenses', due: 'all', category: 'All',
  });
  assert.equal(isDraftDefault(DEFAULT_DRAFT), true);
  assert.equal(isDraftDefault({ ...DEFAULT_DRAFT, category: 'Loans' }), false);
  assert.equal(isDraftDefault({ ...DEFAULT_DRAFT, due: 'month' }), false);
});

test('filter chip dot: Type, Due or Category, never search', () => {
  assert.equal(isFilterChipActive(NO_FILTERS), false);
  assert.equal(isFilterChipActive(s({ search: 'rent' })), false);
  assert.equal(isFilterChipActive(s({ type: 'expenses' })), true);
  assert.equal(isFilterChipActive(s({ due: 'overdue' })), true);
  assert.equal(isFilterChipActive(s({ category: 'Loans' })), true);
});

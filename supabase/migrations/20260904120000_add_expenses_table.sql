-- Issue #98 (Slice 1 of 6): new `expenses` table, separate from `bills`.
--
-- Anthony's sign-off (issue #98 comment, 2026-09-03): a bill is fixed/contractual/recurring
-- (rent, insurance, subscriptions); an expense is variable spend that still needs to count
-- toward the weekly joint-account/Direct-Pay draw (groceries, fuel, etc.). Kept as its OWN table
-- rather than a flag on `bills` — Orchestrator's technical recommendation, approved by Anthony
-- ("go with the most logical option") — so every existing bills-reading query (dashboard, health
-- score, reminder generator, contribution splits, #70 category ordering) stays completely
-- untouched instead of needing a type-filter added everywhere.
--
-- Column shape mirrors `bills`' existing conventions (household_id scoping, category, notes,
-- created_at default) but drops bill-only concepts that don't apply to variable spend: due_date,
-- frequency/is_recurring, invoice_date, payment_type, is_paused, status. Per the ticket, the
-- columns are added now even though no UI/business logic reads them yet (that lands in later
-- sub-slices of #98).
--
-- Split-mode is designed so sub-slice 3 (Direct Pay split logic for expenses) can land without a
-- further migration. `split_mode` picks one of two mutually-exclusive shapes, both already
-- present as columns/tables in this same migration:
--   - 'assignee'   — whole-item assignment to one household member, via `assignee_id`. Mirrors
--                    bills.assignee_id exactly, same nullable-FK / ON DELETE SET NULL behaviour.
--   - 'percentage' — a %-split across members, via the new `expense_splits` join table below.
--                    This is a new pattern (per Anthony's decision comment) — `bill_splits`
--                    stores computed dollar amounts (derived elsewhere from a bill's total), but
--                    no equivalent "computed weekly-draw amount" exists for expenses yet, so
--                    `expense_splits` stores the raw percentage instead; the later slice that
--                    wires this in can compute dollar amounts from it without a schema change.

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  notes TEXT,
  split_mode TEXT NOT NULL DEFAULT 'assignee' CHECK (split_mode IN ('assignee', 'percentage')),
  assignee_id UUID REFERENCES household_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES household_members(id) ON DELETE CASCADE,
  percentage NUMERIC NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS expenses_household_id_idx ON expenses(household_id);
CREATE INDEX IF NOT EXISTS expense_splits_expense_id_idx ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS expense_splits_household_id_idx ON expense_splits(household_id);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- Mirrors the current, clean `bills` RLS policy exactly (household owner match OR
-- check_household_access() member check, same function bills already uses). `bills` today has
-- exactly one policy with no legacy carry-overs, so that's the pattern reproduced here — not the
-- separate legacy "Allow anon ..." policies present on `bill_splits` (see below).
CREATE POLICY "Users can manage expenses in their households"
  ON expenses
  FOR ALL
  USING (
    (household_id IN (SELECT households.id FROM households WHERE households.user_id = auth.uid()))
    OR check_household_access(household_id, auth.uid())
  )
  WITH CHECK (
    (household_id IN (SELECT households.id FROM households WHERE households.user_id = auth.uid()))
    OR check_household_access(household_id, auth.uid())
  );

-- Mirrors bill_splits' "Users can manage bill_splits" policy (access derived by joining back to
-- the parent row's household) — not bill_splits' separate legacy "Allow anon ..." policies, which
-- predate the household_id-based RLS pattern and are not part of what's being carried forward.
CREATE POLICY "Users can manage expense_splits in their households"
  ON expense_splits
  FOR ALL
  USING (
    expense_id IN (
      SELECT e.id FROM expenses e
      WHERE (e.household_id IN (SELECT households.id FROM households WHERE households.user_id = auth.uid()))
         OR check_household_access(e.household_id, auth.uid())
    )
  )
  WITH CHECK (
    expense_id IN (
      SELECT e.id FROM expenses e
      WHERE (e.household_id IN (SELECT households.id FROM households WHERE households.user_id = auth.uid()))
         OR check_household_access(e.household_id, auth.uid())
    )
  );

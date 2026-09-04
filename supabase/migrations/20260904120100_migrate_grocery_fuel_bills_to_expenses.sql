-- Issue #98 (Slice 1 of 6): one-time data migration.
--
-- Anthony's own words (issue #98 comment, 2026-09-03): "Groceries and fuel are currently entered
-- as bills purely as a workaround" — the only way today to get a variable amount to count toward
-- the weekly joint-account/Direct-Pay draw was to fake it as a recurring bill. Now that `expenses`
-- exists (prior migration in this same PR), this moves exactly those rows out of `bills` and into
-- `expenses`, once, for the data that already exists in production.
--
-- Deliberately conservative, case-insensitive match on category OR name containing
-- grocery/groceries/fuel/petrol — reviewed against the live `bills` table before writing this
-- (29 rows total): only 4 rows matched ("Fuel" and "Groceries", one of each per household), all
-- weekly/recurring/Living-Costs-category workaround rows exactly matching Anthony's description.
-- "Day Care" (also category "Living Costs") deliberately does NOT match anything here — it's a
-- genuine recurring commitment, not this workaround pattern, so it stays a bill. "gas" is
-- deliberately excluded from the pattern even though it's a common fuel synonym elsewhere,
-- because it would also match a genuine contractual "Gas" utility bill — not present in current
-- data, but not a safe general pattern either.
--
-- Orchestrator reviews the exact candidate list (see PR description) before this file is applied
-- to production via `apply_migration` — this build sub-agent does not run it.

DO $$
DECLARE
  moved_count INTEGER;
  deleted_count INTEGER;
BEGIN
  INSERT INTO expenses (household_id, name, category, amount, notes, split_mode, assignee_id, created_at)
  SELECT
    household_id,
    name,
    category,
    amount,
    notes,
    'assignee', -- every migrated bill row only ever had a single assignee_id; preserve as-is
    assignee_id,
    created_at
  FROM bills
  WHERE
    category ILIKE '%grocery%' OR category ILIKE '%groceries%' OR
    category ILIKE '%fuel%' OR category ILIKE '%petrol%' OR
    name ILIKE '%grocery%' OR name ILIKE '%groceries%' OR
    name ILIKE '%fuel%' OR name ILIKE '%petrol%';

  GET DIAGNOSTICS moved_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % bill row(s) into expenses', moved_count;

  -- bill_splits.bill_id -> bills.id is ON DELETE CASCADE, so any splits on these rows (none exist
  -- today — confirmed live, bill_splits was empty at the time this migration was written) are
  -- cleaned up automatically; no separate DELETE FROM bill_splits needed here.
  DELETE FROM bills
  WHERE
    category ILIKE '%grocery%' OR category ILIKE '%groceries%' OR
    category ILIKE '%fuel%' OR category ILIKE '%petrol%' OR
    name ILIKE '%grocery%' OR name ILIKE '%groceries%' OR
    name ILIKE '%fuel%' OR name ILIKE '%petrol%';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % row(s) from bills after migrating them to expenses', deleted_count;
END $$;

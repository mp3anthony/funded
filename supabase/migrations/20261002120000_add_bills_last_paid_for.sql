-- #211 (Slice 17 amendment): record which cycle a bill was last paid for.
-- last_paid_for = due date of the most recently paid cycle (written by every
-- roll of a Paid manual bill). Nullable, no backfill. RLS unchanged.
ALTER TABLE bills ADD COLUMN IF NOT EXISTS last_paid_for DATE;

COMMENT ON COLUMN bills.last_paid_for IS 'Due date of the most recently paid cycle (#211). Set by a roll, never cleared by one; cleared by Undo payment. NULL = no record.';

NOTIFY pgrst, 'reload schema';

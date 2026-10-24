-- R19 (#406): a Pending pay with no known amount stores NULL instead of 0.
-- A1 (Anthony signed off 2026-10-24). Backward compatible with main: live main
-- reads NULL like $0 (Number(null) = 0, convertAmount(null) adds 0).
--
-- Idempotent: safe to re-run. The `status` column already exists live (default
-- 'confirmed', CHECK pending/confirmed), so it is not added here.
--
-- Re-run the UPDATE below once right after the final merge of PR #425: until
-- then main keeps creating $0 Pending rows.

ALTER TABLE pay_history ALTER COLUMN amount DROP NOT NULL;

ALTER TABLE pay_history DROP CONSTRAINT IF EXISTS pay_history_amount_known_unless_pending;
ALTER TABLE pay_history ADD CONSTRAINT pay_history_amount_known_unless_pending
  CHECK (amount IS NOT NULL OR status IS NOT DISTINCT FROM 'pending');

-- Backfill: existing Pending pays with the placeholder $0 become "amount needed".
UPDATE pay_history SET amount = NULL WHERE status = 'pending' AND amount = 0;

COMMENT ON COLUMN pay_history.amount IS 'NULL only for a Pending pay whose amount is not known yet (R19 #406).';

NOTIFY pgrst, 'reload schema';

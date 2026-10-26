-- F13 (#477): a bonus payment is a one-off income row in pay_history, logged
-- from Payday "+" with no pay schedule. is_bonus tells it apart from a pay whose
-- schedule was later deleted (both have pay_schedule_id NULL).
-- Backward compatible with main: live main ignores the column and reads a bonus
-- row as an ordinary confirmed pay with no schedule.
--
-- Idempotent: safe to re-run. Apply before the F13 build reaches production.

ALTER TABLE pay_history ADD COLUMN IF NOT EXISTS is_bonus boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN pay_history.is_bonus IS 'True for a one-off bonus payment logged from Payday (F13 #477): confirmed, no schedule, not in averages, rules or surplus.';

NOTIFY pgrst, 'reload schema';

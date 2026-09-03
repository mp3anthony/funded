-- Issue #97 (Slice 9): notifications overhaul.
--
-- 1. Per-user preferred notify hour ("notify me around X o'clock"), building
--    on the existing per-user notification_settings table. NOT NULL with a
--    default, matching every other column on this table (all_enabled,
--    manual_bill_reminders, etc. are all NOT NULL DEFAULT rather than
--    nullable) -- 9 (9am local) is a reasonable default until the user picks
--    their own. Consuming this for actual send-timing is Slice 11's job
--    (the cron rewrite); this column only needs to exist, be readable, and
--    be saveable via Settings UI for this ticket.
ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS notify_hour INTEGER NOT NULL DEFAULT 9
  CHECK (notify_hour >= 0 AND notify_hour <= 23);

-- 2. Per-type toggles for the two new reminder types this ticket adds,
--    matching the existing manual_bill_reminders / auto_pay_reminders /
--    lodge_payment_reminders columns (each NOT NULL DEFAULT true).
ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS payday_reminders BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS goal_milestone_reminders BOOLEAN NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';

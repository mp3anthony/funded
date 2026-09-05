-- Issue #139: standalone toggle for daily overdue-bill reminders (layers on
-- top of the existing manual_bill_reminders/auto_pay_reminders toggles),
-- matching the existing per-type-toggle convention (see
-- 20260903120000_add_notify_hour_and_new_reminder_types.sql).
ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS overdue_bill_reminders BOOLEAN NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';

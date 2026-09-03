-- Slice 11 v2 (#96 half B rework): scheduled push delivery.
--
-- Vercel Hobby plan only allows once-per-day cron, so the previous hourly
-- push-reminders cron (migration 20260903120000, PR #127) cannot actually
-- run in production. New design: one daily Vercel cron generates reminder
-- rows with a target `scheduled_for` delivery time; a Supabase pg_cron job
-- (not subject to Vercel's limit) delivers due rows within 5 minutes of
-- that time via /api/cron/deliver-scheduled.
--
-- This migration only adds the two columns the new design needs. It
-- deliberately does NOT enable pg_cron/pg_net or schedule any cron job —
-- that is handled separately, outside this migration file.

alter table public.notifications
  add column if not exists scheduled_for timestamptz not null default now(),
  add column if not exists delivered_at timestamptz null;

-- Backfill existing rows: scheduled_for should reflect when the reminder
-- was actually created (already-delivered rows), not "now".
update public.notifications
  set scheduled_for = created_at
  where created_at is not null;

-- Existing rows were already delivered (via the old inline-push cron or the
-- client-side instant generator), so mark them delivered as of their
-- creation time rather than leaving delivered_at NULL — NULL now means
-- "still pending delivery" and would otherwise cause the new delivery cron
-- to re-push every historical notification on its first run.
update public.notifications
  set delivered_at = coalesce(created_at, now())
  where delivered_at is null;

comment on column public.notifications.scheduled_for is
  'When this notification should be delivered (push-sent). Set at generation time based on the household/user chosen local delivery hour.';
comment on column public.notifications.delivered_at is
  'When this notification was actually push-delivered. NULL means still pending delivery.';

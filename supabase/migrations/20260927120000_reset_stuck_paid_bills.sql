-- Issue #187 (SPEC.md Slice 17): one-time data fix. DATA ONLY — no schema/DDL change.
--
-- RUN EXACTLY ONCE, BEFORE THE v0.9.56 APP RELEASE GOES LIVE. Review the dry-run SELECT
-- (see the PR description) against production first; this build sub-agent does not run it.
--
-- Background: before v0.9.56, marking a bill Paid set status = 'Paid' and rolled its due_date
-- forward one cycle straight away, and nothing ever flipped the status back. So every recurring
-- bill that was ever marked Paid has been stuck on Paid since — no Overdue, no Upcoming Bills,
-- no reminders. The new app code (src/lib/billCycle.ts, used by the push-reminders cron and the
-- app's on-load catch-up) keeps a Paid bill on the date it was paid for and rolls it one cycle
-- once that date arrives. This migration moves the existing stuck rows onto that new model.
--
-- Decision 6 on the issue (Anthony, 2026-09-27): every recurring bill currently status = 'Paid'
-- goes back to unpaid ('Due Soon'), dated to its NEXT UPCOMING due date in its household's
-- timezone:
--   * stored due_date today or later  -> kept as-is (the old code already rolled it forward);
--   * stored due_date in the past     -> rolled forward by whole cycles to the first date that
--                                        is today or later;
--   * invoice_date (when set)         -> moved by the same number of cycles, in lockstep;
--   * autopay bills (payment_type 'auto', any case) -> status reset only, dates untouched (their
--     displayed date already rolls via adjustAutopayBillDate).
-- No bill comes out of this dated in the past, so none shows Overdue. Non-recurring Paid bills
-- are left Paid (nothing to roll to). Paused bills are skipped (same rule as computeRollover in
-- src/lib/billCycle.ts): they stay Paid while paused and roll on normally once resumed.
--
-- Cycle arithmetic matches addCycles() in src/lib/billCycle.ts: weekly 7 days, fortnightly
-- 14 days, yearly 1 year, anything else 1 month — always counted from the ORIGINAL date
-- (date + k * step), so Postgres clamps month ends exactly as the app does (Jan 31 -> Feb 28).
--
-- "Today" = now() in the household's timezone, falling back to Australia/Sydney when the stored
-- timezone isn't a name Postgres knows (same fallback as todayInZone()).
--
-- Idempotent: only rows still status = 'Paid' are touched, and every touched row leaves Paid,
-- so a re-run is a no-op.

DO $$
DECLARE
  reset_count INTEGER;
BEGIN
  WITH household_today AS (
    SELECT
      h.id AS household_id,
      (now() AT TIME ZONE (
        CASE
          WHEN EXISTS (SELECT 1 FROM pg_timezone_names t WHERE t.name = h.timezone) THEN h.timezone
          ELSE 'Australia/Sydney'
        END
      ))::date AS today
    FROM households h
  ),
  candidates AS (
    SELECT
      b.id,
      b.due_date,
      b.invoice_date,
      ht.today,
      CASE lower(b.frequency)
        WHEN 'weekly' THEN interval '7 days'
        WHEN 'fortnightly' THEN interval '14 days'
        WHEN 'yearly' THEN interval '1 year'
        ELSE interval '1 month'
      END AS step,
      lower(coalesce(b.payment_type, '')) = 'auto' AS is_auto
    FROM bills b
    JOIN household_today ht ON ht.household_id = b.household_id
    WHERE b.status = 'Paid'
      AND coalesce(b.is_recurring, true)
      AND NOT coalesce(b.is_paused, false)
  ),
  planned AS (
    SELECT
      c.id,
      c.due_date,
      c.invoice_date,
      c.step,
      CASE
        WHEN c.is_auto THEN 0
        ELSE (
          SELECT min(k)
          FROM generate_series(0, 2000) AS k
          WHERE (c.due_date + k * c.step)::date >= c.today
        )
      END AS k
    FROM candidates c
  )
  UPDATE bills b
  SET
    status = 'Due Soon',
    due_date = (p.due_date + p.k * p.step)::date,
    invoice_date = CASE
      WHEN p.invoice_date IS NULL THEN NULL
      ELSE (p.invoice_date + p.k * p.step)::date
    END
  FROM planned p
  WHERE b.id = p.id
    AND b.status = 'Paid'
    AND p.k IS NOT NULL;

  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RAISE NOTICE 'Reset % stuck Paid bill(s) to their next upcoming due date', reset_count;
END $$;

-- Issue #282 (SPEC.md Slice 17 amendment): one-time data fix. DATA ONLY: no schema/DDL change.
--
-- RUN EXACTLY ONCE, BEFORE THE v0.9.65 APP RELEASE GOES LIVE. Review the dry-run SELECT
-- (see the PR description) against production first; this build sub-agent does not run it.
--
-- Background: before the v0.9.56 rollover work, a manual recurring bill's due_date moved when it
-- was paid but its invoice_date did not, so many manual rows now carry an invoice_date a whole
-- number of cycles behind their due_date. Since #187 both dates roll together, so no new rows
-- go stale. Autopay bills are not touched here: their invoice date is derived for display only
-- (displayedInvoiceDate in src/lib/billCycle.ts) and nothing derived is ever stored.
--
-- Rule: for every manual (payment_type not 'auto') recurring bill with both dates set and
-- invoice_date < due_date, move invoice_date forward by the largest whole number of cycles k that
-- keeps it on or before due_date (k = 0 rows are left alone). Paused bills are included (resume
-- moves both dates in lockstep, so the gap would otherwise last forever). Invoice dates on or
-- after the due date are never moved back.
--
-- Cycle arithmetic matches addCycles() in src/lib/billCycle.ts and migration
-- 20260927120000_reset_stuck_paid_bills.sql: weekly 7 days, fortnightly 14 days, yearly
-- 1 year, anything else 1 month, always counted from the ORIGINAL date (date + k * step), so
-- Postgres clamps month ends exactly as the app does (Jan 31 -> Feb 28).
--
-- Idempotent: a fixed row has k = 0 on a re-run, so a second run changes nothing. The UPDATE
-- also re-checks the two dates it read, so a concurrent edit is never overwritten.

DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  WITH c AS (
    SELECT
      b.id,
      b.due_date,
      b.invoice_date,
      CASE lower(b.frequency)
        WHEN 'weekly' THEN interval '7 days'
        WHEN 'fortnightly' THEN interval '14 days'
        WHEN 'yearly' THEN interval '1 year'
        ELSE interval '1 month'
      END AS step
    FROM bills b
    WHERE lower(coalesce(b.payment_type, '')) <> 'auto'
      AND coalesce(b.is_recurring, true)
      AND b.invoice_date IS NOT NULL
      AND b.due_date IS NOT NULL
      AND b.invoice_date < b.due_date
  ),
  p AS (
    SELECT
      c.*,
      (
        SELECT max(k)
        FROM generate_series(0, 2000) AS k
        WHERE (c.invoice_date + k * c.step)::date <= c.due_date
      ) AS k
    FROM c
  )
  UPDATE bills b
  SET invoice_date = (p.invoice_date + p.k * p.step)::date
  FROM p
  WHERE b.id = p.id
    AND p.k > 0
    AND b.invoice_date = p.invoice_date
    AND b.due_date = p.due_date;

  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE 'Realigned % stale manual invoice date(s)', fixed_count;
END $$;

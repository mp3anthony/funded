-- RLS hardening: remove legacy anon-role policies on bill_splits.
-- Authenticated policies are unchanged. Idempotent.

BEGIN;

DROP POLICY IF EXISTS "Allow anon SELECT on bill_splits" ON bill_splits;
DROP POLICY IF EXISTS "Allow anon INSERT on bill_splits" ON bill_splits;
DROP POLICY IF EXISTS "Allow anon UPDATE on bill_splits" ON bill_splits;
DROP POLICY IF EXISTS "Allow anon DELETE on bill_splits" ON bill_splits;

COMMIT;

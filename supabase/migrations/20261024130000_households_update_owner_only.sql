-- R28 (#415): households UPDATE is owner-only (was any member). Idempotent.
-- Trap: an RLS-blocked UPDATE changes 0 rows and returns no error, so app code must check the returned rows
-- (see src/lib/householdOwner.ts). Service-role contexts (edge functions, cron) bypass RLS and are unaffected.
-- Apply right before the final merge of redesign/full-app: live main does not gate Payment mode / New code in the UI.

-- Rollback: recreate "Users can update their household" FOR UPDATE TO authenticated with
-- USING and WITH CHECK (user_id = auth.uid() OR check_household_access(id, auth.uid())).

BEGIN;

DROP POLICY IF EXISTS "Users can update their household" ON households;
DROP POLICY IF EXISTS "Owners can update their household" ON households;
CREATE POLICY "Owners can update their household" ON households FOR UPDATE TO authenticated USING (public.is_household_owner(id, auth.uid())) WITH CHECK (public.is_household_owner(id, auth.uid()));

COMMIT;

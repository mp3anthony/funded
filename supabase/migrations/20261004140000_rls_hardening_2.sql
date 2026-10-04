-- RLS hardening 2: helper function housekeeping and redundant policy cleanup.
-- Equivalent authenticated policies remain on every table touched. Idempotent.
--
-- ROLLBACK (run manually if ever needed):
--   ALTER FUNCTION public.is_household_member(uuid) RESET search_path;
--   GRANT EXECUTE ON FUNCTION public.check_household_access(uuid, uuid) TO PUBLIC, anon;
--   GRANT EXECUTE ON FUNCTION public.is_household_member(uuid) TO PUBLIC, anon;
--   GRANT EXECUTE ON FUNCTION public.is_household_owner(uuid, uuid) TO PUBLIC, anon;
--   CREATE POLICY "Users can manage their own notifications" ON notifications
--     FOR ALL TO public USING (auth.uid() = user_id);
--   CREATE POLICY "Users can manage their own notification settings" ON notification_settings
--     FOR ALL TO public USING (auth.uid() = user_id);
--   CREATE POLICY hm_delete_own ON household_members
--     FOR DELETE TO authenticated USING (user_id = auth.uid());
--   CREATE POLICY hm_select_own ON household_members
--     FOR SELECT TO authenticated USING (user_id = auth.uid());

BEGIN;

-- Helper functions: pin search_path and restrict execution to signed-in users
-- (authenticated and service_role keep explicit EXECUTE).
ALTER FUNCTION public.is_household_member(uuid) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.check_household_access(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_household_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_household_owner(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.check_household_access(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_household_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_household_owner(uuid, uuid) TO authenticated, service_role;

-- Redundant duplicate policies (authenticated equivalents remain).
DROP POLICY IF EXISTS "Users can manage their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can manage their own notification settings" ON notification_settings;
DROP POLICY IF EXISTS hm_delete_own ON household_members;
DROP POLICY IF EXISTS hm_select_own ON household_members;

COMMIT;

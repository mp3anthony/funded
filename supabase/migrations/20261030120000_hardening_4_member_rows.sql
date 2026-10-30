-- Hardening 4: household_members row-level write rules. Idempotent. Backward compatible with main
-- (the live app only edits name/role/avatar_url on member rows and only inserts the first owner row).
--
-- 1. UPDATE guard (trigger): app users (auth.uid() set) can never move a row to another household or
--    change which user owns it, except a user claiming a row invited to their own verified email
--    (kept for older clients; the join function normally does this with the service role).
--    Non-owners may only edit their OWN row, and cannot change its email or invitation_status.
--    Owners keep what the app uses today: name, role (role has its own guard), avatar_url on any row.
--    Service-role contexts (edge functions, cascades) have auth.uid() NULL and are unaffected.
-- 2. INSERT policy: an owner may only add UNCLAIMED rows (user_id NULL); only the join function
--    (service role) sets user_id on someone else's row. The creator's first-owner branch is unchanged.
--
-- ROLLBACK (one transaction):
--   DROP TRIGGER IF EXISTS household_members_row_guard ON household_members;
--   DROP FUNCTION IF EXISTS public.household_members_row_guard();
--   ALTER POLICY "Users can insert household_members" ON household_members
--     WITH CHECK (
--       is_household_owner(household_id, auth.uid())
--       OR (user_id = auth.uid() AND role = 'owner' AND NOT household_has_members(household_id)
--           AND household_id IN (SELECT id FROM households WHERE user_id = auth.uid()))
--     );

BEGIN;

CREATE OR REPLACE FUNCTION public.household_members_row_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  -- A user claiming a row invited to their own (verified) email: household and email stay fixed.
  IF OLD.user_id IS NULL
     AND NEW.user_id = auth.uid()
     AND OLD.email IS NOT NULL
     AND lower(OLD.email) = lower(auth.jwt() ->> 'email')
     AND NEW.household_id IS NOT DISTINCT FROM OLD.household_id
     AND NEW.email IS NOT DISTINCT FROM OLD.email THEN
    RETURN NEW;
  END IF;

  -- Nobody re-parents a row or reassigns its user through the API.
  IF NEW.household_id IS DISTINCT FROM OLD.household_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Not permitted' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_household_owner(OLD.household_id, auth.uid()) THEN
    -- Non-owners: own row only, and only the profile fields.
    IF OLD.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Not permitted' USING ERRCODE = '42501';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email OR NEW.invitation_status IS DISTINCT FROM OLD.invitation_status THEN
      RAISE EXCEPTION 'Not permitted' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.household_members_row_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS household_members_row_guard ON household_members;
CREATE TRIGGER household_members_row_guard BEFORE UPDATE ON household_members FOR EACH ROW EXECUTE FUNCTION public.household_members_row_guard();

-- Defensive: these were dropped by hardening 3; make sure no permissive INSERT policy is left over.
DROP POLICY IF EXISTS "Allow users to join households via member insertion" ON household_members;
DROP POLICY IF EXISTS hm_insert_own ON household_members;

ALTER POLICY "Users can insert household_members" ON household_members
  WITH CHECK (
    (is_household_owner(household_id, auth.uid()) AND user_id IS NULL)
    OR (
      user_id = auth.uid()
      AND role = 'owner'
      AND NOT household_has_members(household_id)
      AND household_id IN (SELECT id FROM households WHERE user_id = auth.uid())
    )
  );

COMMIT;

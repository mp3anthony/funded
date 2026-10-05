-- RLS hardening 3: household and membership write rules, two policies retargeted to authenticated. Idempotent.

BEGIN;

-- 1. household_members INSERT: household creator only (joins go through the server function).
DROP POLICY IF EXISTS "Allow users to join households via member insertion" ON household_members;
DROP POLICY IF EXISTS hm_insert_own ON household_members;
DROP POLICY IF EXISTS "Users can insert household_members" ON household_members;
CREATE POLICY "Users can insert household_members" ON household_members FOR INSERT TO authenticated WITH CHECK (household_id IN (SELECT id FROM households WHERE user_id = auth.uid()));

-- 2. households SELECT: membership-based policy only.
DROP POLICY IF EXISTS hh_select_by_id ON households;

-- 3. households INSERT: creator must be the caller.
DROP POLICY IF EXISTS "Users can create households" ON households;
CREATE POLICY "Users can create households" ON households FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 4. household_members role changes: owners only (server-side contexts unaffected).
CREATE OR REPLACE FUNCTION public.household_members_role_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_household_owner(OLD.household_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not permitted' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.household_members_role_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS household_members_role_guard ON household_members;
CREATE TRIGGER household_members_role_guard BEFORE UPDATE OF role ON household_members FOR EACH ROW EXECUTE FUNCTION public.household_members_role_guard();

-- 5. households.user_id is fixed after creation (server-side contexts unaffected).
CREATE OR REPLACE FUNCTION public.households_user_id_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Not permitted' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.households_user_id_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS households_user_id_guard ON households;
CREATE TRIGGER households_user_id_guard BEFORE UPDATE OF user_id ON households FOR EACH ROW EXECUTE FUNCTION public.households_user_id_guard();

-- 6. Retarget to authenticated (bodies unchanged).
ALTER POLICY "Users can manage expenses in their households" ON expenses TO authenticated;
ALTER POLICY "Users can manage expense_splits in their households" ON expense_splits TO authenticated;

COMMIT;

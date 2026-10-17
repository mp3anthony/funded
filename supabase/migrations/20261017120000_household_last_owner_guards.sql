-- #251 Leave/Delete household: last-owner guards. Triggers only, no schema change. Idempotent.
-- Accepted member = user_id IS NOT NULL AND coalesce(invitation_status,'accepted') <> 'pending'.
-- App users (auth.uid() set) are guarded; service-role contexts (edge functions, cascades from
-- auth.users) have auth.uid() NULL and are unaffected.

BEGIN;

-- 1. Role changes: owners only (unchanged), and the last accepted owner can't be demoted.
CREATE OR REPLACE FUNCTION public.household_members_role_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_household_owner(OLD.household_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not permitted' USING ERRCODE = '42501';
  END IF;
  IF OLD.role = 'owner' AND NEW.role IS DISTINCT FROM 'owner' AND NOT EXISTS (
    SELECT 1 FROM public.household_members m
    WHERE m.household_id = OLD.household_id AND m.id <> OLD.id AND m.role = 'owner'
      AND m.user_id IS NOT NULL AND coalesce(m.invitation_status, 'accepted') <> 'pending'
  ) THEN
    RAISE EXCEPTION 'The last owner can''t be demoted. Make someone else an owner first.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.household_members_role_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS household_members_role_guard ON household_members;
CREATE TRIGGER household_members_role_guard BEFORE UPDATE OF role ON household_members FOR EACH ROW EXECUTE FUNCTION public.household_members_role_guard();

-- 2. An owner can't delete their own (or another owner's) membership row through the API: owners
-- leave via the leave-household function, which hands over ownership first. Skipped when the
-- household row itself is gone (an owner deleting the household cascades to its members) and for
-- service-role contexts.
CREATE OR REPLACE FUNCTION public.household_members_owner_delete_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN OLD; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.households WHERE id = OLD.household_id) THEN RETURN OLD; END IF;
  IF OLD.role = 'owner' AND OLD.user_id IS NOT NULL AND coalesce(OLD.invitation_status, 'accepted') <> 'pending' THEN
    RAISE EXCEPTION 'Owners leave through the app' USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END $$;
REVOKE EXECUTE ON FUNCTION public.household_members_owner_delete_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS household_members_owner_delete_guard ON household_members;
CREATE TRIGGER household_members_owner_delete_guard BEFORE DELETE ON household_members FOR EACH ROW EXECUTE FUNCTION public.household_members_owner_delete_guard();

COMMIT;

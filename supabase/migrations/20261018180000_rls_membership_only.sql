-- #350: household access follows membership (household_members), not households.user_id.
-- A = check_household_access(household_id, auth.uid()); O = is_household_owner(household_id, auth.uid()).
-- Single transaction. ALTER POLICY keeps names/roles and fails loudly if a live policy is missing.
--
-- ROLLBACK SQL (restores the pre-#350 expressions; run in one transaction):
--   BEGIN;
--   -- FOR ALL policies (bills, funds, paydays, household_contributions, contribution_rules, pay_schedules,
--   -- pay_history, expenses). Template, shown for bills; repeat with each policy name from the policy map below:
--   ALTER POLICY "Users can manage bills in their households" ON bills
--     USING (household_id IN (SELECT households.id FROM households WHERE user_id = auth.uid()) OR check_household_access(household_id, auth.uid()))
--     WITH CHECK (household_id IN (SELECT households.id FROM households WHERE user_id = auth.uid()) OR check_household_access(household_id, auth.uid()));
--   -- bill_splits: restore the old "via bills with creator OR check_household_access" expression and re-create the dropped creator-only policy:
--   ALTER POLICY "Users can manage bill_splits" ON bill_splits
--     USING (bill_id IN (SELECT b.id FROM bills b WHERE b.household_id IN (SELECT h.id FROM households h WHERE h.user_id = auth.uid()) OR check_household_access(b.household_id, auth.uid())))
--     WITH CHECK (bill_id IN (SELECT b.id FROM bills b WHERE b.household_id IN (SELECT h.id FROM households h WHERE h.user_id = auth.uid()) OR check_household_access(b.household_id, auth.uid())));
--   CREATE POLICY "Users can manage splits in their households" ON bill_splits FOR ALL
--     USING (bill_id IN (SELECT b.id FROM bills b WHERE b.household_id IN (SELECT h.id FROM households h WHERE h.user_id = auth.uid())))
--     WITH CHECK (bill_id IN (SELECT b.id FROM bills b WHERE b.household_id IN (SELECT h.id FROM households h WHERE h.user_id = auth.uid())));
--   -- expense_splits: re-add the creator OR branch:
--   ALTER POLICY "Users can manage expense_splits in their households" ON expense_splits
--     USING (expense_id IN (SELECT e.id FROM expenses e WHERE e.household_id IN (SELECT h.id FROM households h WHERE h.user_id = auth.uid()) OR check_household_access(e.household_id, auth.uid())))
--     WITH CHECK (expense_id IN (SELECT e.id FROM expenses e WHERE e.household_id IN (SELECT h.id FROM households h WHERE h.user_id = auth.uid()) OR check_household_access(e.household_id, auth.uid())));
--   -- households:
--   ALTER POLICY "Users can select their household" ON households USING (user_id = auth.uid() OR check_household_access(id, auth.uid()));
--   ALTER POLICY "Users can update their household" ON households USING (user_id = auth.uid() OR check_household_access(id, auth.uid())) WITH CHECK (user_id = auth.uid() OR check_household_access(id, auth.uid()));
--   ALTER POLICY "Owners can delete their household" ON households USING (user_id = auth.uid() OR is_household_owner(id, auth.uid()));
--   -- household_members INSERT (creator only, as set by 20261005120000):
--   ALTER POLICY "Users can insert household_members" ON household_members
--     WITH CHECK (household_id IN (SELECT id FROM households WHERE user_id = auth.uid()));
--   -- FK back to CASCADE (fix any NULL user_id rows first if you also want NOT NULL back):
--   ALTER TABLE households DROP CONSTRAINT households_user_id_fkey;
--   ALTER TABLE households ADD CONSTRAINT households_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
--   DROP FUNCTION public.household_has_members(uuid);  -- only after the policies above no longer use it
--   NOTIFY pgrst, 'reload schema';
--   COMMIT;
--
-- Policy map (live names confirmed by the step 0 check on #350). Old expression for all of these:
-- household_id IN (SELECT households.id FROM households WHERE user_id = auth.uid()) OR check_household_access(household_id, auth.uid())
--   bills "Users can manage bills in their households"
--   funds "Users can manage funds in their households"
--   paydays "Users can manage paydays in their households"
--   household_contributions "Users can manage household_contributions"
--   contribution_rules "Users can manage contribution_rules"
--   pay_schedules "Users can manage pay_schedules"
--   pay_history "Users can manage pay_history"
--   expenses "Users can manage expenses in their households"

BEGIN;

-- 1. Helper: does this household have ANY household_members row? Counts every row including
-- pending (unaccepted) ones, so a household that only has pending rows still counts as "has
-- members". SECURITY DEFINER so it can read household_members through its RLS. Used by the
-- creation-time branches below: once any member exists the creator column stops granting access.
CREATE OR REPLACE FUNCTION public.household_has_members(household_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM household_members WHERE household_id = household_uuid);
$$;
REVOKE EXECUTE ON FUNCTION public.household_has_members(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.household_has_members(uuid) TO authenticated, service_role;

-- 2. Household-scoped tables: membership only (USING and WITH CHECK).
ALTER POLICY "Users can manage bills in their households" ON bills
  USING (check_household_access(household_id, auth.uid()))
  WITH CHECK (check_household_access(household_id, auth.uid()));
ALTER POLICY "Users can manage funds in their households" ON funds
  USING (check_household_access(household_id, auth.uid()))
  WITH CHECK (check_household_access(household_id, auth.uid()));
ALTER POLICY "Users can manage paydays in their households" ON paydays
  USING (check_household_access(household_id, auth.uid()))
  WITH CHECK (check_household_access(household_id, auth.uid()));
ALTER POLICY "Users can manage household_contributions" ON household_contributions
  USING (check_household_access(household_id, auth.uid()))
  WITH CHECK (check_household_access(household_id, auth.uid()));
ALTER POLICY "Users can manage contribution_rules" ON contribution_rules
  USING (check_household_access(household_id, auth.uid()))
  WITH CHECK (check_household_access(household_id, auth.uid()));
ALTER POLICY "Users can manage pay_schedules" ON pay_schedules
  USING (check_household_access(household_id, auth.uid()))
  WITH CHECK (check_household_access(household_id, auth.uid()));
ALTER POLICY "Users can manage pay_history" ON pay_history
  USING (check_household_access(household_id, auth.uid()))
  WITH CHECK (check_household_access(household_id, auth.uid()));
ALTER POLICY "Users can manage expenses in their households" ON expenses
  USING (check_household_access(household_id, auth.uid()))
  WITH CHECK (check_household_access(household_id, auth.uid()));

-- 3. Splits: access through the parent row's household.
ALTER POLICY "Users can manage bill_splits" ON bill_splits
  USING (bill_id IN (SELECT id FROM bills WHERE check_household_access(household_id, auth.uid())))
  WITH CHECK (bill_id IN (SELECT id FROM bills WHERE check_household_access(household_id, auth.uid())));
DROP POLICY IF EXISTS "Users can manage splits in their households" ON bill_splits;  -- creator-only, covered above
ALTER POLICY "Users can manage expense_splits in their households" ON expense_splits
  USING (expense_id IN (SELECT e.id FROM expenses e WHERE check_household_access(e.household_id, auth.uid())))
  WITH CHECK (expense_id IN (SELECT e.id FROM expenses e WHERE check_household_access(e.household_id, auth.uid())));

-- 4. households.
-- SELECT: members, plus the creator only while the household has no member rows yet. That second
-- branch exists so INSERT ... RETURNING works at creation (the row has no member yet, and a helper
-- function cannot see a row from the same statement); it reads the row's own user_id. It shuts as
-- soon as any member exists, which is what closes the demoted-then-removed creator hole.
ALTER POLICY "Users can select their household" ON households
  USING (check_household_access(id, auth.uid()) OR (user_id = auth.uid() AND NOT household_has_members(id)));
-- UPDATE: any member (unchanged scope; tightening to owners is a separate decision).
ALTER POLICY "Users can update their household" ON households
  USING (check_household_access(id, auth.uid()))
  WITH CHECK (check_household_access(id, auth.uid()));
-- DELETE: owners by role only.
ALTER POLICY "Owners can delete their household" ON households
  USING (is_household_owner(id, auth.uid()));
-- INSERT ("Users can create households": user_id = auth.uid()) is unchanged.

-- 5. household_members INSERT: an existing owner may add a member; or the creator may add
-- themselves as the first owner of a household that has no members yet. NOTE: a multi-row INSERT
-- in one statement can fail the "first owner" branch because the helper cannot see rows from the
-- same statement; the client inserts member rows one at a time.
ALTER POLICY "Users can insert household_members" ON household_members
  WITH CHECK (
    is_household_owner(household_id, auth.uid())
    OR (
      user_id = auth.uid()
      AND role = 'owner'
      AND NOT household_has_members(household_id)
      AND household_id IN (SELECT id FROM households WHERE user_id = auth.uid())
    )
  );

-- 6. households.user_id becomes a creation record only: nullable, set NULL when the account goes.
ALTER TABLE households ALTER COLUMN user_id DROP NOT NULL;  -- already nullable live; kept so repo rebuilds match
ALTER TABLE households DROP CONSTRAINT households_user_id_fkey;
ALTER TABLE households ADD CONSTRAINT households_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- Issue #208: declare, as-is, the live RLS state that no repo migration defined.
--
-- NO BEHAVIOUR CHANGE. Every statement below reproduces a policy (name, command, roles, USING,
-- WITH CHECK) that already exists on production, captured read-only from pg_policies on
-- 2026-10-04. Each policy is DROP IF EXISTS + CREATE so the file is idempotent: re-running it on
-- production recreates the identical policy; on a fresh rebuild it creates it.
-- Nothing here drops or alters any policy that is not listed, and nothing is tightened.
-- Known too-permissive live policies are deliberately NOT declared here; see issue #208 findings.
--
-- Roles: "TO public" in pg_policies means the default (no TO clause), so those are written
-- without a TO clause. WITH CHECK is only written where live has an explicit one; for FOR ALL
-- policies with a null live with_check, Postgres reuses USING.
--
-- Helper functions check_household_access / is_household_owner already exist in
-- fix_households_rls_recursion.sql and match live.
--
-- A from-scratch rebuild needs the notifications, notification_settings and push_subscriptions
-- tables to exist before this file runs (no CREATE TABLE for them is in the repo; tracked
-- separately). On production they already exist.

BEGIN;

-- ---------------------------------------------------------------------------
-- notifications (the gap that triggered #208)
-- ---------------------------------------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own notifications" ON notifications;
CREATE POLICY "Users can manage own notifications" ON notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own notifications" ON notifications;
CREATE POLICY "Users can manage their own notifications" ON notifications
  FOR ALL
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- notification_settings
-- ---------------------------------------------------------------------------
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own notification_settings" ON notification_settings;
CREATE POLICY "Users can manage own notification_settings" ON notification_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own notification settings" ON notification_settings;
CREATE POLICY "Users can manage their own notification settings" ON notification_settings
  FOR ALL
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- push_subscriptions
-- ---------------------------------------------------------------------------
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- bill_splits (authenticated owner-join policy only; anon policies intentionally omitted)
-- ---------------------------------------------------------------------------
ALTER TABLE bill_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage splits in their households" ON bill_splits;
CREATE POLICY "Users can manage splits in their households" ON bill_splits
  FOR ALL TO authenticated
  USING (
    bill_id IN (
      SELECT b.id FROM bills b
      JOIN households h ON b.household_id = h.id
      WHERE h.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bill_id IN (
      SELECT b.id FROM bills b
      JOIN households h ON b.household_id = h.id
      WHERE h.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- pay_schedules (policies beyond "Users can manage pay_schedules", which the repo defines)
-- ---------------------------------------------------------------------------
ALTER TABLE pay_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create own pay schedules" ON pay_schedules;
CREATE POLICY "Users can create own pay schedules" ON pay_schedules
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "Users can delete own pay schedules" ON pay_schedules;
CREATE POLICY "Users can delete own pay schedules" ON pay_schedules
  FOR DELETE TO authenticated
  USING (auth.uid() = member_id);

DROP POLICY IF EXISTS "Users can update own pay schedules" ON pay_schedules;
CREATE POLICY "Users can update own pay schedules" ON pay_schedules
  FOR UPDATE TO authenticated
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "Users can view own pay schedules" ON pay_schedules;
CREATE POLICY "Users can view own pay schedules" ON pay_schedules
  FOR SELECT TO authenticated
  USING (auth.uid() = member_id);

DROP POLICY IF EXISTS ps_delete_member ON pay_schedules;
CREATE POLICY ps_delete_member ON pay_schedules
  FOR DELETE TO authenticated
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS ps_insert_member ON pay_schedules;
CREATE POLICY ps_insert_member ON pay_schedules
  FOR INSERT TO authenticated
  WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS ps_select_member ON pay_schedules;
CREATE POLICY ps_select_member ON pay_schedules
  FOR SELECT TO authenticated
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS ps_update_member ON pay_schedules;
CREATE POLICY ps_update_member ON pay_schedules
  FOR UPDATE TO authenticated
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()))
  WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- households (all live policies re-declared exactly; "Users can create households" is not
-- redeclared, its repo definition in fix_households_rls_recursion.sql already matches live)
-- ---------------------------------------------------------------------------
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their household" ON households;
CREATE POLICY "Users can select their household" ON households
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR check_household_access(id, auth.uid()));

DROP POLICY IF EXISTS "Users can update their household" ON households;
CREATE POLICY "Users can update their household" ON households
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR check_household_access(id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR check_household_access(id, auth.uid()));

DROP POLICY IF EXISTS "Owners can delete their household" ON households;
CREATE POLICY "Owners can delete their household" ON households
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_household_owner(id, auth.uid()));

DROP POLICY IF EXISTS hh_select_by_id ON households;
CREATE POLICY hh_select_by_id ON households
  FOR SELECT TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- bills, paydays, funds: live already has RLS on, but no migration enables it
-- ---------------------------------------------------------------------------
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE paydays ENABLE ROW LEVEL SECURITY;
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- household_members (live policy set; the repo's older "members" policies are not live)
-- ---------------------------------------------------------------------------
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

-- Legacy policies that are NOT live (production does not have them) and are broader than the
-- live set. Dropping is a no-op on production. The Supabase CLI only applies migration files
-- named <digits>_<name>.sql and skips the legacy add_*/fix_* files, but if any tooling does run
-- them after this file on a fresh DB, these two would otherwise reappear, so drop them anyway.
DROP POLICY IF EXISTS "Users can manage members in their households" ON household_members;
DROP POLICY IF EXISTS "Users can view own household via membership" ON household_members;

DROP POLICY IF EXISTS "Allow users to join households via member insertion" ON household_members;
CREATE POLICY "Allow users to join households via member insertion" ON household_members
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete household_members" ON household_members;
CREATE POLICY "Users can delete household_members" ON household_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_household_owner(household_id, auth.uid()));

DROP POLICY IF EXISTS "Users can insert household_members" ON household_members;
CREATE POLICY "Users can insert household_members" ON household_members
  FOR INSERT TO authenticated
  WITH CHECK (
    household_id IN (SELECT id FROM households WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can select household_members" ON household_members;
CREATE POLICY "Users can select household_members" ON household_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(email) = lower(auth.jwt() ->> 'email')
    OR check_household_access(household_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can update household_members" ON household_members;
CREATE POLICY "Users can update household_members" ON household_members
  FOR UPDATE TO authenticated
  USING (
    lower(email) = lower(auth.jwt() ->> 'email')
    OR check_household_access(household_id, auth.uid())
  )
  WITH CHECK (
    (lower(email) = lower(auth.jwt() ->> 'email') AND user_id = auth.uid())
    OR check_household_access(household_id, auth.uid())
  );

DROP POLICY IF EXISTS hm_delete_own ON household_members;
CREATE POLICY hm_delete_own ON household_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS hm_insert_own ON household_members;
CREATE POLICY hm_insert_own ON household_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS hm_select_own ON household_members;
CREATE POLICY hm_select_own ON household_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

COMMIT;

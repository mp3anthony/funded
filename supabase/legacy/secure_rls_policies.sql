/*
 * ==========================================
 * STRICT RLS POLICIES FOR AUTHENTICATED USERS
 * ==========================================
 *
 * 1. Log in to your Supabase project dashboard.
 * 2. Go to the "SQL Editor" section on the left sidebar.
 * 3. Click "New query".
 * 4. Copy the entire contents of this file.
 * 5. Paste the code into the SQL Editor.
 * 6. Click the "Run" button to apply these secure policies.
 */

-- Ensure RLS is enabled for all tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE paydays ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

-- Remove any existing permissive policies
DROP POLICY IF EXISTS "Allow anon SELECT on households" ON households;
DROP POLICY IF EXISTS "Allow anon INSERT on households" ON households;
DROP POLICY IF EXISTS "Allow anon UPDATE on households" ON households;
DROP POLICY IF EXISTS "Allow anon DELETE on households" ON households;

DROP POLICY IF EXISTS "Allow anon SELECT on bills" ON bills;
DROP POLICY IF EXISTS "Allow anon INSERT on bills" ON bills;
DROP POLICY IF EXISTS "Allow anon UPDATE on bills" ON bills;
DROP POLICY IF EXISTS "Allow anon DELETE on bills" ON bills;

DROP POLICY IF EXISTS "Allow anon SELECT on funds" ON funds;
DROP POLICY IF EXISTS "Allow anon INSERT on funds" ON funds;
DROP POLICY IF EXISTS "Allow anon UPDATE on funds" ON funds;
DROP POLICY IF EXISTS "Allow anon DELETE on funds" ON funds;

DROP POLICY IF EXISTS "Allow anon SELECT on paydays" ON paydays;
DROP POLICY IF EXISTS "Allow anon INSERT on paydays" ON paydays;
DROP POLICY IF EXISTS "Allow anon UPDATE on paydays" ON paydays;
DROP POLICY IF EXISTS "Allow anon DELETE on paydays" ON paydays;

DROP POLICY IF EXISTS "Allow anon SELECT on household_members" ON household_members;
DROP POLICY IF EXISTS "Allow anon INSERT on household_members" ON household_members;
DROP POLICY IF EXISTS "Allow anon UPDATE on household_members" ON household_members;
DROP POLICY IF EXISTS "Allow anon DELETE on household_members" ON household_members;

-- 1. Households: Users can only see and update households they own
CREATE POLICY "Users can manage their own households" ON households
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. Bills: Users can manage bills for households they own
CREATE POLICY "Users can manage bills in their households" ON bills
  FOR ALL TO authenticated USING (
    household_id IN (SELECT id FROM households WHERE user_id = auth.uid())
  ) WITH CHECK (
    household_id IN (SELECT id FROM households WHERE user_id = auth.uid())
  );

-- 3. Funds: Users can manage funds for households they own
CREATE POLICY "Users can manage funds in their households" ON funds
  FOR ALL TO authenticated USING (
    household_id IN (SELECT id FROM households WHERE user_id = auth.uid())
  ) WITH CHECK (
    household_id IN (SELECT id FROM households WHERE user_id = auth.uid())
  );

-- 4. Paydays: Users can manage paydays for households they own
CREATE POLICY "Users can manage paydays in their households" ON paydays
  FOR ALL TO authenticated USING (
    household_id IN (SELECT id FROM households WHERE user_id = auth.uid())
  ) WITH CHECK (
    household_id IN (SELECT id FROM households WHERE user_id = auth.uid())
  );

-- 5. Household Members: Users can manage members for households they own
CREATE POLICY "Users can manage members in their households" ON household_members
  FOR ALL TO authenticated USING (
    household_id IN (SELECT id FROM households WHERE user_id = auth.uid())
  ) WITH CHECK (
    household_id IN (SELECT id FROM households WHERE user_id = auth.uid())
  );

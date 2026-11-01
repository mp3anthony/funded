/*******************************************************************************
 * ⚠️ WARNING: TEMPORARY DEVELOPMENT RLS POLICIES ⚠️
 * =============================================================================
 * 
 * CRITICAL SECURITY NOTICE:
 * The policies defined in this file are strictly for TEMPORARY local development
 * and testing purposes. They enable full read and write access (SELECT, INSERT, 
 * UPDATE, DELETE) for the unauthenticated 'anon' role.
 * 
 * DO NOT USE THESE POLICIES IN A PRODUCTION ENVIRONMENT!
 * 
 * Once user authentication (Login/Signup) is implemented, these permissive 
 * policies MUST be dropped and replaced with strict Row Level Security (RLS)
 * policies linked to authenticated users via:
 *   - auth.uid()
 *   - auth.role() = 'authenticated'
 *   - Proper household association checks (e.g., verifying a user belongs to
 *     the household they are trying to query/modify).
 * 
 * =============================================================================
 * HOW TO USE:
 * 1. Open the Supabase SQL Editor.
 * 2. Paste the contents of this file.
 * 3. Run the script to enable RLS and apply these permissive development policies.
 ******************************************************************************/

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE paydays ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- HOUSEHOLDS POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Allow anon SELECT on households" ON households;
CREATE POLICY "Allow anon SELECT on households" ON households
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon INSERT on households" ON households;
CREATE POLICY "Allow anon INSERT on households" ON households
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon UPDATE on households" ON households;
CREATE POLICY "Allow anon UPDATE on households" ON households
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon DELETE on households" ON households;
CREATE POLICY "Allow anon DELETE on households" ON households
  FOR DELETE TO anon USING (true);

-- ==========================================
-- BILLS POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Allow anon SELECT on bills" ON bills;
CREATE POLICY "Allow anon SELECT on bills" ON bills
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon INSERT on bills" ON bills;
CREATE POLICY "Allow anon INSERT on bills" ON bills
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon UPDATE on bills" ON bills;
CREATE POLICY "Allow anon UPDATE on bills" ON bills
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon DELETE on bills" ON bills;
CREATE POLICY "Allow anon DELETE on bills" ON bills
  FOR DELETE TO anon USING (true);

-- ==========================================
-- FUNDS POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Allow anon SELECT on funds" ON funds;
CREATE POLICY "Allow anon SELECT on funds" ON funds
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon INSERT on funds" ON funds;
CREATE POLICY "Allow anon INSERT on funds" ON funds
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon UPDATE on funds" ON funds;
CREATE POLICY "Allow anon UPDATE on funds" ON funds
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon DELETE on funds" ON funds;
CREATE POLICY "Allow anon DELETE on funds" ON funds
  FOR DELETE TO anon USING (true);

-- ==========================================
-- PAYDAYS POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Allow anon SELECT on paydays" ON paydays;
CREATE POLICY "Allow anon SELECT on paydays" ON paydays
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon INSERT on paydays" ON paydays;
CREATE POLICY "Allow anon INSERT on paydays" ON paydays
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon UPDATE on paydays" ON paydays;
CREATE POLICY "Allow anon UPDATE on paydays" ON paydays
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon DELETE on paydays" ON paydays;
CREATE POLICY "Allow anon DELETE on paydays" ON paydays
  FOR DELETE TO anon USING (true);

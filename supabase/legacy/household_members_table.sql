/*******************************************************************************
 * HOUSEHOLD MEMBERS TABLE
 * =============================================================================
 *
 * HOW TO USE:
 * 1. Open the Supabase SQL Editor.
 * 2. Paste the contents of this file.
 * 3. Run the script to create the table and apply temporary RLS policies.
 *
 * ⚠️ WARNING: The RLS policies below are TEMPORARY development-only policies.
 *    They MUST be replaced with strict auth.uid()-based policies once
 *    user authentication is implemented.
 ******************************************************************************/

-- Create household_members table
CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

-- Temporary permissive RLS policies for development
DROP POLICY IF EXISTS "Allow anon SELECT on household_members" ON household_members;
CREATE POLICY "Allow anon SELECT on household_members" ON household_members
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon INSERT on household_members" ON household_members;
CREATE POLICY "Allow anon INSERT on household_members" ON household_members
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon UPDATE on household_members" ON household_members;
CREATE POLICY "Allow anon UPDATE on household_members" ON household_members
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon DELETE on household_members" ON household_members;
CREATE POLICY "Allow anon DELETE on household_members" ON household_members
  FOR DELETE TO anon USING (true);

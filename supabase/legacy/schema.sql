/*
 * ==========================================
 * SUPABASE SQL SCHEMA SETUP INSTRUCTIONS
 * ==========================================
 *
 * 1. Log in to your Supabase project dashboard.
 * 2. Go to the "SQL Editor" section on the left sidebar.
 * 3. Click "New query".
 * 4. Copy the entire contents of this file.
 * 5. Paste the code into the SQL Editor.
 * 6. Click the "Run" button (or press Cmd/Ctrl + Enter) to create the tables.
 *
 * Note: This script will create the necessary tables for the application.
 */

-- Create households table
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Create bills table
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL,
  frequency TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Create funds table
CREATE TABLE IF NOT EXISTS funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  current_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  target_amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Create paydays table
CREATE TABLE IF NOT EXISTS paydays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

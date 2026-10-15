-- Issue #333: per-user "Finish setting up" dashboard card dismissal.
-- Null = not dismissed. Set once when the user taps X; never cleared by the app.
-- Covered by the existing "Users can manage their own preferences" policy
-- (FOR ALL, user_id = auth.uid()); no RLS change.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS finish_setup_dismissed_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';

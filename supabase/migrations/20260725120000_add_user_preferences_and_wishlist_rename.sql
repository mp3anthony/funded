-- Issue #70: account-synced bill/goal category order + Short-Term -> Wish List rename.

-- Per-user (not per-household) display preferences: category ordering follows
-- the person, not the account they happen to be signed into on a given device.
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_category_order JSONB,
  goal_category_order JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Rename Goals category 'Short-Term' -> 'Wish List'. Idempotent: WHERE only
-- matches the old value, so re-running is a no-op.
UPDATE funds SET category = 'Wish List' WHERE category = 'Short-Term';

NOTIFY pgrst, 'reload schema';

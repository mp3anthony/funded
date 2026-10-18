ALTER TABLE bills ADD COLUMN IF NOT EXISTS due_date_prompt_muted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bills ALTER COLUMN due_date DROP NOT NULL;
COMMENT ON COLUMN bills.due_date_prompt_muted IS 'Don''t ask again for this bill (#250): no next-due prompt on Mark as Paid, no 30-day Add due date hint.';
NOTIFY pgrst, 'reload schema';

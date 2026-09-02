-- Issue #93: enforce one household per user at the database level.
--
-- household_members.user_id is nullable (unclaimed email-only invites have no
-- user_id yet), and a UNIQUE constraint on a nullable column allows any
-- number of NULLs in Postgres -- only non-null user_id values are compared,
-- so pending invites are unaffected. Verified via SQL before this migration
-- was written that no user_id currently appears in household_members more
-- than once, so this constraint applies cleanly with no existing violations.
ALTER TABLE household_members
  ADD CONSTRAINT household_members_user_id_key UNIQUE (user_id);

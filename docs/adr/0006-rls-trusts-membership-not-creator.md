# RLS trusts membership, not the creator column

Status: accepted (2026-10-18, Anthony approved the approach on #350). Partly supersedes ADR 0005.

Row-level security now grants household access from `household_members` only (`check_household_access` for members, `is_household_owner` for owner-only actions such as delete and adding members). `households.user_id` is a creation record: nullable, `ON DELETE SET NULL`. Two narrow creation-time branches still read it: the households SELECT policy (creator sees the row only while the household has no member rows, so `INSERT ... RETURNING` works) and the `household_members` INSERT policy (creator may add themselves as first owner of a memberless household). A helper, `household_has_members`, counts any member row including pending ones.

Why: before this, about 19 live policies also matched `households.user_id = auth.uid()`, so a creator who was demoted and then removed kept full access, and deleting the creator's account cascaded away the whole household for everyone else. ADR 0005 moved the column when the creator left; that stays (the `leave-household` function still hands the column to a remaining owner, or nulls it), but access no longer depends on it.

Rejected: keeping the creator branch and relying on the leave function alone (does not cover demotion, direct removal or admin changes). Consequences: a household with zero member rows stays visible to its creator (acceptable, it is the creation window); the helper cannot see rows from the same statement, so member rows are inserted one at a time; `households` UPDATE remains any-member (tightening to owners needs its own decision); migration `20261018180000_rls_membership_only` carries the rollback SQL in its header.

Update (R28, #415): `households` UPDATE is now owner-only via `is_household_owner` (was any member).

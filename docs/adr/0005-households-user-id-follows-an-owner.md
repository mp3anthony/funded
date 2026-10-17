# households.user_id follows an owner

Status: accepted (2026-10-17, Anthony chose option A + E1 on #251).

`households.user_id` (the creator) is trusted by about 13 live RLS policies and cascades from `auth.users`, so a creator who leaves must not keep access, and must not take the household with them if their account is deleted. We chose a `leave-household` edge function (service role) that moves `households.user_id` to a remaining accepted owner when the creator leaves, plus a triggers-only migration so owners cannot delete their own member row through the API and the last owner cannot be demoted. A DB trigger already stops app users changing `households.user_id`, so only the service role can move it.

Rejected: B (rewrite policies to be membership-based, a large RLS change touching every table) and C (leave the creator column and block creators from leaving). Consequences: this is the second use of the service-role key for household writes (SPEC A1); a demoted creator who is later removed keeps creator access until policies stop trusting the column (follow-up); two owners leaving at the same moment could leave zero owners, because service-role deletes skip the triggers (accepted, see `docs/lessons.md`).

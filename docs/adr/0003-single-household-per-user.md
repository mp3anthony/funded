# One household per user

Status: accepted (2026-09-02, Anthony's explicit sign-off, Slice 1 / #93).

A user belongs to at most one household. The alternative, multi-household membership, had been deferred since #75 and would touch every screen that assumes "the" household (bills, goals, payday, notifications, timezone). We chose the simple model and enforce it at the data layer rather than only in the client: a `UNIQUE` constraint on `household_members.user_id`, plus a server-side "already in a household" check in the `join-household` edge function, so calling the function directly cannot create a second membership. The consequence is that switching households means leaving the current one first, and any future multi-household feature is a schema change that needs a fresh decision and escalation under `SPEC.md` Part A1.

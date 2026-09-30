# Client-side Supabase auth, no server-side session prefetch

Status: accepted.

The session is resolved entirely in the browser: the Supabase client uses the implicit flow with the session persisted in `localStorage`, and `AppProvider` is mounted with no props. Server-side session prefetch was removed deliberately (#47) because reading `cookies()` in the root layout forces the whole app dynamic under `cacheComponents`. Data access is therefore protected by the public anon key plus row-level security (RLS) as the real guard, not by server-rendered auth checks. The consequence is that every data array starts empty and the app must never assume data is already loaded: `isDataLoading` starts `true` and a single gate in `AppShell` withholds all children until it clears. The rule and its corollaries (including why an unexplained "Fully Funded" signals empty state) live in `SPEC.md` Part A2; do not reintroduce server-side prefetch without revisiting this decision.

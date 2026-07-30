# Handoff

**Last updated:** 2026-07-30
**Branch:** `issue-75-auth-loaddata-hazards` — **work in flight, does NOT compile.**
**App version:** `v0.9.4` on `main`. `v0.9.5` agreed for this build, **not yet applied.**

## → START HERE NEXT SESSION

**The branch is mid-edit and broken on purpose-of-record.** `npx tsc --noEmit` fails with
exactly three errors, all the same cause:

```
src/context/AppContext.tsx(1234,9):  Cannot find name 'hasResolvedHouseholdRef'
src/context/AppContext.tsx(1315,7):  Cannot find name 'hasResolvedHouseholdRef'
src/context/AppContext.tsx(2068,11): Cannot find name 'hasResolvedHouseholdRef'
```

A fix-pass agent was renaming that boolean ref into a **user-scoped** one
(`resolvedHouseholdUserIdRef`, now declared at `AppContext.tsx:730`) and had converted
some read/write sites but not those three when the session was paused. **First job next
session: finish that rename**, then continue the numbered fix list below.

Do not "fix" it by re-declaring `hasResolvedHouseholdRef` — the whole point of the change
is that a bare boolean leaks across a user switch. See Fix 2 below.

---

## What this branch is

Issue **#75** — three pre-existing hazards in the auth/`loadData` path. Anthony chose #75
before #74, and chose to build all three items together plus the item-3 severity fix.

**Two decisions already taken, do not reopen:**

- **All three items in one build** (they share the code path).
- **Client-side guards only. No migration, no DB constraint.** A `UNIQUE` constraint on
  `household_members.user_id` was considered and deliberately deferred — it would hard-code
  "one household per user" and pre-empt the multi-household question due at the CRD
  interview.
- **`v0.9.5`** confirmed by Anthony. Source of truth is the hardcoded string at
  `src/app/settings/settings-client.tsx:337` (`funded. v0.9.4` → `funded. v0.9.5`), per
  SPEC A2. `package.json`'s `version` is unused metadata — leave it.
- A third door (`ensureHousehold`) was **approved as in-scope** after review found it.

## The item 3 finding — this is why the issue's severity changed

The open question was whether a transient membership/households error can let an
already-onboarded user reach "create or join" and actually create a second household.
**It can, and the second household is not the damage — the lockout is.** Verified against
code and the live DB; written up in full at
https://github.com/mp3anthony/funded/issues/75#issuecomment-5128418922

- `loadData`'s STEP 1/STEP 2 collapsed "query failed" and "no household" into one branch,
  so an error cleared `isOnboarded` and `AppShell`'s gate showed Onboarding.
- `createHousehold` had **no guard at all** — no `dbHouseholdId` check, no membership check.
- The DB permits duplicates: `households` INSERT is `WITH CHECK true`,
  `household_members` INSERT is `WITH CHECK true`, and there is **no unique constraint or
  unique index on `household_members.user_id`** (only a plain btree index).
- A second membership row is **fatal**: `loadData`'s membership query is a bare
  `.maybeSingle()`, and postgrest-js 2.108.2 errors (PGRST116) on >1 row. Every later load
  fails forever; the user's real bills/funds/paydays are stranded under the original
  `household_id` with no way back.
- **The join path has the same hole** —
  `supabase/functions/join-household/index.ts` only checks membership *within the household
  being joined*, never whether the user already belongs to a different one.

**Nobody has hit it.** Zero users have more than one membership row. Certain defect, never
fired — same evidentiary posture as #74: a clean production check does not refute it.

Item 3 outranks item 1 on severity. Item 1's permanent wheel survives a force-quit; item 3
is not recoverable in-app.

## Where the code got to

First pass landed and was **independently reviewed** (separate sub-agent, per protocol —
no agent reviews its own code). Review verdict: **needs rework before merge**, one blocker.

What the review **confirmed as sound** — do not re-litigate:

- The error-vs-empty split in `loadData` is the right fix.
- Both guards genuinely close the duplicate-membership doors they target.
- `.limit(1)` before `.maybeSingle()` really does suppress the multi-row error
  (postgrest-js synthesises PGRST116 client-side from `data.length > 1`; `limit=1` means it
  can never exceed 1). Not merely apparent.
- The `.catch` on `getSession()` is correct, including its
  `if (lastDispatchedSessionRef.current) return;` early exit.
- Item 1's `willRunLoadData` predicate is the right *shape*, and scope held — the
  `useEffect(() => { loadData() }, [isAuthLoading, session])` trigger is byte-identical.

### Fix list — 1 is the blocker, 6 is trivial

Numbering matches the brief the agent was working from. **2, 3 partly done; 1, 4, 5, 6 not
started.**

1. **BLOCKER, NOT DONE — `createHousehold` trusts a stale `dbHouseholdId`.** Still present
   at `AppContext.tsx:1196` (`let existingHouseholdId = dbHouseholdId;`).
   `dbHouseholdId` is **never** reset to `null` anywhere, and `AppProvider` never unmounts
   across sign-out/sign-in (both are client-side `router` navigations, no page reload). So
   user A signs out, user B signs in in the same tab, B has no household → the seed is
   truthy with A's household → **the membership check is skipped** → falls into the adopt
   branch → the `households` lookup returns nothing (RLS needs membership B lacks) and its
   error is discarded by the `{ data: existing }` destructure → B briefly sees A's bills,
   then gets bounced to Onboarding step 1. `createHousehold` returned an id, so **no error
   shows and B can never onboard.** Every retry repeats it.
   **This is a regression the first pass introduced** — pre-change, `createHousehold`
   ignored `dbHouseholdId` and just inserted, so B onboarded fine. It would also **pass the
   testing checklist as written**, because the new-user case only fails after an *in-tab*
   switch, not on a fresh load.
   Fix: never seed from `dbHouseholdId`, always run the membership query; stop discarding
   the adopt path's `households` error.
2. **PARTLY DONE — the resolution ref must be user-scoped.**
   `signInWithPassword` in auth-js 2.108.2 emits **only** `SIGNED_IN`, no `SIGNED_OUT`
   first, and `/login` is reachable while already signed in (`AppShell` deliberately does
   not bounce a signed-in user off it). So A→B with no null-session tick means
   `loadData`'s no-session branch never runs and the old boolean ref stayed `true`. For B, a
   membership-query error then skipped `setIsOnboarded(false)`, leaving `isOnboarded` true
   with A's `dbHouseholdId`, A's household name and A's data arrays — **B sees A's
   dashboard.** Pre-change this cleared `isOnboarded` and Onboarding hid A's data, so the
   guard made this *worse*: a privacy regression, not just a wrong screen.
   `resolvedHouseholdUserIdRef` at `:730` is the replacement. **Three call sites still
   reference the old name** — that is the compile failure above.
   Note the `knownOnboarded` expression also read `isOnboarded || !!dbHouseholdId`, which
   are **equally stale** for a switched-in user, so scoping the ref alone is insufficient.
   Must not regress the same-user warm-reload case — keeping loaded state through a
   transient error is the entire point of the guard.
3. **PARTLY DONE — the adopt paths can land on an empty "Fully Funded" dashboard.**
   Both adopt paths ended with `await loadData()`; if that membership query fails again, the
   now-set ref keeps `isOnboarded` true, `isDataLoading` clears, and every array is still
   `[]` → scores exactly **85** → **"Fully Funded"**. That is the canary this project has
   twice mis-diagnosed (see Traps). A hydrate helper taking `householdId`/`userId` was being
   extracted so both adopt paths can load directly with the id they already hold instead of
   re-running the membership lookup. Partially in place around `AppContext.tsx:980`.
   Constraint: **must not change `loadData`'s trigger** — the dependency array stays
   byte-identical.
4. **NOT DONE — third door: `ensureHousehold` has no membership check at all.** If
   `dbHouseholdId` is null and its `households` `.select().limit(1)` returns empty **or
   errors** (error currently discarded), it inserts a household **and** a
   `household_members` row. It is the entry point for `addBill`, `addFund` and ~12 other
   writes. Anthony **approved guarding it in this build.** Also correct the comment in
   `createHousehold` calling it "an equivalent early return" — it oversells it.
5. **NOT DONE — two accuracy corrections.**
   (a) The `joinHousehold` throw comment claims "JoinHouseholdSheet shows this message
   verbatim". True on the **Settings** path; false on the **Onboarding** path, where
   `setIsOnboarded(true)` unmounts the sheet before the throw lands and the message is
   swallowed (harmless, but the comment is wrong). The wording *does* correctly dodge the
   substring rewrites at `JoinHouseholdSheet.tsx:76-84` — that part checked out.
   (b) Both membership lookups use `.limit(1)` with **no `.order()`**, so for an
   already-duplicated user the adopted household is whichever row Postgres returns first.
   Add a deterministic order.
6. **NOT DONE — version bump.** `settings-client.tsx:337`, `v0.9.4` → `v0.9.5`.

### Then, before merge

- **Re-review the delta** with a separate sub-agent (not the implementer).
- **Correct stale line refs** — `src/components/AppShell.tsx` (~lines 167-171) cites
  `AppContext.tsx:827`, `:881`, `:795`, all shifted by this work. Comment-only, no logic,
  but `AppShell.tsx` was out of scope for the implementer so it needs an explicit pass.
  Re-derive the numbers at the time — they are still moving.
- Commit, push, open the PR with the checklist, label **`ready-for-testing`** (see Open
  process items — `needs-manual-test` does not exist in this repo).

### Testing checklist — one item is untestable, reword it

Full checklist is in the issue comment linked above. One correction to make before Anthony
tests:

> "Repeated `INITIAL_SESSION`/`SIGNED_IN` carrying the same session object → no permanent
> wheel"

**Cannot be executed.** The review verified `__loadSession()` never caches — it re-parses
storage on every read, so `getSession()`, `_emitInitialSession`, `_recoverAndRefresh` and
`_callRefreshToken` each hand out a **brand-new session object**. The same-object condition
cannot occur on auth-js 2.108.2 without monkey-patching. **Consequence: item 1's fix is
behaviourally inert on the installed stack** — it is insurance against a future auth-js
that memoizes, exactly matching the issue's "safe today only by accident". Reword the
checklist line to say so rather than tick something unverifiable.

## Traps — confirmed, do not repeat

- **The 85 canary.** Empty state computes to exactly **85** in `calculateHealthScore`
  (`src/lib/utils.ts:88`) — `(100 × 0.4) + (50 × 0.3) + (100 × 0.3)` — clearing the
  `>= 80` threshold at `src/components/HealthScoreCard.tsx:34`. An unexplained "Fully
  Funded" **always** means something handed the dashboard empty arrays. Look at loading
  state, never at the scoring formula. Fix 3 above exists because the first pass
  reintroduced a route to it.
- **Never add a per-component `isDataLoading` guard.** `AppShell.tsx:182` withholds *all*
  children while `session && isDataLoading`, so a component-level guard is unreachable dead
  code. This is A2. #73's original body prescribed exactly this and was wrong.
- **`<AppProvider>` is mounted with no props** (`src/app/layout.tsx:104`). Server-side
  session prefetch was removed deliberately for #47 — reading `cookies()` in the root layout
  forces the whole app dynamic under `cacheComponents`. So `initialSession` is always `null`
  and `initialIsOnboarded` always `false`. Two separate wrong diagnoses came from forgetting
  this.
- **`dbHouseholdId` is never cleared, anywhere.** Nor are `householdName`, `bills`, `funds`,
  `members` on sign-out — `loadData`'s no-session branch clears only `isOnboarded` (and the
  ref). `AppProvider` does not unmount across sign-out/sign-in. This single fact is the root
  of both Fix 1 and Fix 2. Assume stale previous-user state is present unless proven
  otherwise.
- **`allInFuture` at `src/lib/utils.ts:108` is NOT safe to remove**, despite #73's original
  claim. `overdueBills` filters the stored `status` **string** while `allInFuture` parses
  `dueDate` — independent. `mapBillFromDb` only ever *upgrades* status to `"Overdue"`, never
  clears a stored `"Overdue"` on a future date, and its `else if` skips the derivation
  entirely for `payment_type === "auto"`. An auto-pay bill with stored `"Overdue"` and a
  future due date scores **100** with the flag, **80** without — an 8-point swing across the
  80 boundary. (The underlying mapping asymmetry is arguably its own latent bug. Unfiled.)
- **Line references in comments go stale within a single session.** Four rounds now. Always
  re-grep after editing; never carry a number forward. Every line number in this file was
  correct at the WIP commit and **will shift** as Fix 1–6 land.
- **Use `Write` + `--body-file` for GitHub issue bodies.** Heredocs break on markdown of any
  real length.
- **The API threw 529 Overloaded five times this session**, killing four implementation runs.
  Each left the tree verifiably clean; only the fifth landed partial work. If it recurs,
  prefer a **fresh** agent with a tight self-contained brief and exact line anchors over
  resuming one with a long transcript — a big transcript makes every retry a bigger request.

## `SPEC.md` Part A at a glance

- `SPEC.md` **Part A is final** — A1 (5 escalation gates) / A2 (8 standing rules). Do not
  reopen unless Anthony raises something new.
- **A1 — mandatory escalation, stop and ask Anthony.** RLS mandatory · service-role key
  server-only · `convertAmount` normalisation before comparing amounts · stack changes
  (adding/replacing a core dependency or framework) · branching (absolute prohibition, never
  commit to `main`).
- **A2 — follow, do not escalate.** `parseBillDate`/`todayInZone` for all date parsing ·
  `cacheComponents` and its `export const runtime` consequence · notification dismissal as
  mark-as-read · the centralised `isDataLoading` gate · no `fixed` inside `overflow:hidden` ·
  Next.js viewport API · mobile-first PWA · versioning discipline.

## The other open tickets

**[#74 — successful-but-empty query results wipe loaded household data](https://github.com/mp3anthony/funded/issues/74)**
· `bug`, `needs-triage` · **needs Anthony's approach decision before building. Untouched by
this branch — deliberately.**

`if (billsRes.data)` in `loadData` — `[]` is truthy, so a query that succeeds with **zero
rows** overwrites loaded arrays with empty ones. Same pattern for `funds`, `paydays`,
`members`, `bill_splits`. On a warm reload the gate is deliberately not raised, so the
dashboard renders throughout. Score snaps to 85, reads "Fully Funded", next load restores
it. RLS returns exactly that shape — empty, no error — when the auth token isn't applied
yet. The obvious patch ("only overwrite when non-empty") is **wrong** — it would freeze a
bill deleted on another device. Four approaches are in the issue body.

**#74 and #75 item 3 are the same bug class** — a failed query and an empty-but-successful
query collapsing into one code path. Worth reading the #75 fix before picking a #74
approach.

**[#71](https://github.com/mp3anthony/funded/issues/71)** PWA stale cache — two open
implementation-shape questions (cache-busting mechanism, offline tradeoff) to resolve at
kickoff.

**[#37](https://github.com/mp3anthony/funded/issues/37)** household timezone UI — one open
question (any member vs admin-only). Now **load-bearing** for notifications: "notify me at
6pm my local time" needs a timezone the user can set, and every household is currently
hardcoded to `Australia/Sydney`. **Per-household vs per-user is undecided** and materially
changes the build.

**Notification delivery bug — diagnosed, still NOT filed.** Anthony gets no push on Android
or iOS; instead a notification appears 5–10s *after* opening the app. Two reminder
generators exist: the server cron (`src/app/api/cron/push-reminders/route.ts`) and a
client-side copy in `src/context/AppContext.tsx` that runs on app load — the client path is
the 5–10s symptom. `vercel.json` schedules the cron `0 20 * * *` = 20:00 **UTC** ≈ 6am
Sydney; Vercel crons are UTC-only. Push only lands if a live `push_subscriptions` row
exists, so if permission was never granted or iOS expired the subscription, the cron
delivers nothing silently. **Anthony to decide: own issue, or folds into the notifications
CRD.**

**Two follow-ups surfaced by this build, unfiled:**

- **No in-app recovery for an already-duplicated user.** The guards prevent new cases; they
  do not repair an existing one, because `loadData`'s membership query still errors on >1
  row. Nobody is in that state, so it is theoretical. Adding `.limit(1)` there was
  deliberately *not* done — it would silently load one of two households arbitrarily.
- **The server is still not authoritative.** The client guards cover a person tapping
  through a wrongly-shown screen; `join-household`'s edge function keeps its gap. This is
  the standing argument for the deferred `UNIQUE` constraint.

## Open process items

- **Protocol labels don't match the repo.** `CLAUDE.md` §3 names `needs-manual-test`,
  `needs-merge-approval` and `out-of-spec`; **none exist.** Actual labels: `bug`, `Change`,
  `documentation`, `duplicate`, `enhancement`, `help wanted`, `invalid`, `question`,
  `wontfix`, `Critical`, `Epic`, `needs-triage`, `needs-info`, `ready-for-agent`,
  `ready-for-human`, `ready-for-testing`. `ready-for-testing` is the de facto equivalent of
  the first and was used for PR #76 and this issue. Anthony to choose: rename the protocol to
  match the repo, or create the genuinely missing labels. Five minutes, undecided.
- **`CHANGE-LOG.md` count discrepancy, unresolved.** An earlier handoff said "7 pending
  entries" in three places but listed only **6**. Verify the real count at triage.

## Then: `CHANGE-LOG.md` triage + CRD interview

Anthony puts the client hat on, triages the pending entries (count unverified), then the
`crd` skill runs live. Covers the dynamic/interactive overhaul (the swipeable gauge is **one
of several ideas** — he has more to bring), the dashboard, bills-vs-expenses, and
notifications.

Findings to carry in:

- **The notifications mechanism works and is cheap:** run the cron **hourly** instead of
  daily and process each household only when its local hour matches its chosen notify hour.
  No new infrastructure. Depends on #37.
- **Bills-vs-Expenses is the biggest pending item.** Not just an add-screen toggle —
  dashboard totals, contribution splits, the reminder generator and #70's category ordering
  all read `bills`, and each needs a deliberate decision.
- **Direct Pay is untested *logic*, not just untested UI.** `calculateHealthScore`'s
  budget-coverage half runs a completely different calculation in Direct Pay mode (sums
  `billSplits` rather than contributions). Waiting on real direct-pay testers is the right
  call.
- **Multi-household vs one-household-per-user** is now a live schema question, raised by
  #75. Deciding it unblocks the `UNIQUE` constraint.

## Reference

- Protocol: [`CLAUDE.md`](CLAUDE.md) — read first.
- Working spec: [`SPEC.md`](SPEC.md) — **Part A final (A1/A2)**. Part B Slices 1 (#71) and 3
  (#37) still open.
- Out-of-spec inbox: [`CHANGE-LOG.md`](CHANGE-LOG.md) — pending entries awaiting Anthony's
  triage in client hat; count unverified.
- **Active issue: #75** https://github.com/mp3anthony/funded/issues/75 — `bug`, `Critical`,
  `ready-for-agent`. The diagnosis + agreed scope + checklist comment is the one to read.
- Merged: PR #76 https://github.com/mp3anthony/funded/pull/76 (`v0.9.4`)
- Closed: #73 https://github.com/mp3anthony/funded/issues/73 (kept as the written record of
  the health-score investigation and its two wrong diagnoses)
- Open: #75 (in flight), #74, #71, #37

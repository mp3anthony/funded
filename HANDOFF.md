# Handoff

**Last updated:** 2026-08-01 (later session — #80 folded in, `pr-browser-triage` skill added)
**Branch:** `issue-75-auth-loaddata-hazards` — complete, pushed, PR open.
**App version:** `v0.9.8` on the branch (`v0.9.4` on `main`). Confirm the number with Anthony
immediately before merging.

## → START HERE NEXT SESSION

**First thing: run the new `pr-browser-triage` skill (`.claude/skills/pr-browser-triage/`)
against PR #77 as its first real test.** Anthony is deliberately using this PR as the trial run
rather than testing it separately. It was built this session but never executed — walk through it
for real, and if the classification table, the approval gate, or the final report don't feel
right, fix the skill before relying on it further. It explicitly does not touch GitHub (no
ticking checklist items, no comments) — that stays manual regardless of what it finds.

After that: Anthony does the remaining real-device pass on his iPhone (everything the skill
correctly leaves as "real device only" — see checklist items 8, 9, 12, 13 in the canonical PR
comment, plus anything WebKit/PWA-specific the skill's Partial bucket surfaces).

**Nothing else is in flight. The tree is clean and compiles.**

[PR #77](https://github.com/mp3anthony/funded/pull/77) now closes #75, #78, #79, and #80, and is
labelled `ready-for-testing`. It is **waiting on Anthony's hands-on device testing** — while
testing checklist item 11 (onboarding payday+bill, added for #79), Anthony hit a new failure on
the First Bill step. Diagnosed and fixed same-session as #80, folded into this same branch per
the established pattern of closing everything out in one PR/merge cycle. Use the
[canonical-format checklist in this PR comment](https://github.com/mp3anthony/funded/pull/77#issuecomment-5139199683)
— now 14 items, updated this session — not the "Testing checklist" section in the PR body (that
section is historical, kept as the record of what review round 2 signed off on for #75 only; the
PR body has "Folded into this PR after round 2" and "Folded into this PR — third round" sections
summarizing #78/#79 and #80 instead of editing that historical checklist). Nothing else should
start on this branch.

**What to do with results:** if everything passes, confirm `v0.9.8` with Anthony, merge,
close #75/#78/#79/#80. If something fails, get the exact symptom before touching code — same
discipline as below, now across four issues' worth of checklist items.

**Manual-test checklists are now a standard format, codified in `CLAUDE.md` §2 Step 4:** numbered
scenario → bold setup steps → one ✅ pass line → a ❌ line only for a specific named failure mode.
Anthony asked for this because bare checklists weren't building his understanding of *what* each
test actually catches — new checklists should explain the why, not just the click-path.

**The user-switch cases must be done in a single tab without reloading.** A fresh page load
papers over every bug in this ticket. The first implementation pass would have passed a
checklist that only tested cold starts — that is precisely how its regression got through
review-by-checklist and had to be caught by code review instead.

**If testing passes** → confirm the version number with Anthony → merge → close #75.

**If testing fails** → get the exact symptom before touching code. The three most likely
readings, in order:

- **Sees the previous user's data after an in-tab switch** → the user-scoped resolution ref, or
  something else reading `isOnboarded` / `dbHouseholdId` as if they were user-scoped. They are
  not, and are never cleared.
- **"Fully Funded" with an empty dashboard** → something handed the dashboard empty arrays.
  Loading state, never the scoring formula. See the 85 canary under Traps.
- **A new user cannot onboard after an in-tab switch, with no error shown** → the
  `createHousehold` adopt path. This was the exact regression the first pass introduced.

Any fix goes as a **new commit on this same branch** — the branch is already pushed and the PR
is open, so do not rewrite history, and never commit to `main`.

Branch is 13 commits ahead of `origin/main` and 0 behind, so no conflict is expected. Re-check
before merging in case `main` has moved since.

Next after that: **`CHANGE-LOG.md` triage + the CRD interview** (bottom of this file).

## Out-of-band: Supabase test-user cleanup (this session, unrelated to #75/#77)

Not ticket work — Anthony asked to delete three test users from Supabase Auth after the
dashboard's own delete kept failing. Root cause: `household_members`, `notification_settings`,
and `notifications` had `user_id → auth.users.id` as `NO ACTION` instead of `CASCADE` (the other
four user-referencing tables — `households`, `push_subscriptions`, `user_preferences`, and
`funds` via `SET NULL` — were already correct). Fixed with migration
`cascade_delete_user_fks`, then deleted `slmg.anthony@gmail.com`,
`blueprintmusic.info@gmail.com`, `blueprintmusic.info+9.6@gmail.com` and their households.
Verified first that each of the three owned a household with no other members and no stray
`notifications.household_id` rows, so nothing else was in the blast radius. Auth-dashboard user
deletion should work normally from here on. No code changed, no commit — Supabase only.

## What #75 was

Three pre-existing hazards in the auth/`loadData` path, built as one change because they share
the code path. Full writeup:
https://github.com/mp3anthony/funded/issues/75#issuecomment-5128418922

Everything followed from three facts, all verified, all still true:

- `AppProvider` **never unmounts across sign-out/sign-in** — both are client-side `router`
  navigations, no page reload.
- `dbHouseholdId`, `householdName`, `bills`, `funds`, `members` are **never cleared anywhere**.
  `loadData`'s no-session branch clears only `isOnboarded` and the resolution ref.
- auth-js 2.108.2 emits **only `SIGNED_IN`** for `signInWithPassword` — no `SIGNED_OUT` first —
  and `/login` is reachable while already signed in.

So user B arrives in the same tab with all of user A's state resident and no null-session tick
to clear it. **The second household is not the damage — the lockout is.** A second
`household_members` row makes `loadData`'s STEP 1 `.maybeSingle()` error `PGRST116` on every
later load, forever, stranding the user's real data with no in-app way back.

**Nobody has ever hit it.** Zero users have more than one membership row. A clean production
check does not refute it — same evidentiary posture as #74.

**Decisions taken, do not reopen:** all three items in one build · client-side guards only, no
migration and no `UNIQUE` constraint (deferred pending the multi-household question) ·
`ensureHousehold` approved as an in-scope third door · `v0.9.5`.

## How it was built — worth repeating

Implementer and reviewer were **separate agents**; no agent reviewed its own code. Two review
rounds. Round 1 returned **needs-rework** with two blockers that a testing checklist would
never have caught. Round 2 approved.

Two things came out of that worth carrying forward:

- **The reviewer overruled itself.** It instructed raising `isDataLoading` before hydration;
  the implementer refused and explained why (it unmounts Onboarding mid-flight, so on failure
  the flag-clear and `setCreateError` batch into one render that remounts Onboarding fresh with
  the error reset to `null` — a silent failure). On re-review the reviewer agreed its own
  instruction had been wrong. **A sub-agent pushing back on a brief is a good sign, not a
  problem.**
- **The reviewer withdrew a citation it had gotten wrong** (`HealthScoreCard.tsx:33` → `:34`).
  Check specific claims rather than accepting either agent's line numbers.

## Traps — confirmed, do not repeat

- **The 85 canary.** Empty state computes to exactly **85** in `calculateHealthScore`
  (`src/lib/utils.ts`) — `(100 × 0.4) + (50 × 0.3) + (100 × 0.3)` — clearing the `>= 80`
  threshold in `HealthScoreCard.tsx`. An unexplained "Fully Funded" **always** means something
  handed the dashboard empty arrays. Look at loading state, never at the scoring formula.
  Three separate causes have now been traced to this one symptom.
- **Supabase query errors resolve, they do not reject.** `PostgrestBuilder` returns
  `{ data: null, error }`. So a `Promise.all` of failing queries completes *normally* with
  empty arrays. This is why #74 exists and why the last 85 route is still open.
- **Never add a per-component `isDataLoading` guard.** `AppShell` withholds *all* children
  while `session && isDataLoading`, so a component-level guard is unreachable dead code. This
  is A2. #73's original body prescribed exactly this and was wrong.
- **`<AppProvider>` is mounted with no props** (`src/app/layout.tsx`). Server-side session
  prefetch was removed deliberately for #47 — reading `cookies()` in the root layout forces the
  whole app dynamic under `cacheComponents`. So `initialSession` is always `null` and
  `initialIsOnboarded` always `false`. Two separate wrong diagnoses came from forgetting this.
- **`allInFuture` in `src/lib/utils.ts` is NOT safe to remove**, despite #73's original claim.
  `overdueBills` filters the stored `status` **string** while `allInFuture` parses `dueDate` —
  independent. `mapBillFromDb` only ever *upgrades* status to `"Overdue"`, never clears a stored
  `"Overdue"` on a future date, and its `else if` skips the derivation entirely for
  `payment_type === "auto"`. An auto-pay bill with stored `"Overdue"` and a future due date
  scores **100** with the flag, **80** without — an 8-point swing across the 80 boundary.
- **`npm run lint` fails outright** — 96 problems, 53 errors, all pre-existing. One sits on
  `loadData`'s trigger effect, which is a **hard byte-identical constraint**, so a naive
  "fix lint" pass would break the app's loading gate. Do not run one without reading this.
- **Line references in comments go stale within a single session.** Five rounds now. Always
  re-grep after editing; never carry a number forward. This file now avoids citing line
  numbers for exactly that reason.
- **Use `Write` + `--body-file` for GitHub bodies.** Heredocs and PowerShell here-strings both
  break on markdown of any real length — `git commit -m` with an inline here-string containing
  double quotes fails outright.
- **529 Overloaded killed four implementation runs in the previous session.** If it recurs,
  prefer a **fresh** agent with a tight self-contained brief and exact line anchors over
  resuming one with a long transcript.
- **`isolation: "worktree"` sub-agents can end up on the wrong base branch.** Twice this session,
  an agent's sandbox had a stale/unrelated branch checked out (byte-identical to `main`, missing
  every #75/#78 commit) instead of the real target branch — and once the real branch was already
  checked out in the main working tree, the agent couldn't check it out a second time in its own
  worktree at all. Both times the agent worked around it by creating its own branch off the
  correct tip and committing there. **Always verify after an implementer agent reports a commit**:
  check its commit's parent is actually the branch tip you expected, then bring it in with
  `git cherry-pick <hash>` from the real checkout (safe here specifically because the commit sits
  directly on top of the current tip — for a diverged history, this needs a rebase instead) and
  clean up the leftover worktree/branch with `git worktree remove --force` + `git branch -D`.
  Don't assume "the agent committed" means "the commit is on the branch you asked for."
- **`gh api ... -f field=@path` silently does NOT read the file on this Windows/gh setup** — it
  posts the literal string `@path` as the field value instead. Use `-F` (capital) instead, which
  does the file read correctly. Caught only because the PR comment update was verified by
  re-fetching it afterward — always verify a `gh api` PATCH/POST that embeds file content by
  reading it back, don't trust a 200 response alone.

## Unfiled follow-ups from #75 — Anthony to triage

Full detail in [PR #77](https://github.com/mp3anthony/funded/pull/77)'s body.

1. ~~**Onboarding steps 2–5 may be unreachable.**~~ **Resolved as #78.** Confirmed exactly as
   suspected: `createHousehold`'s create path was setting `setIsOnboarded(true)`, dropping
   `AppShell`'s gate the moment step 1 completed. Fixed — only `completeOnboarding()` (step 5's
   "Enter App") sets that flag now. Commit on this branch, folded into PR #77.
2. **`joinHousehold` step 2's rollback trusts unvalidated cached state.** Decides whether to
   cascade-delete a household from `backupState.members`, which is `[]` whenever the members
   query silently errored. Reachable from the normal `loadData` path. The natural successor
   to #75.
3. **Cross-user notification writes** — the generator sits in `AppProvider` above `AppShell`,
   so it runs during Onboarding and can upsert `{ user_id: B, household_id: A }`. No
   user-visible effect; data hygiene only.
4. **`ensureHousehold` discards its `household_members` insert error** yet sets the resolution
   ref regardless.
5. **Two stale line citations in `SPEC.md`** (`:78`, `:99`) point at the wrong code. Already
   wrong before this branch. `SPEC.md` is a governance doc — left alone deliberately.
6. **The server is still not authoritative** — `join-household`'s edge function keeps its gap.
   Standing argument for the deferred `UNIQUE` constraint.
7. **No in-app recovery for an already-duplicated user.** Guards prevent new cases, don't
   repair existing ones. Nobody is in that state.

## #78 and #79 — found and fixed this session, folded into PR #77

Anthony ran PR #77's checklist item 1 (cold-start, new user) and reported feedback rather than a
plain pass/fail. That surfaced two bugs neither the #75 work nor its checklist covered:

- **[#78](https://github.com/mp3anthony/funded/issues/78)** — `createHousehold`'s create path set
  `isOnboarded` true the instant step 1 finished, unmounting the wizard before steps 2–5 ever
  rendered. This was unfiled follow-up 1 above, confirmed by Anthony actually hitting it. Fixed:
  only `completeOnboarding()` sets that flag now. `v0.9.5` → `v0.9.6`.
- **[#79](https://github.com/mp3anthony/funded/issues/79)** — with #78 fixed and steps 2–4
  actually reachable, Anthony went through them, entered a payday and a bill, saw no error — and
  neither showed up anywhere afterward, even after a full app close and relaunch (not just a
  reload, which ruled out stale client state as the explanation). Root cause: `handleNext()` fired
  `updateHouseholdPaymentMode`/`addPayday`/`addBill` without awaiting them or checking for
  failure, so the wizard could reach "Setup Complete" with nothing actually saved. Fixed to match
  step 1's existing await/error/block-advance pattern. `v0.9.6` → `v0.9.7`.

Both were built by an implementer sub-agent and checked by a separate reviewer sub-agent (no agent
reviewed its own code, per protocol). The reviewer caught one real regression in the first #79
attempt — the Back button wasn't disabled during a save, so backing out mid-write while the save
was still in flight could silently bounce the wizard forward again once it resolved, or show the
resulting error banner on the wrong step. A follow-up commit fixed that; **Anthony chose not to
re-review the follow-up commit itself** ("looks good for both" — his call, noted per protocol
rather than assumed).

Both fixes went on the **same branch** (`issue-75-auth-loaddata-hazards`), not new branches or a
new PR — Anthony's explicit call, to close everything out in one PR/merge cycle rather than three.
The PR #77 body has a new "Folded into this PR after round 2" section documenting this; the
canonical checklist comment has three new items (11–13) covering both.

## #80 — found and fixed this session, folded into PR #77

Anthony was working through checklist item 11 (#79's onboarding payday+bill test) and hit a new,
unrelated failure on Step 4 ("First Bill"): every save failed with a raw Postgres error rendered
straight into the UI — `new row for relation "bills" violates check constraint
"bills_frequency_check"`.

Root cause: `Onboarding.tsx`'s bill-frequency `<select>` used capitalized option values
(`"Weekly"`, `"Fortnightly"`, `"Monthly"`, `"Yearly"`) and defaulted `billFrequency` state to
`"Monthly"`. The `bills` table's check constraint only permits lowercase
(`weekly`/`fortnightly`/`monthly`/`yearly`) — see
`supabase/migrations/20260707005200_update_frequency_data_to_fortnightly.sql`. This was the only
frequency picker in the app built this way; `FrequencyToggle.tsx` and `AddBillSheet.tsx` already
used the correct lowercase convention. Pure frontend fix, no schema/migration involved, so it
qualified as an unambiguous bug fix under `CLAUDE.md` §1 — no CRD needed.

Filed as [#80](https://github.com/mp3anthony/funded/issues/80), fixed by a sub-agent (Orchestrator
never edits code directly), diff verified by the orchestrator before commit. `v0.9.7` → `v0.9.8`.
New checklist item 14 covers it — enter each of the four frequency options on Step 4 and confirm
no failure banner, then confirm the saved bill on the Bills page shows the frequency actually
picked.

Same branch, same PR as #75/#78/#79 — Anthony's now-established call to close everything out in
one PR/merge cycle rather than a new branch per bug found during testing.

## The other open tickets

**[#74 — successful-but-empty query results wipe loaded household data](https://github.com/mp3anthony/funded/issues/74)**
· `bug`, `needs-triage` · **needs Anthony's approach decision before building.**

`if (billsRes.data)` in `loadHouseholdRelatedData` — `[]` is truthy, so a query that succeeds
with **zero rows** overwrites loaded arrays with empty ones. Same for `funds`, `paydays`,
`members`, `bill_splits`. RLS returns exactly that shape when the auth token isn't applied yet.
The obvious patch ("only overwrite when non-empty") is **wrong** — it would freeze a bill
deleted on another device. Four approaches are in the issue body.

**#74 and #75 are the same bug class** — a failed query and an empty-but-successful query
collapsing into one code path. Read the merged #75 fix before picking a #74 approach. Add
follow-up 3 from the PR body to #74's description: it is the one remaining route to the 85
canary, and it is purely this pattern.

**[#71](https://github.com/mp3anthony/funded/issues/71)** PWA stale cache — two open
implementation-shape questions (cache-busting mechanism, offline tradeoff) to resolve at kickoff.

**[#37](https://github.com/mp3anthony/funded/issues/37)** household timezone UI — one open
question (any member vs admin-only). Now **load-bearing** for notifications: "notify me at 6pm
my local time" needs a timezone the user can set, and every household is currently hardcoded to
`Australia/Sydney`. **Per-household vs per-user is undecided** and materially changes the build.

**Notification delivery bug — diagnosed, still NOT filed.** Anthony gets no push on Android or
iOS; instead a notification appears 5–10s *after* opening the app. Two reminder generators
exist: the server cron (`src/app/api/cron/push-reminders/route.ts`) and a client-side copy in
`AppContext` that runs on app load — the client path is the 5–10s symptom. `vercel.json`
schedules the cron `0 20 * * *` = 20:00 **UTC** ≈ 6am Sydney; Vercel crons are UTC-only. Push
only lands if a live `push_subscriptions` row exists, so if permission was never granted or iOS
expired the subscription, the cron delivers nothing silently. **Anthony to decide: own issue, or
folds into the notifications CRD.**

## `SPEC.md` Part A at a glance

- **Part A is final** — A1 (5 escalation gates) / A2 (8 standing rules). Do not reopen unless
  Anthony raises something new.
- **A1 — mandatory escalation, stop and ask Anthony.** RLS mandatory · service-role key
  server-only · `convertAmount` normalisation before comparing amounts · stack changes ·
  branching (absolute prohibition, never commit to `main`).
- **A2 — follow, do not escalate.** `parseBillDate`/`todayInZone` for all date parsing ·
  `cacheComponents` and its `export const runtime` consequence · notification dismissal as
  mark-as-read · the centralised `isDataLoading` gate · no `fixed` inside `overflow:hidden` ·
  Next.js viewport API · mobile-first PWA · versioning discipline.

## Open process items

- **Protocol labels don't match the repo.** `CLAUDE.md` §3 names `needs-manual-test`,
  `needs-merge-approval` and `out-of-spec`; **none exist.** Actual labels: `bug`, `Change`,
  `documentation`, `duplicate`, `enhancement`, `help wanted`, `invalid`, `question`, `wontfix`,
  `Critical`, `Epic`, `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`,
  `ready-for-testing`. `ready-for-testing` is the de facto equivalent of the first and was used
  for PRs #76 and #77. Anthony to choose: rename the protocol to match the repo, or create the
  missing labels. Five minutes, still undecided.
- **`CHANGE-LOG.md` count discrepancy, unresolved.** An earlier handoff said "7 pending
  entries" in three places but listed only **6**. Verify the real count at triage.

## Then: `CHANGE-LOG.md` triage + CRD interview

Anthony puts the client hat on, triages the pending entries (count unverified), then the `crd`
skill runs live. Covers the dynamic/interactive overhaul (the swipeable gauge is **one of
several ideas** — he has more to bring), the dashboard, bills-vs-expenses, and notifications.

Findings to carry in:

- **The notifications mechanism works and is cheap:** run the cron **hourly** instead of daily
  and process each household only when its local hour matches its chosen notify hour. No new
  infrastructure. Depends on #37.
- **Bills-vs-Expenses is the biggest pending item.** Not just an add-screen toggle — dashboard
  totals, contribution splits, the reminder generator and #70's category ordering all read
  `bills`, and each needs a deliberate decision.
- **Direct Pay is untested *logic*, not just untested UI.** `calculateHealthScore`'s
  budget-coverage half runs a completely different calculation in Direct Pay mode (sums
  `billSplits` rather than contributions). Waiting on real direct-pay testers is the right call.
- **Multi-household vs one-household-per-user** is now a live schema question, raised by #75.
  Deciding it unblocks the `UNIQUE` constraint.

## Reference

- Protocol: [`CLAUDE.md`](CLAUDE.md) — read first.
- Working spec: [`SPEC.md`](SPEC.md) — **Part A final (A1/A2)**. Part B Slices 1 (#71) and 3
  (#37) still open. Two stale line citations, see follow-up 5.
- Out-of-spec inbox: [`CHANGE-LOG.md`](CHANGE-LOG.md) — pending entries awaiting triage.
- **Awaiting test: PR #77** https://github.com/mp3anthony/funded/pull/77 (closes #75, #78, #79,
  #80 — `v0.9.8`)
- Merged: PR #76 https://github.com/mp3anthony/funded/pull/76 (`v0.9.4`)
- Closed: #73 https://github.com/mp3anthony/funded/issues/73 (kept as the written record of the
  health-score investigation and its two wrong diagnoses)
- Open: #75, #78, #79, #80 (all PR up, same PR), #74, #71, #37

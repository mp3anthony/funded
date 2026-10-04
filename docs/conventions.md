# Conventions

Binding build and process rules. Vocabulary lives in `docs/context/`; this file is about how to build and ship.

## Document roles

- `SPEC.md`: requirements, technical guardrails (Part A: A1 escalation gates, A2 standing rules) and the vertical slices. The working reference during builds. There is no separate CRD or design-reference document.
- New features: file a to-spec issue, agree it with Anthony, then fold it into `SPEC.md`.
- `CHANGE-LOG.md`: append-only inbox for out-of-spec requests, triaged on demand.
- `HANDOFF.md`: current state only (where we left off, what is next). Durable facts go to their home in `CLAUDE.md`'s "Where knowledge lives", never into `HANDOFF.md`. There is no archive file; git history holds prior versions.
- `docs/context/` holds vocabulary, `docs/adr/` holds hard-to-reverse decisions, `docs/lessons.md` and `docs/environment.md` hold lessons and operations.

## Versioning

- `src/lib/version.ts` (`APP_VERSION`) is the single source of truth for the display version. The `version` field in `package.json` is unused npm metadata and is not the source.
- Bump `+0.0.1` per preview build (`v0.9.x` while pre-testing; `v0.9.0` was deliberately skipped). Do not bump as a side effect of an unrelated change. A rework commit on the same open PR does not re-bump; a new build cycle does.
- Confirm the exact resulting version with Anthony immediately before merging to `main`. He can waive a bump. When parallel PRs collide on the version, renumber and confirm again.
- Milestones: `v0.10.0` when the app is ready for wider testers, `v1.0.0` for public beta. This is a loose guideline; the version applied at each merge is decided with Anthony at merge time.
- The version shows at the bottom of Settings and in the "What's new" popup, both read from `APP_VERSION`; never restate the current version in a doc.
- Merge conflicts on `version.ts` and `src/lib/patch-notes.ts` are common when two same-day PRs both bump: keep the higher version and both entries. If both land on the same version number, combine the bullets under one entry.

## Patch notes

Every version bump gets a patch-notes entry (the user-facing "What's new" file, `src/lib/patch-notes.ts`, hand-written, newest first) as part of the same PR, not a follow-up. This applies even to backend-only, infra, or under-the-hood changes with no UI difference: write what changed in plain language a non-technical user would understand, framing it around the practical effect (what is more reliable, what behaves differently, what to expect), not the mechanism. A pure internal change with genuinely zero user-facing effect still gets a one-line entry saying so (for example "cleaned up something behind the scenes, no visible change") rather than being skipped silently.

The popup shows once per version, tracked by a last-seen version key in localStorage; write the key in the same pass that shows the popup. It is delayed about 1200ms so it does not cover the first taps. The hidden `/patch-notes` page is reached from Settings. Docs-only or tooling-only PRs carry no version bump and no patch note.

## Getting started guide

- The public `/getting-started` page (copy in `src/lib/getting-started.ts`) is linked from Settings and from the Hazardous Schematics website. Never rename or move the URL.
- Every PR that changes user-visible behaviour states "Getting started guide: checked, no change" in its description, or includes the guide update. The independent reviewer checks that line. Docs-only and tooling-only PRs are exempt.
- Each "Good to know" item records the ticket it works around (data only, never shown). Delete the item in the PR that closes that ticket.

## Build conventions

- **TypeScript:** strict types, no `any` unless suppressed with a comment. One component per file, `PascalCase` filenames.
- **State** is centralised in `AppContext.tsx`; pages consume it through `useApp()` and `useCurrentUser()`. Every new piece of AppContext state must be checked for the state-desync bug class (see `docs/lessons.md`).
- **Styling:** Tailwind utility classes that reference the CSS custom property tokens; avoid hard-coded colour values. Check contrast in both themes (a lime Undo button on grey was near-invisible in light theme at 1.79:1).
- **Motion is premium-minimal, no bounce.** Motion tokens were raised about 30% after Anthony found motion too minimal (`--duration-base` 260ms, `--duration-slow` 520ms). Collapse and expand use the `grid-template-rows` 1fr to 0fr technique with the shared tokens. `--ease-standard` (`cubic-bezier(0.16,1,0.3,1)`) is a decelerate curve that finishes opacity in the first 20 to 30%, so a crossfade on it looks like a pop: use ease-in-out for plain fades, and if a fade looks instant, check the easing token first. Keep the transition class always present and do instant dismissal through a `transitionDuration` DOM override, because toggling the class and the opacity in one render leaves nothing to transition from. Menus use an open / closing / closed state machine so the exit animation plays before unmount. Use the `useReducedMotion` hook for reduced motion.
- **Bills and expenses share one row vocabulary:** `RowPill` variants are primary (lime, Auto-Pay), success (green, Manual) and accent (amber, Expense); `ItemTypeToggle` is a labelled sliding switch ("Item Type") whose caption names the other state ("Switch to Expense" / "Switch to Bill").
- **Dates:** never use `toISOString().split("T")[0]` on a local-midnight date (it rolls back a day for UTC-plus households); use `toLocalYmd(date)`. `parseDateForDb` returns a date-only string unchanged. Server and cron code must pass the household-local today (`todayInZone(tz)` from `src/lib/notifications/timezone.ts`) into `adjustAutopayBillDate`'s optional `todayYmd` parameter, never the Vercel process UTC clock; the cron and the UI must share that auto-pay rollforward so "overdue" agrees in both.
- **File pickers on iOS Safari:** a hidden input clicked from a script is unreliable inside sheets; use a label-wrapped input.
- **Safari and backdrop-filter:** Safari does not animate opacity on an element that also carries `backdrop-filter`; put the dim and blur on an inner element.
- **Dashboard tips** live in `dashboard-tips.ts` (plain string array). Update the tips whenever a shipped feature changes user-facing behaviour. The ticker sits above the mobile BottomNav using AppShell's clearance value.
- **Icons (#174):** the tab favicon and the home-screen icon (apple-touch-icon and manifest icons) are the light icon with a `?v=3` cache-bust; leave the manifest `theme_color`, `background_color` and the viewport `themeColor` alone. Trade-offs are in `docs/lessons.md`.
- **Manual-test checklist format:** numbered scenarios, each with (1) a short bold title, (2) exact setup steps, (3) one pass line, (4) an optional fail line only for a specific wrong-looking failure worth naming. Explain what each test catches, not just the click path. Call out any step that must happen without a reload or in a single tab. Write them in plain language and post the record on the issue, not only the PR description.
- **Checklists target iPhone (iOS Safari) only,** never Android. Code must still work on iOS and Android.

## Standing constraints

- **Funded is a mobile app.** It is an installed home-screen app (iPhone for Anthony; Hannah uses Android in real life). Never lead with, test or ask about desktop behaviour.
- **Never commit directly to `main`;** work on milestone branches only. Issue closure triggers merge.
- The hard technical invariants (RLS mandatory, service-role key server-only, stack changes, the standing rules) live in `SPEC.md` Part A1 and A2. They are binding and are not copied here.
- **Goals, not Funds:** the `/funds` route is the Goals page. Say Goals in anything Anthony reads; the route and code names are unchanged and there is no app-wide rename.

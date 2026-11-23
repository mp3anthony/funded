# Environment and operations

Names only; never put secret values. Repo is public: no emails, full ids or tokens.

## Hosting

- Repo: `mp3anthony/funded` on GitHub, **public** (flipped private and back on 2026-09-26; the only side effect was stars and watchers being wiped). Never commit to `main`; milestone branches only.
- Vercel: Hobby plan. Production is `main`; every other branch gets a preview. The Hobby plan allows cron once per day only.
- `vercel.json` carries one cron: `0 15 * * *` (3pm UTC) on `/api/cron/push-reminders`, once a day. It is now only a fallback to the pg_cron job (see Supabase). After any merge touching `vercel.json`, confirm a production deployment reached READY (see `docs/lessons.md`, Process).
- Service worker: hand-written, `CACHE_NAME` is stamped per deploy by `scripts/stamp-sw.mjs` as the npm `prebuild` step (`VERCEL_GIT_COMMIT_SHA`, else `VERCEL_DEPLOYMENT_ID`, else a dev timestamp). Navigation uses stale-while-revalidate through `event.waitUntil`; asset caching is untouched (same-origin non-navigation GETs are cache-first per build), except that `/api/` requests are bypassed so live data such as `/api/known-issues` is never frozen (#152). A local build dirties `public/sw.js`: restore it, never commit it (`docs/adr/0001-hand-written-service-worker.md`).
- Bug reports: a fine-grained GitHub token (funded repo only, Issues read/write only), used server-side only. Screenshots go to the Supabase bucket `bug-report-screenshots` (public read, authed write, 5MB cap, image-mime whitelist widened to HEIC/HEIF/GIF) and are linked as a markdown image, since GitHub has no attachment API. The route no longer returns an issue URL or number; users see only the issues labelled `known-issue` (blurb text only) in the Known Issues tab, plus the patch notes.
- Known Issues (#152): `/api/known-issues` reads the public GitHub API unauthenticated (60 requests/hour per IP, shared on Vercel; no env var), cached about 15 minutes (5 after a failure). Each preview and production build also spends one call at prerender time. If the tab shows its fallback too often, add the bug-report token as a Bearer header.
- Auth email: no app code sends email; only Supabase Auth does (Confirm signup, Reset password), through Mailjet SMTP (Supabase dashboard > Auth > Emails > SMTP Settings, host `in-v3.mailjet.com`, port 587; credentials live only there). Sender is a `noreply@` address on the `funded.hazardousschematics.com` subdomain, display name "Funded App". The domain is validated in Mailjet with SPF/DKIM authenticated; the three TXT records (validation, SPF at `funded`, DKIM at `mailjet._domainkey.funded`) live in Vercel DNS for `hazardousschematics.com`. Mailjet's Vercel auto-configure (Entri Connect) was declined on purpose (it needs read/write on all team domains): add DNS records by hand. DMARC is not set up (optional). Templates: the source of truth is `supabase/email-templates/` (`confirm-signup.html`, `reset-password.html`); Supabase keeps its own copy, so change the repo first, then paste by hand into Supabase dashboard > Auth > Email Templates, and only after any `public/email/` file they reference is deployed to production. Use the `funded-alpha.vercel.app` host for email images, not the `funded.` custom domain (avoids a DNS dependency). Mailjet click tracking must be off for these sends, or links may be rewritten and break. Rendering gotchas (Gmail dark mode, dashboard preview): `docs/lessons.md`. **DNS gotcha (2026-10-01 outage):** adding the Mailjet TXT records at `funded` stopped the wildcard ALIAS applying to that name, so the custom domain returned 503 / Vercel "Invalid Configuration" until an explicit `A funded 76.76.21.21` record was added in Vercel DNS. Any explicit record at `funded` needs that A record alongside it (a CNAME cannot coexist with the TXT records).

## Supabase

- Migrations live in `supabase/migrations/`. A build agent writes the migration file; the orchestrator applies it to production with `apply_migration` once Anthony has approved the schema change (that approval is the escalation gate, so applying is then routine). Sub-agents never call `apply_migration`.
- **Classifier-block fallback:** the auto-mode classifier can block `apply_migration`, permission-rule edits and session-token reads. Do not retry and do not edit `settings.json`: hand Anthony the SQL-editor steps (or the command). If `gh pr merge` is blocked, hand Anthony the command.
- **pg_cron jobs (production):** `generate-scheduled-reminders` runs every 15 minutes and calls `/api/cron/push-reminders`; the delivery job runs every 5 minutes through pg_net and calls `/api/cron/deliver-scheduled` on the production URL. The schedule secrets live in Supabase Vault (created with `vault.create_secret`, read through `vault.decrypted_secrets`); Anthony pastes the same value into the matching Vercel env var (Production scope), because the Vercel MCP cannot write env vars. Pattern and rationale: `docs/adr/0004-pg-cron-for-scheduling-not-vercel-cron.md`.
- The generation route accepts two independent bearer secrets (`CRON_SECRET` or `GENERATION_CRON_SECRET`) and returns 500 only if both are unset.
- Edge functions in `supabase/functions` (`join-household`, `delete-household`, `leave-household`, `delete-account`, and others) are deployed separately from the app: `supabase functions deploy`, then check the deployed version through the MCP. Using the service-role key in a new place is a stop-and-ask item (SPEC A1).
- Storage: the `bug-report-screenshots` bucket (see Hosting).

## Env var names

Names only. Client-safe: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Server-only: `VAPID_PRIVATE_KEY`, `VAPID_CONTACT_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS; the cron routes and the household edge functions), `CRON_SECRET`, `GENERATION_CRON_SECRET`, `DELIVER_CRON_SECRET`, `GITHUB_BUG_REPORT_TOKEN`. `GITHUB_BUG_REPORT_TOKEN` is Production-scope only, which is correct because only real users file reports; Preview correctly shows "not configured". The variables are documented, with a comment each, in `.env.local.example` and set in `.env.local` locally, which is git-ignored: never open or print it. Never prefix a server secret with `NEXT_PUBLIC_`.

## Testing policy

- Claude sessions do not create Funded users or type passwords: login hits the live Supabase. Anthony does the manual testing; a session may seed `TEST-` rows into his household by SQL and delete them after. Details, the push test method and the pr-browser-triage rules: `docs/lessons.md`, Testing.

## Devices

- Anthony tests on his iPhone (installed home-screen app, iOS Safari). Real users also run Android (Samsung Internet or Chrome), but live-check notes never target Android; Android is exercised post-merge on `main` by real users, and code must still work on both.
- Funded is a mobile app: never lead with, test or ask about desktop behaviour.
- Fully close and reopen the installed app before a live check so the new service worker is active.

## Tooling

- `gh` and PowerShell quirks (body files, `-F` versus `-f`) are in `docs/lessons.md`, Tooling.

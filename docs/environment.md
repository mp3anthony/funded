# Environment and operations

Names only; never put secret values. Repo is public: no emails, full ids or tokens.

## Hosting

- Repo: `mp3anthony/funded` on GitHub, **public** (flipped private and back on 2026-09-26; the only side effect was stars and watchers being wiped). Never commit to `main`; milestone branches only.
- Vercel: Hobby plan. Production is `main`; every other branch gets a preview. The Hobby plan allows cron once per day only.
- `vercel.json` carries one cron: `0 15 * * *` (3pm UTC) on `/api/cron/push-reminders`, once a day. It is now only a fallback to the pg_cron job (see Supabase). After any merge touching `vercel.json`, confirm a production deployment reached READY (see `docs/lessons.md`, Process).
- Service worker: hand-written, `CACHE_NAME` is stamped per deploy by `scripts/stamp-sw.mjs` as the npm `prebuild` step (`VERCEL_GIT_COMMIT_SHA`, else `VERCEL_DEPLOYMENT_ID`, else a dev timestamp). Navigation uses stale-while-revalidate through `event.waitUntil`; asset and API caching are untouched. A local build dirties `public/sw.js`: restore it, never commit it (`docs/adr/0001-hand-written-service-worker.md`).
- Bug reports: a fine-grained GitHub token (funded repo only, Issues read/write only), used server-side only. Screenshots go to the Supabase bucket `bug-report-screenshots` (public read, authed write, 5MB cap, image-mime whitelist widened to HEIC/HEIF/GIF) and are linked as a markdown image, since GitHub has no attachment API. The route no longer returns an issue URL or number; users follow issues through the Known Issues tab and patch notes.
- Transactional email: nothing in the repo sends email. Supabase Auth sends through Mailjet SMTP (Supabase dashboard > Auth > Emails > SMTP Settings, host `in-v3.mailjet.com`, port 587; credentials live only there). Sender is `Funded App <noreply@funded.hazardousschematics.com>` (done in #156, 2026-10-01). Mailjet has the `funded.hazardousschematics.com` domain validated and SPF/DKIM authenticated; the three TXT records (validation, SPF at `funded`, DKIM at `mailjet._domainkey.funded`) are in Vercel DNS for `hazardousschematics.com`. Mailjet's Vercel auto-configure (Entri Connect) was declined on purpose: it needs read/write on all team domains, so add DNS records by hand. DMARC is not set up (optional).

## Supabase

- Migrations live in `supabase/migrations/`. A build agent writes the migration file; the orchestrator applies it to production with `apply_migration` once Anthony has approved the schema change (that approval is the escalation gate, so applying is then routine). Sub-agents never call `apply_migration`.
- **Classifier-block fallback:** the auto-mode classifier has blocked `apply_migration` for a data-fix migration. Do not retry or edit `settings.json`: hand Anthony the SQL-editor steps.
- **pg_cron jobs (production):** `generate-scheduled-reminders` runs every 15 minutes and calls `/api/cron/push-reminders`; the delivery job runs every 5 minutes through pg_net and calls `/api/cron/deliver-scheduled` on the production URL. The schedule secrets live in Supabase Vault (created with `vault.create_secret`, read through `vault.decrypted_secrets`); Anthony pastes the same value into the matching Vercel env var (Production scope), because the Vercel MCP cannot write env vars. Pattern and rationale: `docs/adr/0004-pg-cron-for-scheduling-not-vercel-cron.md`.
- The generation route accepts two independent bearer secrets (`CRON_SECRET` or `GENERATION_CRON_SECRET`) and returns 500 only if both are unset.
- Edge functions in `supabase/functions` (`join-household`, `delete-household`, and others) are deployed separately from the app: `supabase functions deploy`, then check the deployed version through the MCP. Using the service-role key in a new place is a stop-and-ask item (SPEC A1).
- Storage: the `bug-report-screenshots` bucket (see Hosting).

## Env var names

Names only. Client-safe: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Server-only: `VAPID_PRIVATE_KEY`, `VAPID_CONTACT_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS; the cron routes only), `CRON_SECRET`, `GENERATION_CRON_SECRET`, `DELIVER_CRON_SECRET`, `GITHUB_BUG_REPORT_TOKEN`. `GITHUB_BUG_REPORT_TOKEN` is Production-scope only, which is correct because only real users file reports; Preview correctly shows "not configured". The variables are documented in `README.md` (Environment variables) and set in `.env.local` locally, which is git-ignored: never open or print it. Never prefix a server secret with `NEXT_PUBLIC_`.

## Testing policy

- Claude sessions do not create Funded users or type passwords: login hits the live Supabase. Anthony does the manual testing; a session may seed `TEST-` rows into his household by SQL and delete them after. Details and the push test method: `docs/lessons.md`, Testing.
- A local Supabase (Docker) with a seeded test user was offered as the only compliant way for Claude to log in; Anthony declined for now and it was not filed. Do not build it unprompted.
- pr-browser-triage runs against local `npm run dev` with disposable accounts, never the owner's real accounts.

## Devices

- Anthony tests on his iPhone (installed home-screen app, iOS Safari). Hannah uses Android (Samsung Internet) in real life, but checklists never target Android; Android is exercised post-merge on `main` by real users, and code must still work on both.
- Funded is a mobile app: never lead with, test or ask about desktop behaviour.
- Fully close and reopen the installed app before a live check so the new service worker is active.

## Tooling

- **agy** (Antigravity) delegation: see `GEMINI-DELEGATION.md` and `scripts/agy-delegate.ps1`. The kit lives in `agy-delegation-kit` under the `hazardous-schematics` folder on Anthony's machine. Re-syncs keep the script byte-identical and keep this repo's adapted rules 5 and 6. Gotchas: `docs/lessons.md`, Tooling. Loose end: when #183 (a design reference document) lands, restore the kit's design-foundation rule in `GEMINI-DELEGATION.md` (rule 5 currently points at `SPEC.md` Part A).
- **Gemini CLI is dead;** never use the `gemini-cli` MCP.
- `markitdown` (installed globally with pipx) converts PDF, DOCX, PPTX, XLSX, images, audio and HTML to Markdown: `markitdown path-to-file.ext -o output.md`. `ffmpeg` was installed alongside it (winget) for audio and video transcription.
- **/brag launch video:** output goes outside the repo, under `brag-output/funded/<timestamp>` in the `hazardous-schematics` folder on Anthony's machine (first run 2026-09-24). Check the music licence (the brag skill's `assets/music/README.md`) before posting publicly.
- **Kept worktree branch** `worktree-agent-afa605247a48203f1`: do not delete without Anthony's go-ahead (see `docs/lessons.md`, Known non-blocking items).
- `gh` and PowerShell quirks (body files, `-F` versus `-f`) are in `docs/lessons.md`, Tooling.

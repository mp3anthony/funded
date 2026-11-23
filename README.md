# funded.

**Fund the house first. Everything else comes second.**

Funded is a household cash-flow app that answers one question per payday: *how much should each person transfer to cover the bills?* It isn't a budgeting tool that tracks every coffee, it calculates each contributor's share of household expenses so bills are covered before personal spending begins.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [Project structure](#project-structure)
- [Where things are documented](#where-things-are-documented)
- [PWA support](#pwa-support)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Versioning](#versioning)
- [License](#license)
- [Credits](#credits)

---

## Features

Funded helps a household cover its bills from everyone's pay: bills and expenses, savings goals and pay rules, a dashboard verdict, reminders and push notifications, light and dark mode, and an installable home-screen app. The full screen-by-screen list is in [`SPEC.md`](SPEC.md); vocabulary is in [`CONTEXT-MAP.md`](CONTEXT-MAP.md).

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, `cacheComponents` enabled) |
| Language | TypeScript 5 |
| UI | React 19 |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) with CSS custom properties |
| Icons | [Lucide React](https://lucide.dev/) |
| Backend / DB | [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage + Edge Functions + `pg_cron` scheduling) |
| Auth | Supabase Auth (implicit flow, email confirmation) |
| File storage | Supabase Storage (avatar uploads, bug-report screenshots) |
| Server-side Supabase | [@supabase/supabase-js](https://www.npmjs.com/package/@supabase/supabase-js) with the service-role key, inside the cron route handlers only |
| Web push | [web-push](https://www.npmjs.com/package/web-push) (VAPID) for reminder notifications |
| Utilities | clsx, tailwind-merge, tailwindcss-animate |

---

## Prerequisites

- **Node.js** ≥ 20.9 (required by Next.js 16)
- **npm** (ships with Node)
- A **Supabase** project ([create one free](https://supabase.com/dashboard))

---

## Getting started

```bash
# 1. Clone the repository
git clone https://github.com/mp3anthony/funded.git
cd funded-nextjs

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.local.example .env.local   # then fill it in (see below)

# 4. Run the database migrations (see Database setup)

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build (a `prebuild` step first stamps the service worker cache name via `scripts/stamp-sw.mjs`) |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the unit tests (`node --test`) |

---

## Environment variables

Copy `.env.local.example` to `.env.local` and fill it in. The example file lists every variable with a comment saying what it is for; the names are also listed in [`docs/environment.md`](docs/environment.md). Server-only secrets must never be prefixed with `NEXT_PUBLIC_`.

The Supabase URL and anon key are in your Supabase project dashboard under **Settings → API**. `CRON_SECRET`, `GENERATION_CRON_SECRET` and `DELIVER_CRON_SECRET` are any long random strings, set to the same values in Vercel and in the matching scheduler. `GITHUB_BUG_REPORT_TOKEN` is optional (production only); without it the in-app bug report route reports not configured.

> **Note:** `.env*` files are git-ignored, except the placeholder file `.env.local.example`. Never commit real credentials.

---

## Database setup

The Supabase schema is defined in the `supabase/` directory. Run these SQL files in order via the Supabase SQL Editor:

1. **`supabase/legacy/schema.sql`**, core tables: `households`, `bills`, `funds`, `paydays`
2. **`supabase/legacy/household_members_table.sql`**, the `household_members` table
3. **`supabase/legacy/rls_policies.sql`**, row-level security policies
4. **`supabase/legacy/secure_rls_policies.sql`**, additional hardened RLS rules
5. **`supabase/migrations/`**, apply each migration file in order. The un-dated files come first, then the date-prefixed files in filename order.

> **Note:** the legacy SQL files and the migrations together cannot rebuild a database from scratch. Some tables (for example notifications, notification settings and push subscriptions) have no `CREATE TABLE` in the repo. The live Supabase project is the source of truth; see [`docs/environment.md`](docs/environment.md) for how it is managed.

### Edge Functions

- **`supabase/functions/join-household/`**, serverless function that handles household join code validation and member addition
- **`supabase/functions/delete-household/`**, serverless function that handles deleting a household
- **`supabase/functions/delete-account/`**: serverless function that deletes the signed-in user's account (storage, household step, personal rows, then the login last)
- **`supabase/functions/leave-household/`**, serverless function that lets a member leave; an only owner must hand ownership to an accepted member first (moves `households.user_id` to a remaining owner)

Edge Functions are deployed separately from the app (`supabase functions deploy`).

### Storage

Two Storage buckets are used: `avatars` (public, for avatar image uploads) and `bug-report-screenshots` (screenshots attached to in-app bug reports). Both are configured by migrations in `supabase/migrations/`.

### Auth email templates

`supabase/email-templates/` holds the source HTML for the Confirm signup and Reset password emails. Supabase keeps its own copy, so changes are pasted by hand into the Supabase dashboard (Auth → Email Templates).

### Scheduling

Reminders are generated and delivered by two cron routes (see [`docs/context/notifications/notifications.md`](docs/context/notifications/notifications.md)). In production a Supabase `pg_cron` job calls each of them every few minutes; `vercel.json` also carries a once-a-day Vercel Cron on `/api/cron/push-reminders` as a fallback.

---

## Project structure

- `src/app/` Next.js App Router pages and `api/` route handlers (bug report, known issues, cron, push)
- `src/components/` UI components, with shared primitives in `ui/`
- `src/context/AppContext.tsx` global state (auth, data, CRUD)
- `src/lib/` shared logic (verdict maths, bill cycles, notifications, push, patch notes, `version.ts`)
- `src/types/` shared TypeScript types
- `supabase/` `migrations/`, `functions/` (Edge Functions), `email-templates/`, `legacy/`
- `public/` icons, manifest, service worker (`sw.js`), email images
- `scripts/` build helpers
- `docs/` conventions, environment notes, lessons, glossaries, ADRs

---

## Where things are documented

| Looking for | Go to |
|-------------|-------|
| Screens, routes and requirements | [`SPEC.md`](SPEC.md) |
| Look, feel and UI rules (fonts, colour tokens, themes, mobile rules) | [`DESIGN-REFERENCE.md`](DESIGN-REFERENCE.md) |
| Vocabulary and key logic (verdict, payment modes, pay rules, reminders) | [`CONTEXT-MAP.md`](CONTEXT-MAP.md) and [`docs/context/`](docs/context/) |
| Build and process conventions, versioning, patch notes | [`docs/conventions.md`](docs/conventions.md) |
| Hosting, Supabase, env var names, testing | [`docs/environment.md`](docs/environment.md) |
| Lessons and known items | [`docs/lessons.md`](docs/lessons.md) |
| Architectural decisions | [`docs/adr/`](docs/adr/) |

---

## PWA support

Funded is a Progressive Web App. The following files enable installation and offline support:

| File | Purpose |
|------|---------|
| `public/manifest.json` | App name, theme colour (`#c8ff00`), icons, display mode (`standalone`) |
| `public/sw.js` | Service worker: pages are served stale-while-revalidate, with an offline fallback (`/api/` requests are never cached); the cache name is stamped per deploy by `scripts/stamp-sw.mjs` |
| `public/icons/` | App icons at 192×192 and 512×512 |
| `src/app/offline/` | Offline fallback page |

The service worker is **automatically unregistered in development** (localhost) and only registers in production.

---

## Deployment

### Vercel (current)

The app is deployed on Vercel. Pushes to `main` trigger an automatic production deployment.

```bash
npm run build
# Deploy via Vercel CLI or Git integration on the main branch
```

### Environment variables

Ensure every variable in `.env.local.example` is configured in your deployment platform's environment settings (`GITHUB_BUG_REPORT_TOKEN` in production only). `vercel.json` registers a once-a-day cron on `/api/cron/push-reminders`; the more frequent schedules run from Supabase `pg_cron`. Hosting details are in [`docs/environment.md`](docs/environment.md).

---

## Contributing

This is a solo project built by an orchestrator session and a sub-agent team under Anthony's direction. The workflow, rules and roles live in [`CLAUDE.md`](CLAUDE.md); build conventions are in [`docs/conventions.md`](docs/conventions.md). Every change goes on a branch and PR with an independent review; the orchestrator merges a clean PR and asks Anthony first about anything else.

---

## Versioning

The version shown in Settings under Updates comes from `src/lib/version.ts` (`APP_VERSION`), not `package.json`. The bump and patch-notes rules are in [`docs/conventions.md`](docs/conventions.md) (Versioning, Patch notes); this README does not restate the current version.

---

## License

Private, all rights reserved.

---

## Credits

```
© 2026 HazardousSchematics.com
```

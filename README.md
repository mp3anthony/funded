# funded.

**Fund the house first. Everything else comes second.**

Funded is a household cash-flow app that answers one question per payday: *how much should each person transfer to cover the bills?* It isn't a budgeting tool that tracks every coffee — it calculates each contributor's share of household expenses so bills are covered before personal spending begins.

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

- **Payday transfers** — enter income per contributor and the app calculates exact weekly transfer amounts to cover household bills in full
- **Bill tracking** — manage bills across any frequency (weekly, fortnightly, monthly, yearly) with paid/due-soon/overdue status tracking, plus pausing, auto-pay bills and a permanent "Undo payment" on the last paid cycle
- **Expenses** — variable spending (groceries, fuel) that counts toward the household total as a weekly amount
- **Frequency normalisation** — all bills convert to a common frequency for apples-to-apples comparison
- **Savings goals** — targets with progress rings, a pace line, manual top-ups, and a Wish list of goals you are not saving towards yet
- **Pay rules** — rules that send a share of pay above a threshold to a goal, set per goal or per member
- **Payment modes** — choose between Joint Fund (pooled pot) or Direct Pay (split bills between members)
- **Multi-member households** — invite members via join code, manage roles (owner/member), and assign bill splits
- **Dashboard verdict** — one line at the top says "Bills covered" or "Short $X a week", worked out weekly from your pay (or contributions) against bills and expenses
- **Check impact** — a calculator on Bills and Goals that shows what a new payment plan or subscription would do to the household total, and can turn it into a bill
- **Notifications** — in-app notification centre plus web push reminders (bills, pending pay, payday, goals), read/unread state, per-type settings, a per-member notify hour and a household timezone
- **Light and dark mode** — automatic via `prefers-color-scheme` CSS media query, with a manual Light / Dark / System choice under Appearance in Settings (applied as a `.dark` / `.light` class)
- **PWA** — installable as a home screen app on iOS Safari and Android Chrome with an offline fallback page
- **In-app help** — a public Getting started guide, an Updates page (patch notes) with a Known Issues tab, a first-open Updates card, and in-app bug reporting
- **Authentication** — email/password auth via Supabase (implicit flow, session persisted in `localStorage`), email confirmation, and password reset

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

1. **`supabase/legacy/schema.sql`** — core tables: `households`, `bills`, `funds`, `paydays`
2. **`supabase/legacy/household_members_table.sql`** — the `household_members` table
3. **`supabase/legacy/rls_policies.sql`** — row-level security policies
4. **`supabase/legacy/secure_rls_policies.sql`** — additional hardened RLS rules
5. **`supabase/migrations/`** — apply each migration file in order. The un-dated files come first, then the date-prefixed files in filename order.

> **Note:** the legacy SQL files and the migrations together cannot rebuild a database from scratch. Some tables (for example notifications, notification settings and push subscriptions) have no `CREATE TABLE` in the repo. The live Supabase project is the source of truth; see [`docs/environment.md`](docs/environment.md) for how it is managed.

### Edge Functions

- **`supabase/functions/join-household/`** — serverless function that handles household join code validation and member addition
- **`supabase/functions/delete-household/`** — serverless function that handles deleting a household
- **`supabase/functions/leave-household/`** — serverless function that lets a member leave; an only owner must hand ownership to an accepted member first (moves `households.user_id` to a remaining owner)

Edge Functions are deployed separately from the app (`supabase functions deploy`).

### Storage

Two Storage buckets are used: `avatars` (public, for avatar image uploads) and `bug-report-screenshots` (screenshots attached to in-app bug reports). Both are configured by migrations in `supabase/migrations/`.

### Auth email templates

`supabase/email-templates/` holds the source HTML for the Confirm signup and Reset password emails. Supabase keeps its own copy, so changes are pasted by hand into the Supabase dashboard (Auth → Email Templates).

### Scheduling

Reminders are generated and delivered by two cron routes (see [`docs/context/notifications.md`](docs/context/notifications.md)). In production a Supabase `pg_cron` job calls each of them every few minutes; `vercel.json` also carries a once-a-day Vercel Cron on `/api/cron/push-reminders` as a fallback.

---

## Project structure

```
funded-nextjs/
├── public/
│   ├── icons/                # PWA and app icons, logos
│   ├── email/                # Images used by the auth email templates
│   ├── manifest.json         # PWA manifest
│   └── sw.js                 # Service worker (offline support)
├── scripts/
│   └── stamp-sw.mjs          # Stamps the service worker cache name at build time
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── layout.tsx        # Root layout (fonts, metadata, providers)
│   │   ├── globals.css       # Design tokens + Tailwind v4 theme
│   │   ├── page.tsx          # Dashboard (home; UI in page-client.tsx)
│   │   ├── api/              # Route handlers
│   │   │   ├── bug-report/             # Files a GitHub issue from an in-app bug report
│   │   │   ├── known-issues/           # Cached feed of GitHub issues labelled known-issue (Known Issues tab)
│   │   │   ├── cron/push-reminders/    # Generates scheduled reminders
│   │   │   ├── cron/deliver-scheduled/ # Pushes reminders that have come due
│   │   │   └── push/                   # Push subscribe / send
│   │   ├── auth/callback/    # Auth redirect handler
│   │   ├── bills/            # Bills and expenses page
│   │   ├── confirm-email/    # Email confirmation page
│   │   ├── funds/            # Goals page (route is /funds)
│   │   ├── getting-started/  # Public Getting started guide
│   │   ├── login/            # Login / sign-up page
│   │   ├── offline/          # Offline fallback page
│   │   ├── patch-notes/      # Updates page (patch notes + known issues)
│   │   ├── payday/           # Pay schedules, pay logging and history page
│   │   ├── reset-password/update/  # Set a new password (reached from the reset email)
│   │   └── settings/         # Account, app, household and member settings
│   ├── components/           # Reusable UI components (about 70, plus ui/)
│   │   ├── AppShell.tsx      # Auth guard, onboarding gate, bottom nav shell
│   │   ├── Onboarding.tsx    # Onboarding: Welcome, create or join, then the Setup hub
│   │   ├── BottomNav.tsx     # Floating 4-slot pill nav (slots in lib/navSlots.ts)
│   │   ├── PageHeader.tsx    # Shared page header: title, back circle, + circle, bell, avatar
│   │   ├── HeaderActions.tsx # Bell (unread only) and avatar for the page header
│   │   ├── ShellInboxContext.tsx # Lets the header bell open the AppShell notification inbox
│   │   ├── NotificationCenter.tsx # In-app notification centre (alerts, settings)
│   │   ├── *Sheet / *Modal / *Dialog.tsx  # Bottom sheets and dialogs (bills, goals, pay, members, bug report, push, timezone)
│   │   ├── Dashboard*.tsx    # Dashboard stats, bills and goals carousels, tip strip
│   │   ├── *Card.tsx         # List and pay cards (bills, expenses, member pay, finish setup)
│   │   └── ui/               # Shared primitives (Dialog, DetailSheet, SingleCard, StepFlow, Row, Toast, Button, IconCircle/BackCircle/CloseCircle, Chip, Card, Input/Select/Textarea, Carousel, ProgressRing)
│   ├── context/
│   │   └── AppContext.tsx    # Global state provider (auth, data, CRUD)
│   ├── hooks/                # Small shared hooks (viewport vars, keyboard-open for the nav fade)
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client initialisation
│   │   ├── storage.ts        # Avatar upload/delete/get utilities
│   │   ├── utils.ts          # Shared helpers (date, frequency conversion)
│   │   ├── verdict.ts        # Dashboard verdict and stats maths (tests in verdict.test.mjs)
│   │   ├── navSlots.ts       # Bottom-nav slots and path-to-slot lookup (tests in navSlots.test.mjs, appShell.test.mjs)
│   │   ├── carousel.ts       # Carousel maths: snap targets, active slide, auto-rotate rule (tests in carouselLogic.test.mjs, carousel.test.mjs)
│   │   ├── billCycle.ts      # Bill rollover logic (tests in billCycle.test.mjs)
│   │   ├── finishSetup.ts    # Finish setting up card rules and the `?add=1` link param that opens a page's add sheet (tests in finishSetup.test.mjs)
│   │   ├── push.ts / pushClient.ts  # Web push (server send, client subscribe)
│   │   ├── notifications/    # Reminder generation, timezone, tap destinations
│   │   ├── patch-notes.ts    # Patch notes content
│   │   ├── patchNotesWindow.ts # Which patch notes the page shows (newest month only; tests in patchNotesWindow.test.mjs)
│   │   ├── knownIssues.ts / knownIssuesFetch.ts  # Known Issues blurb parsing (tests in knownIssues.test.mjs) and cached GitHub fetch
│   │   ├── getting-started.ts # Getting started guide content
│   │   └── version.ts        # APP_VERSION
│   └── types/
│       └── index.ts          # Shared TypeScript interfaces
├── supabase/
│   ├── legacy/               # Early schema and RLS SQL (cannot rebuild the database alone)
│   ├── migrations/           # Incremental schema migrations
│   ├── email-templates/      # Auth email HTML (pasted into Supabase by hand)
│   └── functions/            # Supabase Edge Functions
├── docs/                     # Conventions, environment notes, lessons, glossaries, ADRs
├── vercel.json               # Vercel Cron fallback for reminder generation
├── next.config.ts            # Next.js configuration
├── tsconfig.json             # TypeScript configuration
├── postcss.config.mjs        # PostCSS (Tailwind v4)
├── eslint.config.mjs         # ESLint configuration
├── .env.local                # Environment variables (git-ignored)
└── package.json
```

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

This is a solo project built by an orchestrator session and a sub-agent team under Anthony's direction. The workflow, rules and roles live in [`CLAUDE.md`](CLAUDE.md); build conventions are in [`docs/conventions.md`](docs/conventions.md). Every change goes on a branch and PR with an independent review, and Anthony approves each merge.

---

## Versioning

The version shown in Settings under Updates comes from `src/lib/version.ts` (`APP_VERSION`), not `package.json`. The bump and patch-notes rules are in [`docs/conventions.md`](docs/conventions.md) (Versioning, Patch notes); this README does not restate the current version.

---

## License

Private — all rights reserved.

---

## Credits

```
© 2026 HazardousSchematics.com
Built with Antigravity IDE
```

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
- [Screens](#screens)
- [Design system](#design-system)
- [Key logic](#key-logic)
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
- **Savings goals** — sinking funds with targets, progress tracking, and manual top-ups
- **Contribution rules** — define rules that auto-allocate surplus income above a threshold to goals or increased contributions
- **Payment modes** — choose between Joint Fund (pooled pot) or Direct Pay (split bills between members)
- **Multi-member households** — invite members via join code, manage roles (owner/member), and assign bill splits
- **Health score** — weighted financial health score (0–100) based on bill status, goal progress, and budget coverage
- **Notifications** — in-app notification centre plus web push reminders (bills, pending pay, payday, goals), read/unread state, per-type settings, a per-member notify hour and a household timezone
- **Light and dark mode** — automatic via `prefers-color-scheme` CSS media query, with a manual Light / Dark / System choice under Appearance in Settings (applied as a `.dark` / `.light` class)
- **PWA** — installable as a home screen app on iOS Safari and Android Chrome with an offline fallback page
- **In-app help** — a public Getting started guide, a patch notes ("What's new") page with a Known Issues tab, a first-open popup, and in-app bug reporting
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
# Create .env.local in the project root and fill it in (see below)

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
| `npm test` | Run the bill-cycle unit tests (`node --test`) |

---

## Environment variables

Create a `.env.local` file in the project root with the following values:

```env
# ── Client (safe to expose to the browser) ──
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# ── Web push (VAPID) ──
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_CONTACT_EMAIL=mailto:admin@example.com

# ── Server-only: reminder crons (never prefix with NEXT_PUBLIC_) ──
# Service-role key bypasses RLS; used only by the server cron routes. Keep secret.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# Shared secret Vercel Cron sends as the Authorization bearer token.
CRON_SECRET=a-long-random-string
# Separate bearer secrets for the Supabase pg_cron jobs (one per route).
GENERATION_CRON_SECRET=another-long-random-string
DELIVER_CRON_SECRET=yet-another-long-random-string

# ── Server-only, optional: in-app bug reports ──
# Token that can create issues on the repo; production only.
GITHUB_BUG_REPORT_TOKEN=your-github-token
```

The Supabase URL and anon key are available in your Supabase project dashboard
under **Settings → API**. The `SUPABASE_SERVICE_ROLE_KEY` is on the same page —
treat it like a password and never expose it to the client. `CRON_SECRET`,
`GENERATION_CRON_SECRET` and `DELIVER_CRON_SECRET` are any long random strings,
set to the same values in Vercel and in the matching scheduler.
`/api/cron/push-reminders` accepts either `CRON_SECRET` or `GENERATION_CRON_SECRET`;
`/api/cron/deliver-scheduled` uses `DELIVER_CRON_SECRET`. `GITHUB_BUG_REPORT_TOKEN`
is only needed by the in-app bug report route (`/api/bug-report`); without it that
route reports not configured.

> **Note:** `.env*` files are git-ignored by default. Never commit real credentials.

---

## Database setup

The Supabase schema is defined in the `supabase/` directory. Run these SQL files in order via the Supabase SQL Editor:

1. **`supabase/schema.sql`** — core tables: `households`, `bills`, `funds`, `paydays`
2. **`supabase/household_members_table.sql`** — the `household_members` table
3. **`supabase/rls_policies.sql`** — row-level security policies
4. **`supabase/secure_rls_policies.sql`** — additional hardened RLS rules
5. **`supabase/migrations/`** — apply each migration file in order. The un-dated files come first (pay schedules, pay history, bill splits, household contributions, contribution rules, user ID constraints, join codes, RLS fixes), then the date-prefixed files in filename order (timezone and notification columns, expenses, user preferences, storage buckets, RLS declarations and hardening, and so on).

> **Note:** the migrations alone cannot rebuild a database from scratch. Some tables (for example notifications, notification settings and push subscriptions) have no `CREATE TABLE` in the repo.

### Edge Functions

- **`supabase/functions/join-household/`** — serverless function that handles household join code validation and member addition
- **`supabase/functions/delete-household/`** — serverless function that handles deleting a household

Edge Functions are deployed separately from the app (`supabase functions deploy`).

### Storage

Two Storage buckets are used: `avatars` (public, for avatar image uploads) and `bug-report-screenshots` (screenshots attached to in-app bug reports). Both are configured by migrations in `supabase/migrations/`.

### Auth email templates

`supabase/email-templates/` holds the source HTML for the Confirm signup and Reset password emails. Supabase keeps its own copy, so changes are pasted by hand into the Supabase dashboard (Auth → Email Templates).

### Scheduling

Reminders are generated and delivered by two cron routes (see [Key logic](#key-logic)). In production a Supabase `pg_cron` job calls each of them every few minutes; `vercel.json` also carries a once-a-day Vercel Cron on `/api/cron/push-reminders` as a fallback.

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
│   ├── stamp-sw.mjs          # Stamps the service worker cache name at build time
│   └── agy-delegate.ps1      # Dev tooling (review delegation)
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
│   │   ├── patch-notes/      # Patch notes ("What's new") page
│   │   ├── payday/           # Pay schedules, pay logging and history page
│   │   ├── reset-password/update/  # Set a new password (reached from the reset email)
│   │   └── settings/         # Account, app, household and member settings
│   ├── components/           # Reusable UI components (about 55, plus ui/)
│   │   ├── AppShell.tsx      # Auth guard, onboarding gate, bottom nav shell
│   │   ├── Onboarding.tsx    # 5-step onboarding wizard
│   │   ├── BottomNav.tsx     # Mobile bottom navigation bar
│   │   ├── NotificationCenter.tsx # In-app notification centre (alerts, settings)
│   │   ├── *Sheet / *Modal / *Dialog.tsx  # Bottom sheets and dialogs (bills, goals, pay, members, bug report, push, timezone)
│   │   ├── *Card.tsx         # Dashboard and list cards (health score, upcoming bills, goals, activity, bills, expenses)
│   │   └── ui/               # Shared primitives (Dialog, Row, SectionHeader, Toast)
│   ├── context/
│   │   └── AppContext.tsx    # Global state provider (auth, data, CRUD)
│   ├── hooks/                # Small shared hooks
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client initialisation
│   │   ├── storage.ts        # Avatar upload/delete/get utilities
│   │   ├── utils.ts          # Shared helpers (health score, date, frequency conversion)
│   │   ├── billCycle.ts      # Bill rollover logic (tests in billCycle.test.mjs)
│   │   ├── push.ts / pushClient.ts  # Web push (server send, client subscribe)
│   │   ├── notifications/    # Reminder generation, timezone, tap destinations
│   │   ├── patch-notes.ts    # Patch notes content
│   │   ├── knownIssues.ts / knownIssuesFetch.ts  # Known Issues blurb parsing (tests in knownIssues.test.mjs) and cached GitHub fetch
│   │   ├── getting-started.ts # Getting started guide content
│   │   └── version.ts        # APP_VERSION
│   └── types/
│       └── index.ts          # Shared TypeScript interfaces
├── supabase/
│   ├── schema.sql            # Core database schema
│   ├── household_members_table.sql
│   ├── rls_policies.sql      # Row-level security
│   ├── secure_rls_policies.sql
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

## Screens

| Route | Screen | Purpose |
|-------|--------|---------|
| `/` | **Dashboard** | Health score, upcoming bills, active goals, recent activity feed |
| `/payday` | **Payday** | Pay schedules, income entry (fixed or variable), pending pay confirmation, pay history, surplus rule triggers |
| `/bills` | **Bills** | All household bills and expenses with status badges, category filters, search, and frequency normalisation toggle |
| `/funds` | **Goals** | Savings goals with progress bars, manual top-ups, and completion tracking |
| `/settings` | **Settings** | Profile, notifications (including notify hour and push status), appearance (Light / Dark / System), payment mode (Joint Fund / Direct Pay), contribution amounts and automation rules (Joint Fund), join code, household timezone, member management, What's new, Getting started, bug reporting |
| `/login` | **Login** | Email/password authentication (sign in or sign up) |
| `/confirm-email` | **Confirm Email** | Email verification landing page |
| `/reset-password/update` | **Reset Password** | Password update page reached via Supabase reset email link |
| `/auth/callback` | **Auth Callback** | Supabase auth redirect handler |
| `/getting-started` | **Getting Started** | Public guide of optional missions covering the basics (no sign-in needed) |
| `/patch-notes` | **Patch Notes** | What changed in each version, plus a Known Issues tab (reached from Settings as "What's new") |
| `/offline` | **Offline** | PWA offline fallback page |

### User flow

1. **Sign up** → email confirmation → **Onboarding** (5 steps: create a household or join one, choose payment mode, add first pay schedule, add first bill, done)
2. **Dashboard** shows household health at a glance
3. **Payday** to log income when paid — surplus rules fire automatically; surplus suggestion modal prompts allocation
4. **Bills** to manage household costs
5. **Goals** to track savings targets
6. **Settings** to invite members, configure contributions, rules, and notification preferences
7. **Forgot password** → reset email → `/reset-password/update` to set a new password

---

## Design system

### Typography

Fonts are loaded via `next/font/google` for optimal performance (no external CDN requests at runtime).

| Font | CSS Variable | Use |
|------|-------------|-----|
| **Syne** (400–800) | `--font-heading` | Display headings, wordmark |
| **Instrument Sans** (400–600) | `--font-body` | Body text, inputs, UI labels |
| **JetBrains Mono** (400–600) | `--font-mono` | Numeric values, monospace data |

### Colour tokens

All colours are defined as CSS custom properties in `globals.css` and mapped into Tailwind v4 via `@theme inline`.

| Token | Dark mode | Light mode |
|-------|-----------|------------|
| `--color-primary` (lime) | `#c8ff00` | `#7aaa00` |
| `--color-background` | `#0a0a0a` | `#f2f2ee` |
| `--color-success` (green) | `#00e676` | `#00994a` |
| `--color-accent` (amber) | `#ffab00` | `#c07800` |
| `--color-destructive` (red) | `#ff3d57` | `#cc2233` |
| `--color-surface` | `#111111` | `#e8e8e4` |
| `--color-foreground` | `#f0f0f0` | `#0f0f0f` |
| `--color-muted` | `#999999` | `#444444` |
| `--color-border` | `rgba(255,255,255,0.07)` | `rgba(0,0,0,0.09)` |

### Theme switching

- **Automatic:** CSS `@media (prefers-color-scheme: light)` sets light tokens on `:root` when no class is present
- **Manual:** toggle in Settings writes `.dark` or `.light` class to `<html>`, overriding the media query
- **Layered surfaces:** `--color-surface`, `--color-surface-raised`, `--color-surface-elevated` provide depth

### Mobile-first considerations

- `viewport-fit=cover` and `env(safe-area-inset-*)` padding for notched devices
- All inputs forced to `font-size: 16px` to prevent iOS Safari auto-zoom
- `touch-action: manipulation` on interactive elements to eliminate tap delay

---

## Key logic

### Frequency conversion

`convertAmount(amount, fromFrequency, toFrequency)` normalises any amount between `weekly`, `fortnightly`, `monthly`, and `yearly` using standard budgeting coefficients (4.33 weeks/month, 2.16 fortnights/month).

### Health score

`calculateHealthScore()` returns 0–100 based on three weighted factors:

| Factor | Weight | Scoring |
|--------|--------|---------|
| Bills management | 40% | –20 points per overdue bill (paused bills and one-off auto-pay bills whose date has passed are ignored) |
| Goals & contributions | 30% | 80 base + 20 if any goal has progress; 50 if nothing set up |
| Budget coverage | 30% | Ratio of contributions (or splits) to total monthly obligations (bills, expenses and active fixed-dollar contribution rules) |

### Payment modes

| Mode | Behaviour |
|------|-----------|
| **Joint Fund** | All contributors pay into a shared pot; contributions are compared against total bills |
| **Direct Pay** | Bills are split between specific members via `BillSplit` records; each person pays their assigned share |

### Contribution rules

When a pay entry exceeds a contributor's threshold, a configurable percentage is automatically allocated to a goal or added as an increased contribution.

### Known Issues

The Known Issues tab on the patch notes page lists open GitHub issues carrying the `known-issue` label. It shows only each issue's "User-facing blurb" section (the last section of the issue body), never the title or number, parsed by `src/lib/knownIssues.ts`. The client fetches `/api/known-issues`, which calls the public GitHub API without a token and caches the result for about 15 minutes (5 after a failure); the service worker skips `/api/` so the data stays live. If GitHub cannot be reached the tab shows a friendly message instead of an error.

### Reminders

Reminders are a two-step pipeline. `/api/cron/push-reminders` generates due-bill, auto-pay, pending-pay, payday and goal reminders for each household member, stamped with a delivery time that follows the household timezone and the member's notify hour (duplicates are prevented by a dedupe key). `/api/cron/deliver-scheduled` then pushes every reminder whose time has arrived and that is still unread. Both routes require a bearer secret (see Environment variables).

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

Ensure every variable listed under [Environment variables](#environment-variables) is configured in your deployment platform's environment settings (`GITHUB_BUG_REPORT_TOKEN` in production only). `vercel.json` registers a once-a-day cron on `/api/cron/push-reminders`; the more frequent schedules run from Supabase `pg_cron`.

---

## Contributing

This is a solo project developed under a structured **Lead Developer Liaison Protocol**: a single orchestrator session is the sole point of contact and delegates to a sub-agent team, but never merges or approves its own code. The full protocol lives in [`CLAUDE.md`](CLAUDE.md) — the short version:

- **Issues & PRDs** are tracked as GitHub issues on `mp3anthony/funded` via the `gh` CLI, triaged with canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `needs-manual-test`, `needs-merge-approval`).
- **Problem Agreement** — the problem must be fully scoped and the issue filed with a testing checklist — is reached before any work starts.
- **Once a plan is approved, the agent team works autonomously**, only interrupting for database migrations/RLS changes or locked architecture decisions.
- **Every change goes on a branch**, which triggers an automatic Vercel preview deployment.
- **Changes touching mobile layout, styling, or native browser behaviour** are labelled `needs-manual-test` for verification on the installed home-screen app on an iPhone; code must still be written to work correctly on **both** iOS and Android, but manual-test checklists never target Android. **Backend/platform-agnostic changes** are labelled `needs-merge-approval` — checklist pre-ticked, just needs your go-ahead.
- **Closing the linked GitHub issue is the go-ahead to merge** into `main`. The version number is confirmed with Anthony at merge time (see Versioning).

### Code conventions

- **TypeScript** — strict types, no `any` unless explicitly suppressed with a comment
- **Components** — one component per file, `PascalCase` filenames
- **State** — centralised in `AppContext.tsx`; pages consume via `useApp()` and `useCurrentUser()` hooks
- **Styling** — Tailwind utility classes referencing CSS custom property tokens; avoid hard-coded colour values

---

## Versioning

The current version is shown at the bottom of the Settings screen and sourced from `src/lib/version.ts` (`APP_VERSION`), not `package.json` — not restated here, so this doc can't drift out of sync with it. Until the app is declared ready for wider testing, each merged change bumps the **last decimal** (`v0.9.x` → `v0.9.x+1` …). `v0.9.0` was deliberately skipped.

> **Note:** This table is a loose guideline, not an enforced rule. The actual version applied at each
> merge is decided with Anthony directly at merge time, per the Versioning section in
> [`docs/conventions.md`](docs/conventions.md).

| Milestone | Version |
|-----------|---------|
| Ongoing pre-testing changes | last-decimal bump (`v0.9.x`) |
| Ready for wider testers | `v0.10.0` |
| Public beta | `v1.0.0` |

---

## License

Private — all rights reserved.

---

## Credits

```
© 2026 HazardousSchematics.com
Built with Antigravity IDE
```

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
- **Bill tracking** — manage bills across any frequency (weekly, fortnightly, monthly, yearly) with paid/due-soon/overdue status tracking
- **Frequency normalisation** — all bills convert to a common frequency for apples-to-apples comparison
- **Savings goals** — sinking funds with targets, progress tracking, and manual top-ups
- **Contribution rules** — define rules that auto-allocate surplus income above a threshold to goals or increased contributions
- **Payment modes** — choose between Joint Fund (pooled pot) or Direct Pay (split bills between members)
- **Multi-member households** — invite members via join code, manage roles (owner/member), and assign bill splits
- **Health score** — weighted financial health score (0–100) based on bill status, goal progress, and budget coverage
- **Notifications** — in-app notification centre with bill-due alerts, snooze, read/unread state, and per-type settings
- **Light and dark mode** — automatic via `prefers-color-scheme` CSS media query, with a manual class-based override (`.dark` / `.light`) toggle in settings
- **PWA** — installable as a home screen app on iOS Safari and Android Chrome with full offline fallback
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
| Backend / DB | [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage + Edge Functions) |
| Auth | Supabase Auth (implicit flow, email confirmation) |
| File storage | Supabase Storage (avatar uploads) |
| Server-side Supabase | [@supabase/ssr](https://www.npmjs.com/package/@supabase/ssr) — Supabase clients inside API route handlers |
| Web push | [web-push](https://www.npmjs.com/package/web-push) (VAPID) for bill-due notifications |
| Utilities | clsx, tailwind-merge |

---

## Prerequisites

- **Node.js** ≥ 18.x
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
cp .env.local.example .env.local
# Then fill in your Supabase credentials (see below)

# 4. Run the database migrations (see Database setup)

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

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

# ── Server-only: reminder cron (never prefix with NEXT_PUBLIC_) ──
# Service-role key bypasses RLS; used only by the server cron. Keep secret.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# Shared secret Vercel Cron sends as the Authorization bearer token.
CRON_SECRET=a-long-random-string
```

The Supabase URL and anon key are available in your Supabase project dashboard
under **Settings → API**. The `SUPABASE_SERVICE_ROLE_KEY` is on the same page —
treat it like a password and never expose it to the client. `CRON_SECRET` is any
long random string; set the identical value in Vercel so the daily reminder cron
(`/api/cron/push-reminders`) can authenticate.

> **Note:** `.env*` files are git-ignored by default. Never commit real credentials.
> A `.env.local.example` template (no real values) is provided as a starting point.

---

## Database setup

The Supabase schema is defined in the `supabase/` directory. Run these SQL files in order via the Supabase SQL Editor:

1. **`supabase/schema.sql`** — core tables: `households`, `bills`, `funds`, `paydays`
2. **`supabase/household_members_table.sql`** — the `household_members` table
3. **`supabase/rls_policies.sql`** — row-level security policies
4. **`supabase/secure_rls_policies.sql`** — additional hardened RLS rules
5. **`supabase/migrations/`** — apply each migration file in order:
   - `add_missing_schema_tables_and_columns.sql` — pay schedules, pay history, bill splits, household contributions, contribution rules, and additional columns
   - `add_user_id_and_constraints.sql` — user ID foreign keys and constraints
   - `add_join_code.sql` — household join codes
   - `update_join_code_type.sql` — join code type update
   - `fix_households_rls.sql` — RLS policy fixes
   - `fix_households_rls_recursion.sql` — recursive RLS fix
   - `fix_household_members_select.sql` — member select policy fix
   - `20260707005200_update_frequency_data_to_fortnightly.sql` — normalises frequency data to fortnightly

### Edge Functions

- **`supabase/functions/join-household/`** — serverless function that handles household join code validation and member addition

### Storage

Create an `avatars` bucket in Supabase Storage (Settings → Storage) with **public access** enabled for avatar image uploads.

---

## Project structure

```
funded-nextjs/
├── public/
│   ├── icons/                # PWA icons (192×192, 512×512)
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker (offline support)
│   └── logo-wordmark.svg     # Brand wordmark
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── layout.tsx        # Root layout (fonts, metadata, providers)
│   │   ├── globals.css       # Design tokens + Tailwind v4 theme
│   │   ├── page.tsx          # Dashboard (home)
│   │   ├── auth/             # Auth callback handler
│   │   ├── bills/            # Bills management page
│   │   ├── confirm-email/    # Email confirmation page
│   │   ├── funds/            # Savings goals page
│   │   ├── login/            # Login / sign-up page
│   │   ├── offline/          # Offline fallback page
│   │   ├── payday/           # Payday income + schedules page
│   │   └── settings/         # Household settings page
│   ├── components/           # Reusable UI components (39 components)
│   │   ├── AppShell.tsx      # Auth guard, onboarding gate, bottom nav shell
│   │   ├── Onboarding.tsx    # 5-step onboarding wizard
│   │   ├── BottomNav.tsx     # Mobile bottom navigation bar
│   │   ├── HealthScoreCard.tsx        # Dashboard health score widget
│   │   ├── HealthScore.tsx            # Standalone health score display
│   │   ├── HouseholdHealth.tsx        # Household health summary
│   │   ├── UpcomingBillsCard.tsx      # Dashboard upcoming bills widget
│   │   ├── ActiveGoalsCard.tsx        # Dashboard goals widget
│   │   ├── RecentActivityCard.tsx     # Dashboard activity feed
│   │   ├── NotificationCenter.tsx     # In-app notification centre (alerts, snooze, settings)
│   │   ├── AddBillSheet.tsx           # Add/edit bill bottom sheet
│   │   ├── BillDetailSheet.tsx        # Bill detail view bottom sheet
│   │   ├── BillCard.tsx               # Individual bill card
│   │   ├── EditCategoryOrderModal.tsx # Reorder bill categories
│   │   ├── AddGoalSheet.tsx           # Add goal bottom sheet
│   │   ├── EditGoalSheet.tsx          # Edit goal bottom sheet
│   │   ├── GoalDetailSheet.tsx        # Goal detail view bottom sheet
│   │   ├── AddAmountModal.tsx         # Manual goal top-up modal
│   │   ├── AddPayScheduleSheet.tsx    # Add pay schedule bottom sheet
│   │   ├── PayScheduleDetailSheet.tsx # Pay schedule detail sheet
│   │   ├── EnterPayAmountModal.tsx    # Variable pay entry modal
│   │   ├── SurplusSuggestionModal.tsx # Surplus allocation prompt post-payday
│   │   ├── PayHistoryCard.tsx         # Pay history timeline
│   │   ├── ContributionSettingsSheet.tsx # Contribution management
│   │   ├── RulesSettingsSheet.tsx     # Surplus rules configuration
│   │   ├── RuleCard.tsx               # Individual contribution rule card
│   │   ├── ContributorSplits.tsx      # Bill split assignment (Direct Pay)
│   │   ├── PaymentModeToggle.tsx      # Joint Fund / Direct Pay toggle
│   │   ├── JoinHouseholdSheet.tsx     # Join via code sheet
│   │   ├── EditMemberModal.tsx        # Edit household member
│   │   ├── RemoveMemberModal.tsx      # Remove household member
│   │   ├── UserProfileMenu.tsx        # User profile dropdown menu
│   │   ├── AvatarUpload.tsx           # Avatar image upload
│   │   ├── AvatarDropdown.tsx         # Avatar selection dropdown
│   │   ├── Logo.tsx                   # Funded logo component
│   │   ├── PageHeader.tsx             # Consistent page header
│   │   └── FrequencyToggle.tsx        # Frequency selector toggle
│   ├── context/
│   │   └── AppContext.tsx    # Global state provider (auth, data, CRUD)
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client initialisation
│   │   ├── storage.ts        # Avatar upload/delete/get utilities
│   │   └── utils.ts          # Shared helpers (health score, date, frequency conversion)
│   └── types/
│       └── index.ts          # Shared TypeScript interfaces
├── supabase/
│   ├── schema.sql            # Core database schema
│   ├── household_members_table.sql
│   ├── rls_policies.sql      # Row-level security
│   ├── secure_rls_policies.sql
│   ├── migrations/           # Incremental schema migrations
│   └── functions/            # Supabase Edge Functions
├── .env.local                # Environment variables (git-ignored)
├── next.config.ts            # Next.js configuration
├── tsconfig.json             # TypeScript configuration
├── postcss.config.mjs        # PostCSS (Tailwind v4)
├── eslint.config.mjs         # ESLint configuration
└── package.json
```

---

## Screens

| Route | Screen | Purpose |
|-------|--------|---------|
| `/` | **Dashboard** | Health score, upcoming bills, active goals, recent activity feed |
| `/payday` | **Payday** | Pay schedules, income entry (fixed or variable), pay history, surplus rule triggers |
| `/bills` | **Bills** | All household bills with status badges, category filters, search, and frequency normalisation toggle |
| `/funds` | **Goals** | Savings goals with progress bars, manual top-ups, and completion tracking |
| `/settings` | **Settings** | Household name, payment mode (Joint Fund / Direct Pay), member management, contributions, surplus rules, theme toggle, join codes, notifications |
| `/login` | **Login** | Email/password authentication (sign in or sign up) |
| `/confirm-email` | **Confirm Email** | Email verification landing page |
| `/reset-password` | **Reset Password** | Password update page reached via Supabase reset email link |
| `/auth` | **Auth Callback** | Supabase auth redirect handler |
| `/offline` | **Offline** | PWA offline fallback page |

### User flow

1. **Sign up** → email confirmation → **Onboarding** (5 steps: name household, choose payment mode, add first pay schedule, add first bill, review)
2. **Dashboard** shows household health at a glance
3. **Payday** to log income when paid — surplus rules fire automatically; surplus suggestion modal prompts allocation
4. **Bills** to manage household costs
5. **Goals** to track savings targets
6. **Settings** to invite members, configure contributions, rules, and notification preferences
7. **Forgot password** → reset email → `/reset-password` to set a new password

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

`convertAmount(amount, fromFrequency, toFrequency)` normalises any amount between `weekly`, `fortnightly`, `monthly`, and `yearly` using standard budgeting coefficients (4.33 weeks/month, 2.16 bi-weeks/month).

### Health score

`calculateHealthScore()` returns 0–100 based on three weighted factors:

| Factor | Weight | Scoring |
|--------|--------|---------|
| Bills management | 40% | –20 points per overdue bill |
| Goals & contributions | 30% | 80 base + 20 if any goal has progress; 50 if nothing set up |
| Budget coverage | 30% | Ratio of contributions (or splits) to total monthly expenses |

### Payment modes

| Mode | Behaviour |
|------|-----------|
| **Joint Fund** | All contributors pay into a shared pot; contributions are compared against total bills |
| **Direct Pay** | Bills are split between specific members via `BillSplit` records; each person pays their assigned share |

### Contribution rules

When a pay entry exceeds a contributor's threshold, a configurable percentage is automatically allocated to a goal or added as an increased contribution.

---

## PWA support

Funded is a Progressive Web App. The following files enable installation and offline support:

| File | Purpose |
|------|---------|
| `public/manifest.json` | App name, theme colour (`#c8ff00`), icons, display mode (`standalone`) |
| `public/sw.js` | Service worker with cache-first strategy and offline fallback |
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

Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured in your deployment platform's environment settings.

---

## Contributing

This is a solo project developed under a structured **Lead Developer Liaison Protocol**: a single orchestrator session is the sole point of contact and delegates to a sub-agent team, but never merges or approves its own code. The full protocol lives in [`CLAUDE.md`](CLAUDE.md) — the short version:

- **Issues & PRDs** are tracked as GitHub issues on `mp3anthony/funded` via the `gh` CLI, triaged with canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `needs-mobile-test`, `needs-merge-approval`).
- **Problem Agreement** — the problem must be fully scoped and the issue filed with a testing checklist — is reached before any work starts.
- **Once a plan is approved, the agent team works autonomously**, only interrupting for database migrations/RLS changes or locked architecture decisions.
- **Every change goes on a branch**, which triggers an automatic Vercel preview deployment.
- **Changes touching mobile layout, styling, or native browser behaviour** are labelled `needs-mobile-test` for iPhone/WebKit verification; code must still be written to work correctly on **both** iOS and Android, but Android is exercised post-merge on `main` by real users. **Backend/platform-agnostic changes** are labelled `needs-merge-approval` — checklist pre-ticked, just needs your go-ahead.
- **Closing the linked GitHub issue is the go-ahead to merge** into `main`. The version number is confirmed with Anthony at merge time (see Versioning).

### Code conventions

- **TypeScript** — strict types, no `any` unless explicitly suppressed with a comment
- **Components** — one component per file, `PascalCase` filenames
- **State** — centralised in `AppContext.tsx`; pages consume via `useApp()` and `useCurrentUser()` hooks
- **Styling** — Tailwind utility classes referencing CSS custom property tokens; avoid hard-coded colour values

---

## Versioning

The app is currently at **v0.9.1** (shown at the bottom of the Settings screen). Until it's declared ready for wider testing, each merged change bumps the **last decimal** (`v0.9.1` → `v0.9.2` → `v0.9.3` …). `v0.9.0` was deliberately skipped.

> **Note:** This table is a loose guideline, not an enforced rule. The actual version applied at each
> merge is decided with Anthony directly at merge time, via the Versioning step in
> [`CLAUDE.md`](CLAUDE.md).

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
Concept & Development: Anthony Paull
Built with Antigravity IDE
```

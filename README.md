# Femi Medical

Clinical education platform — students work through simulated patient cases with stage-by-stage decision-making, scoring, library articles, and pre/post quizzes.

The brief in [BRIEF.md](./BRIEF.md) is the source of truth for product decisions. The mockup at [reference/femi-mockups.html](./reference/femi-mockups.html) is the visual source of truth.

---

## Stack

- **Next.js 15** App Router + TypeScript (`src/` layout)
- **Supabase** — Postgres, Auth, Storage
- **Drizzle ORM** for schema + queries
- **Tailwind CSS** (themed per Section 8 of the brief)
- **Phosphor Icons** (`@phosphor-icons/react`) — not Lucide
- **Resend** for transactional email
- **Vercel** for deploy

---

## Routes

```
/                              landing
/login                         student + teacher login
/admin/login                   admin login
/forgot-password               password reset request
/reset-password                set new password (Supabase recovery link target)
/invite/[code]                 student signup via classroom invite link

/student                       dashboard (cases grouped by state)
/student/progress              all attempts + history
/student/case/[id]             case player
/student/case/[id]/feedback    end-of-case feedback
/student/case/[id]/quiz/pre    pre-test
/student/case/[id]/quiz/post   post-test (required for "completed")
/student/library               diagnosis TOC
/student/library/[slug]        article view
/student/resources             flat resource list

/teacher                       own classrooms list
/teacher/classroom/new         create classroom (generates invite code)
/teacher/classroom/[id]        roster, release toggles, top-line stats
/teacher/classroom/[id]/student/[studentId]   per-student drill-down

/admin                         overview + inline stats
/admin/schools                 list + inline create + soft-delete
/admin/teachers                list
/admin/teachers/new            create teacher (sends invite email)
/admin/cases                   list
/admin/cases/new               full case authoring editor
/admin/cases/[id]              edit (text-only — brief §7)
/admin/cases/[id]/quiz         pre/post quiz bank
/admin/library                 list
/admin/library/new             markdown editor + write/preview
/admin/library/[slug]          edit
/admin/resources               list + inline create

/design                        design-system primitives showcase
```

---

## Local development

### Prerequisites

- Node ≥20
- A Supabase project (free tier works for the POC)
- A Resend account (only required for email — app runs without it during local bring-up)

### Setup

1. **Install:**
   ```bash
   npm install
   ```

2. **Copy env template:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in the values — see "Environment variables" below.

3. **Apply the database** (against your Supabase project — see [`db/README.md`](./db/README.md) for the full lifecycle):
   ```bash
   npm run db:push                                      # schema
   psql "$DATABASE_URL" -f db/policies/0001_rls.sql     # RLS policies
   # Edit db/seed/admin.sql with your admin email + password, then:
   psql "$DATABASE_URL" -f db/seed/admin.sql
   ```

4. **Create the storage bucket** named `femi-media` in the Supabase Storage UI. Public bucket. (Details in `db/README.md`.)

5. **Run:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

   - Sign in as admin at `/admin/login`
   - From the admin panel, create a school + teacher
   - The teacher gets a recovery-link email (or, if Resend isn't configured, the link is shown inline in the admin UI)
   - Teacher signs in at `/login`, creates a classroom, shares the invite URL
   - Student signs up at `/invite/[code]`, lands in `/student`

### Environment variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Direct Postgres connection for Drizzle (Supabase "Session Pooler" or direct URL)
DATABASE_URL=

# Resend — optional during bring-up; emails soft-fail without
RESEND_API_KEY=
RESEND_FROM_EMAIL="Femi <noreply@your-domain.com>"
```

### Scripts

```bash
npm run dev          # next dev
npm run build        # production build
npm run start        # serve production build
npm run typecheck    # tsc --noEmit

npm run db:generate  # drizzle-kit generate (schema diff → SQL)
npm run db:push      # apply schema to DB
npm run db:studio    # open Drizzle Studio
```

---

## Architecture notes

### Auth (Supabase Auth + role-based middleware)

- Role is read from `auth.users.app_metadata.role` (not user-mutable; signed in the JWT). Middleware gates `/admin`, `/teacher`, `/student` against the JWT role.
- **Always use `getUser()` server-side, never `getSession()`** — `getSession()` returns cached cookie data unverified.
- Auth state hydrates on the server (root layout calls `currentUser()`, passes `initialUser` to `<AuthProvider>`). No client loading flicker.
- Server Actions handle sign-in / sign-out so cookies clear atomically on the redirect response.

### Database / RLS

- Drizzle schema in `src/db/schema.ts`. Migrations land in `drizzle/`.
- RLS policies in `db/policies/0001_rls.sql` — idempotent (uses `DROP POLICY IF EXISTS` everywhere). Run after every schema change.
- Three client paths, used deliberately:
  - **Supabase server client** (user JWT) — RLS enforced. Use for user-facing reads/writes.
  - **Supabase admin client** (service role) — RLS bypassed. Use only for provisioning.
  - **Drizzle (`db`)** — RLS bypassed. Use for joins/analytics; **always manually scope by `auth.uid()` / classroom / etc.**
- Lazy DB proxy: `db` doesn't touch `DATABASE_URL` until a query actually runs, so build-time page-data collection works without a DB connection.

### Scoring engine

- `case_attempts` row created at player mount (in `useEffect`, not page render — avoids prefetch creating orphans).
- Each "Continue" inserts a `stage_attempts` row with `picks: jsonb [{choice_id, pick_order, score}]` and `earned_score = sum(picks.score)`.
- Final "Continue" sums all `stage_attempts.earned_score` server-side and writes `case_attempts {completed_at, total_score}`. Idempotent — `WHERE completed_at IS NULL` guards against double-complete.
- Scores are **re-derived from the DB on submit** — clients can't inflate.

### Case editing locked structure

Brief §7: after a case is created, structural fields are locked. Enforced at the API layer in `src/app/admin/(authed)/cases/actions.ts` — `updateCaseText` only accepts text fields; structural fields are silently ignored.

### Quiz randomization

`ORDER BY RANDOM() LIMIT N` from the `quiz_questions` pool per session. No duplicate-question prevention across attempts — by brief design.

---

## Deploying to Vercel

1. Push to GitHub.
2. Import the project in Vercel.
3. Set environment variables from `.env.example` in **Settings → Environment Variables**.
4. Deploy. Build command stays `next build`.

### After first deploy

- Set the production URL as the **Supabase Auth Site URL** (Authentication → URL Configuration). Otherwise password-reset / invite links will point to localhost.
- Add the production URL to **Additional Redirect URLs** in the same Supabase settings.
- If using a custom domain for `RESEND_FROM_EMAIL`, verify it in Resend.

---

## Layout & UX guardrails (brief §8 — read before adding UI)

- **2px corner radius everywhere.** Not 8px. Not pills.
- **No drop shadows. No gradients. No glassmorphism.**
- **Editorial typography:** Fraunces (serif), Geist (sans), JetBrains Mono. All loaded via `next/font/google`.
- **Accent (`#1A6B5C`) is used sparingly** — left borders, current-state indicators, the rare CTA hover. Not a paint.
- **No "metric cards in a 4-column grid"** — see how the admin overview uses an inline stats row instead.
- **No avatars for non-people.**
- **No toasts for trivial actions.** Inline state changes only.

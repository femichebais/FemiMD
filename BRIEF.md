# Femi Medical — Build Brief

You are building a clinical education platform from scratch. Students work through simulated patient cases, learning to think like clinicians. The platform is multi-tenant (schools / teachers / students) but launching with one school and ~30 students as a proof of concept. Build for that scale — light, simple, no premature optimization, but with the multi-tenant data model correct from day one.

Read this entire brief before writing code. Every section is intentional; all major product decisions are settled. When you start building, ask only if something is genuinely ambiguous.

---

## 1. Tech stack (locked)

- **Next.js 15** (App Router) + TypeScript
- **Supabase** — Postgres, Auth, Storage (for case images, library images, resource PDFs)
- **Drizzle ORM** for schema + queries
- **Tailwind CSS** + **shadcn/ui** (heavily themed — see Section 8)
- **Resend** for transactional email (password reset, invites)
- **Vercel** for deployment
- **Phosphor Icons** for icons (`@phosphor-icons/react`) — NOT lucide

Single Next.js app. Three role-based sections: `/student/*`, `/teacher/*`, `/admin/*`. Auth gates each section.

Use Supabase Row Level Security (RLS) for tenant isolation. Don't rely on app-layer filtering alone.

---

## 2. Roles & multi-school model

| Role | Scope | Capabilities |
|---|---|---|
| **Admin** | Global (one user — the platform creator) | Manage schools, teachers, cases, library, resources, quizzes |
| **Teacher** | One school, multiple classrooms | Create classrooms, invite students, release cases to classrooms, view analytics |
| **Student** | One classroom (level inherited from classroom) | Take cases, take quizzes, view their progress, view library/resources for their level |

**Rules:**
- A teacher belongs to exactly one school.
- A teacher can have multiple classrooms, each with its own program level (middle / high / undergrad).
- A student belongs to exactly one classroom. Their level is inherited from the classroom.
- Teachers strictly cannot see content tagged for levels outside their classroom(s).
- Students strictly cannot see cases or library pages outside their classroom's level.
- Teachers cannot see other teachers' classrooms — even within the same school.

---

## 3. Authentication

- Email + password for all three roles.
- Password reset via email (Resend).
- Student signup flow: teacher creates a classroom → gets an invite code/link → shares with students → student clicks link → registers with email + password → lands in classroom automatically. The invite code is the routing mechanism, not magic-link auth.
- Admin creates teacher accounts manually from the admin panel. Teachers receive a "set your password" email on creation.
- The admin account is seeded in the database directly (no signup).

---

## 4. Data model

Use Drizzle. Soft-delete pattern: `deleted_at TIMESTAMP NULL`. Filter `WHERE deleted_at IS NULL` for active records.

```typescript
// Core tenant entities
schools: { id, name, created_at, deleted_at }
teachers: { id, school_id, email, name, created_at, deleted_at }
classrooms: { id, school_id, teacher_id, name, level, invite_code, created_at, deleted_at }
  // level: enum('middle','high','undergrad')
  // invite_code: short random string, unique
students: { id, classroom_id, email, name, created_at, deleted_at }

// Cases
cases: {
  id, title, description, scenario_intro,
  linked_diagnosis_slug,  // for library link on feedback page
  created_at, deleted_at
}
case_levels: { case_id, level }  // many-to-many — cases can belong to multiple levels
case_level_config: { case_id, level, treatment_enabled }  // per-level toggle for treatment stage

stages: {
  id, case_id, order, type,
  prompt, max_picks (default 1),
  image_url nullable,
  created_at
}
  // type: enum('history','exam','diagnosis','disposition','treatment')
  // feedback is auto-generated, not a stage

choices: {
  id, stage_id, letter, text, score, is_correct nullable, response_text,
  display_order, created_at
}
  // score: int 0-3 (or higher — make it a flexible int)
  // is_correct: used for diagnosis/disposition (binary-correct stages)

// Quiz
quiz_questions: {
  id, case_id, scope, prompt, created_at, deleted_at
}
  // scope: enum('pre','post')

quiz_choices: {
  id, question_id, text, is_correct, display_order
}

// Attempts & sessions
case_attempts: {
  id, student_id, case_id, started_at, completed_at nullable,
  total_score nullable
}
stage_attempts: {
  id, case_attempt_id, stage_id, earned_score,
  picks: jsonb  // [{choice_id, pick_order, score}]
  created_at
}

quiz_attempts: {
  id, student_id, case_id, scope, question_count, score,
  answers: jsonb,  // [{question_id, choice_id, is_correct}]
  completed_at
}

// Library & resources
library_pages: {
  id, diagnosis_slug, title, eyebrow, dek,
  body_markdown, cover_image_url nullable,
  created_at, deleted_at
}
library_page_levels: { library_page_id, level }

resources: {
  id, title, type, url, storage_path nullable,
  created_at, deleted_at
}
  // type: enum('pdf','link','slides')
resource_levels: { resource_id, level }

// Case release (teacher → classroom)
case_releases: {
  id, classroom_id, case_id, released_at
}
  // Presence = released. No record = not released.
```

A case is "completed" by a student when they have a `case_attempts` row with `completed_at` set AND a `quiz_attempts` row with `scope='post'` for that case.

---

## 5. Case mechanics

A case is a **linear** sequence of stages. Each stage is a multiple-choice question. The student's pick (a) records a score, (b) reveals a contextual "patient response" or feedback, (c) advances to the next stage.

**Stage types:**
- `history` — multiple stages of this type per case ("ask first," "ask next"). Choices have varied scores (0–3 reflecting clinical relevance — high/med/low). All choices lead to the same next stage; only the displayed response varies.
- `exam` — physical exam. Often `max_picks=2` ("examine 2 of these 6 body parts"). Choices have varied scores. Both picks count additively.
- `diagnosis` — binary. One choice is `is_correct=true`, others `is_correct=false`. Each shows feedback like "Correct, this is a classic presentation of MI" or "Incorrect, the correct answer is...".
- `disposition` — binary, same shape as diagnosis.
- `treatment` — same MCQ shape. Enabled per case+level via `case_level_config.treatment_enabled`. Whether scored or binary depends on the case content (admin sets per choice).

**Interaction:**
- Student sees the stage prompt + choices.
- Picks 1 choice (or up to `max_picks` for multi-pick stages — sequentially, one at a time).
- After each pick, the patient response is revealed below.
- "Continue" button advances to the next stage.
- **No backtracking. No retry within an attempt.** Wrong picks live as wrong picks.
- **No save/resume mid-case.** Cases are short.

**Scoring:**
- Per-stage score = sum of `choices.score` for picked choices.
- Total case score = sum of all stage scores.
- For multi-pick stages: scores are additive (both picks count).
- Every attempt is stored. Retakes append, never overwrite. Progress page shows best + latest + full history.

**End of case → feedback screen** (auto-generated, not a content stage):
- Total score with breakdown per stage
- For each stage: what student picked, what the best/correct pick was, the score earned
- Link to the relevant library page via `cases.linked_diagnosis_slug`
- "Take post-test" CTA

---

## 6. Quiz system

- Pre-test and post-test exist **per case** (not per level).
- Each case has a pool of quiz questions in `quiz_questions` (tagged `pre` or `post`).
- When a student starts a quiz session, randomly pull N questions from the pool (N is configurable per case — default 10 if not set, store as `cases.quiz_question_count`).
- No duplicates within a single session.
- Questions can repeat across multiple attempts by the same student. Don't track per-student-lifetime question history.
- Single-select MCQ only. No multi-select, no true/false, no short answer.
- No timer.
- Show correct answers after the student submits the whole quiz.
- Multiple attempts allowed. Each attempt is stored separately. All attempts shown in student progress.
- **Pre-test is optional** — available alongside the case, doesn't gate access.
- **Post-test is required for "completion"** — student dashboard and teacher dashboard reflect this.

---

## 7. Admin CMS

A single admin user (the creator) manages all content. No multi-admin, no per-school admin. Admin panel at `/admin/*`.

**Capabilities:**
- Schools: create, soft-delete
- Teachers: create (sends "set your password" email), soft-delete
- Cases: create new, soft-delete existing
- Library pages: create, edit (text + images freely), soft-delete
- Resources: upload PDFs / add links, edit, soft-delete
- Quiz banks (pre/post per case): create questions, edit, delete questions

**Critical constraint — case editing:**
After a case is created, admin can edit **text content** freely (prompt wording, choice text, response text, library link, scenario intro, titles). Admin **cannot** edit structure:
- Cannot add or remove stages
- Cannot add or remove choices within a stage
- Cannot change scores
- Cannot change `is_correct` flag
- Cannot change `max_picks`
- Cannot change linked levels
- Cannot toggle `treatment_enabled`

To make structural changes, admin must delete the case and create a new one. Soft-deleted cases keep historical student attempts intact for analytics.

Enforce this rule at the API layer with a separate "edit text" endpoint vs. "create case" endpoint. Don't expose structural fields in the edit UI.

**Case authoring UI** (most important admin screen — invest time here):
- List view: all cases with title, linked levels, stage count, attempts count, status
- Create flow: title → scenario intro → linked diagnosis slug → levels (checkboxes) → stages (add one by one) → publish
- Each stage editor: type, prompt, max_picks, optional image, choices (text + score + is_correct), response text per choice
- Edit view (post-publish): same layout, but structural fields disabled. Text inputs only.

---

## 8. Design direction — "Editorial Casebook"

The single most important non-functional requirement. This product must NOT feel like a generic AI-generated SaaS app. Audience is high school and undergrad students — needs to feel serious and trustworthy without being sterile, and approachable without being childish.

**Aesthetic reference:** medical textbook meets NYT magazine meets Linear. Quiet confidence. Generous whitespace. Content as hero.

### Design tokens

```css
:root {
  /* Background */
  --paper: #FAF7F2;      /* main bg — warm off-white */
  --paper-2: #F2EEE5;    /* secondary surface — patient chart, hover */
  --paper-3: #E8E3D6;    /* tertiary — borders, avatars */

  /* Text */
  --ink: #1B2236;        /* primary text — deep navy-black, NOT pure black */
  --ink-mute: #5B6075;
  --ink-fade: #8A8E9F;

  /* Surface */
  --surface: #FFFFFF;    /* cards, inputs */

  /* Accent — ONE color, used sparingly */
  --accent: #1A6B5C;     /* deep teal-sage */
  --accent-soft: #E4EFEC;

  /* Rules */
  --rule: rgba(27, 34, 54, 0.08);
  --rule-strong: rgba(27, 34, 54, 0.15);
}
```

### Typography

Load via Google Fonts:
- **Fraunces** (weights 300, 400, 500, opsz 9–144) — serif, used for headlines, case questions, library titles, choice option text
- **Geist** (weights 300, 400, 500) — sans, used for body text, UI, buttons, navigation
- **JetBrains Mono** (weights 400, 500) — mono, used for labels, vitals, scores, metadata, stage indicators

```css
--font-serif: 'Fraunces', Georgia, serif;
--font-sans: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
```

`font-optical-sizing: auto` on body. `-webkit-font-smoothing: antialiased`.

### Type scale

- Display (library titles): 48–52px serif, weight 400, letter-spacing -0.025em, line-height 1.05
- H1 (case question, editor title): 32–38px serif, weight 400, letter-spacing -0.01em
- H2 (article section, dashboard title): 22–26px serif, weight 500
- Body: 16–17px sans, line-height 1.6–1.75
- Article body: 17px line-height 1.75
- Small: 13px sans
- Label (mono caps): 10–11px mono, letter-spacing 0.18–0.2em, uppercase

### Layout principles

- **Corners:** 2px radius (NOT 8px or pills) — editorial feel
- **Shadows:** None. Use 1px borders at `var(--rule)` or `var(--rule-strong)`.
- **No gradients** anywhere
- **No glassmorphism**
- **Max content width** for reading: 640–720px
- Generous whitespace — let content breathe

### Component patterns

- **Multiple-choice rows, not cards.** Letter (mono) on left, serif text, hover state = 2px teal bar slides in from left + warm bg tint. Selected = warm accent bg + accent letter color.
- **Patient chart element**: warm cream bg, thin border, mono label "PATIENT", serif body, mono vitals row separated by top border.
- **Patient response (post-pick)**: italic serif quote, left-border in teal, paper-2 bg, mono "PATIENT" label.
- **Continue button**: solid dark ink bg, paper text, 2px corner radius, accent on hover. NOT pill-shaped.
- **Stage label / metadata**: mono, uppercase, letter-spaced 0.18em+ — feels like a textbook caption.
- **Library article**: max-width 640px, big serif title, italic dek, sans body at 17px / 1.75. Sidebar TOC with thin accent border on current item.
- **Admin stage cards**: thin border, expand/collapse, drag handle (⋮⋮) on choices, score inputs in mono, response text in italic serif textarea.
- **Teacher dashboard**: gradebook table style — sortable columns, click row for student detail. Inline sparklines for analytics rather than big metric cards.

### What to actively avoid (AI tells)

- ❌ Inter font as body
- ❌ Lucide icons (use Phosphor)
- ❌ Purple, especially purple gradients
- ❌ Glassmorphism / backdrop-blur
- ❌ Gradient backgrounds anywhere
- ❌ Drop shadows
- ❌ Sparkle / star / magic icons
- ❌ Pure black (`#000`) or pure white (`#fff`) on body text
- ❌ Pill-shaped buttons everywhere
- ❌ "Three-column feature grid with icons"
- ❌ Avatar circles for non-people
- ❌ Toast notifications for trivial actions
- ❌ Metric cards stacked in 4-column grids

### Reference mockup

The user has a reference HTML mockup demonstrating the case player, library article, and case editor screens in this aesthetic. Use it as the visual north star. Match font sizes, spacing, colors, and component patterns from that mockup. If anything in this brief conflicts with the mockup, **the mockup wins**.

---

## 9. Page inventory

**Public**
- `/` — landing (minimal, just login + about)
- `/login` — student/teacher login
- `/admin/login` — admin login (separate route)
- `/invite/[code]` — student signup via invite link
- `/forgot-password`, `/reset-password`

**Student (`/student/*`)**
- `/student` — dashboard: released cases for their classroom, with state (not started / in progress / completed), recent activity
- `/student/case/[id]` — case player (stage-by-stage)
- `/student/case/[id]/feedback` — end-of-case feedback screen
- `/student/case/[id]/quiz/[scope]` — pre or post test
- `/student/progress` — all attempts, scores, history
- `/student/library` — diagnosis index for their level
- `/student/library/[slug]` — diagnosis article
- `/student/resources` — flat list

**Teacher (`/teacher/*`)**
- `/teacher` — overview: classrooms list
- `/teacher/classroom/[id]` — roster, case release controls, class-level analytics
- `/teacher/classroom/[id]/student/[id]` — drill-down: that student's attempts, stage-by-stage answers
- `/teacher/classroom/new` — create classroom

**Admin (`/admin/*`)**
- `/admin` — overview
- `/admin/schools` — list, create, delete schools
- `/admin/teachers` — list, create, delete teachers (assign to school)
- `/admin/cases` — list cases
- `/admin/cases/new` — create case (full structural editor)
- `/admin/cases/[id]` — edit case (text-only edits)
- `/admin/cases/[id]/quiz` — manage quiz bank (pre + post)
- `/admin/library` — list pages
- `/admin/library/[slug]` — edit page (markdown editor)
- `/admin/library/new` — create page
- `/admin/resources` — list, upload, link

---

## 10. Build order

Build in this sequence. Don't skip ahead — each layer depends on the previous.

1. **Project setup**: Next.js + TypeScript + Tailwind + Drizzle + Supabase client. Configure design tokens in Tailwind theme. Load fonts.
2. **Auth scaffolding**: Supabase Auth + role-based middleware. Three login flows. Seed admin user via SQL.
3. **Schema + migrations**: all tables from Section 4. RLS policies for tenant isolation.
4. **Design system primitives**: button, input, textarea, choice-row, patient-chart, stage-label, response-quote. Build these once, reuse everywhere.
5. **Admin: schools + teachers CRUD** (simplest, validates auth + RLS).
6. **Admin: case authoring UI** — highest-stakes admin screen. Build the create flow fully before moving on. Build edit flow with structural fields disabled.
7. **Student: case player** — most important student screen. Build with one hard-coded case first, then wire to DB.
8. **Scoring engine + attempt recording** — fire when student picks; persist `case_attempts` and `stage_attempts`.
9. **End-of-case feedback screen** with library link.
10. **Library**: admin editor (markdown + image upload to Supabase Storage), then student-facing article view.
11. **Quiz system**: admin question bank UI, then student-facing pre/post quiz pages with randomization.
12. **Resources**: admin upload UI, student-facing list.
13. **Teacher dashboard**: classroom creation, invite codes, roster, case release toggles, drill-down view, basic analytics (avg score, completion rate, per-stage where students bomb).
14. **Student dashboard + progress page**.
15. **Email**: Resend integration for password reset + teacher "set password" emails.
16. **Polish, mobile responsiveness, deploy to Vercel**.

---

## 11. Out of scope (do not build)

- Advanced analytics beyond per-classroom averages and completion rates
- Automated/scheduled case release
- Multi-admin or per-school admin
- Real-time features, live collaboration
- Payment/billing
- Native mobile app (responsive web is enough)
- CI/CD beyond Vercel default
- COPPA-specific flows (out of scope for POC — flag if asked)
- PDF DRM / view-only enforcement (just use browser's PDF viewer)
- Search across library
- Case versioning (admin deletes + recreates to change structure)
- Save-and-resume mid-case
- Within-attempt retry of a stage
- Cross-school visibility for any role
- Bulk CSV upload for cases / users (manual entry is fine at POC scale)
- Audit log / change history
- Branded white-labeling per school

---

## 12. Notes for execution

- Start with the **case player** as the visual north star. If that page feels right, everything else falls into place.
- **Use the reference HTML mockup as the ground-truth for typography, spacing, color, and component patterns.** Don't reinterpret. Match it.
- The **admin case authoring UI** is the most complex screen in the build — budget time accordingly. A bad authoring UI makes the whole product unusable from the client's side, even if everything else is perfect.
- Resist the urge to add "polish" features the brief doesn't mention (no tutorials, no toasts, no celebratory animations, no XP/levels gamification, no avatars except where they're a real person's identity).
- The accent color `#1A6B5C` is used **sparingly** — left borders, current-state indicators, the rare CTA hover state. Most of the UI is paper + ink. The accent is a quiet signal, not a paint.
- When in doubt about a component, choose the more restrained option. This product earns trust by feeling like a serious tool.

Ask only if something is truly ambiguous. Otherwise, build.

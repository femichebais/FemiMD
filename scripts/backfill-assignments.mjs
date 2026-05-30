#!/usr/bin/env node
// Two-tier content gating migration + backfill. Idempotent — re-runnable.
//
// Reads DATABASE_URL from .env.local. Does two things in one transaction:
//   1. DDL — creates the 6 new tables (admin→teacher assignments + library/
//      resource teacher→student releases) IF NOT EXISTS.
//   2. Backfill ("preserve both") — pre-populates assignments + the new
//      release tables from current visibility so nothing disappears for
//      existing classrooms. case_releases / quiz_releases are left untouched.
//
// Safe to run before deploying the new app code: the additions are purely
// additive, so the currently-deployed app keeps working until the new code
// ships.

import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.error("✗ Missing DATABASE_URL (set it in .env.local)");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

// ---------------------------------------------------------------------------
// 1. DDL — mirrors src/db/schema.ts. gen_random_uuid() matches drizzle's
//    .defaultRandom(); FK onDelete matches the schema (case_id RESTRICT, the
//    rest CASCADE).
// ---------------------------------------------------------------------------
const DDL = [
  `CREATE TABLE IF NOT EXISTS classroom_case_assignments (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
     case_id uuid NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
     assigned_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS classroom_case_assignments_classroom_case_uq
     ON classroom_case_assignments (classroom_id, case_id)`,

  `CREATE TABLE IF NOT EXISTS classroom_quiz_assignments (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
     quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
     assigned_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS classroom_quiz_assignments_classroom_quiz_uq
     ON classroom_quiz_assignments (classroom_id, quiz_id)`,

  `CREATE TABLE IF NOT EXISTS classroom_library_assignments (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
     library_page_id uuid NOT NULL REFERENCES library_pages(id) ON DELETE CASCADE,
     assigned_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS classroom_library_assignments_classroom_page_uq
     ON classroom_library_assignments (classroom_id, library_page_id)`,

  `CREATE TABLE IF NOT EXISTS classroom_resource_assignments (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
     resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
     assigned_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS classroom_resource_assignments_classroom_resource_uq
     ON classroom_resource_assignments (classroom_id, resource_id)`,

  `CREATE TABLE IF NOT EXISTS library_releases (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
     library_page_id uuid NOT NULL REFERENCES library_pages(id) ON DELETE CASCADE,
     released_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS library_releases_classroom_page_uq
     ON library_releases (classroom_id, library_page_id)`,

  `CREATE TABLE IF NOT EXISTS resource_releases (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
     resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
     released_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS resource_releases_classroom_resource_uq
     ON resource_releases (classroom_id, resource_id)`,
];

// ---------------------------------------------------------------------------
// 2. Backfill — preserve current visibility. Each is INSERT ... SELECT ...
//    ON CONFLICT DO NOTHING so re-runs are no-ops.
// ---------------------------------------------------------------------------
const BACKFILL = [
  // Cases: teachers currently see every published, level-matched, non-deleted
  // case → assign those. Plus any already-released case (safety).
  ["assign cases (level-matched)", `
    INSERT INTO classroom_case_assignments (classroom_id, case_id)
    SELECT c.id, ca.id
    FROM classrooms c
    JOIN case_level_config clc ON clc.level = c.level
    JOIN cases ca ON ca.id = clc.case_id
    WHERE c.deleted_at IS NULL AND ca.deleted_at IS NULL
      AND ca.published_at IS NOT NULL
    ON CONFLICT DO NOTHING`],
  ["assign cases (already released)", `
    INSERT INTO classroom_case_assignments (classroom_id, case_id)
    SELECT cr.classroom_id, cr.case_id
    FROM case_releases cr
    JOIN classrooms c ON c.id = cr.classroom_id AND c.deleted_at IS NULL
    ON CONFLICT DO NOTHING`],

  // Quizzes: preserve all actionable quizzes — case-attached (level-matched),
  // standalone (to every classroom), and any already-released.
  ["assign quizzes (case-attached, level-matched)", `
    INSERT INTO classroom_quiz_assignments (classroom_id, quiz_id)
    SELECT c.id, q.id
    FROM classrooms c
    JOIN case_level_config clc ON clc.level = c.level
    JOIN quizzes q ON q.case_id = clc.case_id
    WHERE c.deleted_at IS NULL AND q.deleted_at IS NULL
    ON CONFLICT DO NOTHING`],
  ["assign quizzes (standalone)", `
    INSERT INTO classroom_quiz_assignments (classroom_id, quiz_id)
    SELECT c.id, q.id
    FROM classrooms c
    JOIN quizzes q ON q.case_id IS NULL
    WHERE c.deleted_at IS NULL AND q.deleted_at IS NULL
    ON CONFLICT DO NOTHING`],
  ["assign quizzes (already released)", `
    INSERT INTO classroom_quiz_assignments (classroom_id, quiz_id)
    SELECT qr.classroom_id, qr.quiz_id
    FROM quiz_releases qr
    JOIN classrooms c ON c.id = qr.classroom_id AND c.deleted_at IS NULL
    ON CONFLICT DO NOTHING`],

  // Library + resources: teachers/students currently see them by level →
  // assign the level-matched set.
  ["assign library (level-matched)", `
    INSERT INTO classroom_library_assignments (classroom_id, library_page_id)
    SELECT c.id, lp.id
    FROM classrooms c
    JOIN library_page_levels lpl ON lpl.level = c.level
    JOIN library_pages lp ON lp.id = lpl.library_page_id
    WHERE c.deleted_at IS NULL AND lp.deleted_at IS NULL
    ON CONFLICT DO NOTHING`],
  ["assign resources (level-matched)", `
    INSERT INTO classroom_resource_assignments (classroom_id, resource_id)
    SELECT c.id, r.id
    FROM classrooms c
    JOIN resource_levels rl ON rl.level = c.level
    JOIN resources r ON r.id = rl.resource_id
    WHERE c.deleted_at IS NULL AND r.deleted_at IS NULL
    ON CONFLICT DO NOTHING`],

  // Release library/resources to students for the same set, so students keep
  // the access they had under level-gating. Derived from the assignment rows
  // just inserted above.
  ["release library (= assigned)", `
    INSERT INTO library_releases (classroom_id, library_page_id)
    SELECT classroom_id, library_page_id FROM classroom_library_assignments
    ON CONFLICT DO NOTHING`],
  ["release resources (= assigned)", `
    INSERT INTO resource_releases (classroom_id, resource_id)
    SELECT classroom_id, resource_id FROM classroom_resource_assignments
    ON CONFLICT DO NOTHING`],
];

const COUNT_TABLES = [
  "classroom_case_assignments",
  "classroom_quiz_assignments",
  "classroom_library_assignments",
  "classroom_resource_assignments",
  "library_releases",
  "resource_releases",
];

try {
  await sql.begin(async (tx) => {
    console.log("Applying DDL…");
    for (const stmt of DDL) await tx.unsafe(stmt);

    console.log("Backfilling (preserve both)…");
    for (const [label, stmt] of BACKFILL) {
      const res = await tx.unsafe(stmt);
      console.log(`  + ${label}: ${res.count} row(s)`);
    }
  });

  console.log("\nFinal row counts:");
  for (const t of COUNT_TABLES) {
    const [{ count }] = await sql.unsafe(`SELECT COUNT(*)::int AS count FROM ${t}`);
    console.log(`  ${t}: ${count}`);
  }
  console.log("\n✓ Done.");
} catch (err) {
  console.error("\n✗ Failed:", err);
  process.exitCode = 1;
} finally {
  await sql.end();
}

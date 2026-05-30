#!/usr/bin/env node
// One-off cleanup for accounts left behind by the OLD soft-delete behaviour.
//
// Before the hard-delete fix, "deleting" a teacher/student only set deleted_at
// on their row (hiding it from admin lists) and tried to tombstone the auth
// email. The auth.users record, profile, role, and owned content all survived
// — so a deleted user could regain access via "forgot password", and the admin
// UI had no way to finish the job (the row is hidden).
//
// This script finds every soft-deleted teacher/student still present in the DB
// and fully purges them, matching the new hard-delete policy:
//   teachers  -> detach enrolled students, drop classrooms, delete auth user
//   students  -> delete case/quiz attempts, delete auth user (cascades the rest)
//
// Reads .env.local for DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.
//
// SAFE BY DEFAULT: prints what it WOULD do. Re-run with `--apply` to execute.
//   node scripts/purge-deleted-accounts.mjs            (dry run)
//   node scripts/purge-deleted-accounts.mjs --apply    (for real)

import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");

const REQUIRED_ENV = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`✗ Missing required env var: ${key}`);
    process.exit(1);
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sql = postgres(process.env.DATABASE_URL, { prepare: false });

console.log(
  APPLY
    ? "PURGE MODE — changes will be written.\n"
    : "DRY RUN — no changes. Re-run with --apply to execute.\n"
);

// Delete an auth.users row via the Admin API (cascades profiles -> role row).
// A 404 means it's already gone — treat as success.
async function deleteAuthUser(id) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`deleteUser ${id} -> ${res.status}: ${await res.text()}`);
  }
}

async function purgeTeachers() {
  const rows = await sql`
    SELECT id, email FROM teachers WHERE deleted_at IS NOT NULL
  `;
  console.log(`Teachers to purge: ${rows.length}`);
  for (const t of rows) {
    const classroomRows = await sql`
      SELECT id FROM classrooms WHERE teacher_id = ${t.id}
    `;
    const classroomIds = classroomRows.map((c) => c.id);
    console.log(
      `  teacher ${t.id} (${t.email}) — ${classroomIds.length} classroom(s)`
    );
    if (!APPLY) continue;

    await sql.begin(async (tx) => {
      if (classroomIds.length > 0) {
        await tx`
          UPDATE students SET classroom_id = NULL
          WHERE classroom_id = ANY(${classroomIds})
        `;
        await tx`DELETE FROM classrooms WHERE id = ANY(${classroomIds})`;
      }
    });
    await deleteAuthUser(t.id);
    console.log(`    ✓ purged`);
  }
}

async function purgeStudents() {
  const rows = await sql`
    SELECT id, email FROM students WHERE deleted_at IS NOT NULL
  `;
  console.log(`Students to purge: ${rows.length}`);
  for (const s of rows) {
    console.log(`  student ${s.id} (${s.email})`);
    if (!APPLY) continue;

    await sql.begin(async (tx) => {
      await tx`DELETE FROM case_attempts WHERE student_id = ${s.id}`;
      await tx`DELETE FROM quiz_attempts WHERE student_id = ${s.id}`;
    });
    await deleteAuthUser(s.id);
    console.log(`    ✓ purged`);
  }
}

try {
  await purgeTeachers();
  console.log("");
  await purgeStudents();
  console.log("");
  console.log(APPLY ? "✓ Purge complete." : "Dry run complete.");
} catch (err) {
  console.error("✗ Failed:", err.message);
  if (err.stack) console.error(err.stack);
  process.exitCode = 1;
} finally {
  await sql.end();
}

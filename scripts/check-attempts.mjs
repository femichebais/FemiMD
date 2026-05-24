#!/usr/bin/env node
// Quick read-only diagnostic for case + quiz attempt counts. Used to
// figure out whether classroom analytics that look wrong are a data
// issue or a code issue.

import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  max: 1,
  prepare: false,
});

try {
  const [{ total: caTotal }] = await sql`SELECT COUNT(*)::int AS total FROM case_attempts`;
  const [{ total: saTotal }] = await sql`SELECT COUNT(*)::int AS total FROM stage_attempts`;
  const [{ total: qaTotal }] = await sql`SELECT COUNT(*)::int AS total FROM quiz_attempts`;
  console.log(`Global counts: case_attempts=${caTotal} stage_attempts=${saTotal} quiz_attempts=${qaTotal}`);

  const classrooms = await sql`
    SELECT c.id, c.name, c.level, c.invite_code,
      (SELECT COUNT(*)::int FROM students s WHERE s.classroom_id = c.id AND s.deleted_at IS NULL) AS student_count
    FROM classrooms c WHERE c.deleted_at IS NULL ORDER BY c.created_at DESC
  `;
  console.log(`\nClassrooms (${classrooms.length}):`);
  for (const c of classrooms) {
    console.log(`  · ${c.name} (${c.level}) — ${c.student_count} students [${c.invite_code}]`);

    const stats = await sql`
      SELECT s.id, s.name,
        (SELECT COUNT(*)::int FROM case_attempts ca WHERE ca.student_id = s.id) AS case_attempts,
        (SELECT COUNT(*)::int FROM case_attempts ca WHERE ca.student_id = s.id AND ca.completed_at IS NOT NULL) AS completed_case_attempts,
        (SELECT COUNT(DISTINCT ca.case_id)::int FROM case_attempts ca WHERE ca.student_id = s.id AND ca.completed_at IS NOT NULL) AS distinct_cases_completed,
        (SELECT COUNT(*)::int FROM quiz_attempts qa WHERE qa.student_id = s.id) AS quiz_attempts
      FROM students s
      WHERE s.classroom_id = ${c.id} AND s.deleted_at IS NULL
      ORDER BY s.name
    `;
    for (const r of stats) {
      console.log(
        `      ${r.name}: case=${r.case_attempts} completed-attempts=${r.completed_case_attempts} distinct-cases=${r.distinct_cases_completed} quiz=${r.quiz_attempts}`
      );
    }

    const releasedCases = await sql`
      SELECT c2.title FROM case_releases cr JOIN cases c2 ON c2.id = cr.case_id
      WHERE cr.classroom_id = ${c.id}
    `;
    console.log(`      released cases: ${releasedCases.map((r) => r.title).join(", ") || "(none)"}`);
    const releasedQuizzes = await sql`
      SELECT q.title FROM quiz_releases qr JOIN quizzes q ON q.id = qr.quiz_id
      WHERE qr.classroom_id = ${c.id}
    `;
    console.log(`      released quizzes: ${releasedQuizzes.map((r) => r.title).join(", ") || "(none)"}`);
  }
} catch (err) {
  console.error("✗", err.message ?? err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}

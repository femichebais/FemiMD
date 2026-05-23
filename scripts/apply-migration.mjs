#!/usr/bin/env node
// Apply a Drizzle migration file followed by the RLS policy script.
//
// Usage: node scripts/apply-migration.mjs <migration-file.sql>
// Example: node scripts/apply-migration.mjs drizzle/0004_library_sections.sql

import { readFile } from "node:fs/promises";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const migrationPath = process.argv[2];
if (!migrationPath) {
  console.error("Usage: node scripts/apply-migration.mjs <path.sql>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing from .env.local");
  process.exit(1);
}

// Hide credentials from log — print the host only.
const host = (() => {
  try {
    return new URL(url).host;
  } catch {
    return "<unparseable>";
  }
})();
console.log(`→ Target: ${host}`);

const sql = postgres(url, {
  ssl: "require",
  max: 1,
  prepare: false,
  onnotice: (n) => console.log(`  notice: ${n.message}`),
});

try {
  const migrationSql = await readFile(migrationPath, "utf8");
  console.log(`→ Applying ${migrationPath} …`);
  await sql.unsafe(migrationSql);
  console.log("  ✓ migration applied");

  const rlsSql = await readFile("db/policies/0001_rls.sql", "utf8");
  console.log("→ Re-running db/policies/0001_rls.sql …");
  await sql.unsafe(rlsSql);
  console.log("  ✓ RLS policies refreshed");

  console.log("Done.");
} catch (err) {
  console.error("✗ Migration failed:", err.message ?? err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}

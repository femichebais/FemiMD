#!/usr/bin/env node
// Apply only db/policies/0001_rls.sql (idempotent — drops + recreates
// every policy). Useful when only the RLS file changes.

import { readFile } from "node:fs/promises";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing from .env.local");
  process.exit(1);
}

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
  const rlsSql = await readFile("db/policies/0001_rls.sql", "utf8");
  console.log("→ Applying db/policies/0001_rls.sql …");
  await sql.unsafe(rlsSql);
  console.log("  ✓ RLS policies refreshed");
} catch (err) {
  console.error("✗ Failed:", err.message ?? err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}

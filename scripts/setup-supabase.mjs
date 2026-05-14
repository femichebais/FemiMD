#!/usr/bin/env node
// One-shot Supabase setup. Idempotent — re-runnable.
//
// Reads .env.local for:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   DATABASE_URL
//   ADMIN_SEED_EMAIL
//   ADMIN_SEED_PASSWORD
//
// Does:
//   1. Apply schema (drizzle/0000_*.sql) — skipped if tables exist
//   2. Apply RLS policies (db/policies/0001_rls.sql)
//   3. Seed admin user (db/seed/admin.sql) — skipped if email exists
//   4. Create femi-media storage bucket — skipped if exists
//   5. Verify by signing in as the admin and checking app_metadata.role

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";

// Note: we use raw fetch for the Supabase REST/Auth/Storage APIs instead of
// @supabase/supabase-js. The JS SDK pulls in a Realtime client that fails to
// init on Node ≤21 without a WebSocket polyfill — pointless overhead for a
// setup script that just makes a couple of HTTP calls.

config({ path: ".env.local" });

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "ADMIN_SEED_EMAIL",
  "ADMIN_SEED_PASSWORD",
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`✗ Missing required env var: ${key}`);
    console.error("  Fill in .env.local and re-run.");
    process.exit(1);
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;
const adminEmail = process.env.ADMIN_SEED_EMAIL.toLowerCase();
const adminPassword = process.env.ADMIN_SEED_PASSWORD;

console.log("Setting up Supabase for", supabaseUrl);
console.log("");

// ---------------------------------------------------------------------------
// Connect to Postgres
// ---------------------------------------------------------------------------

const sql = postgres(databaseUrl, { prepare: false });

async function tableExists(schema, name) {
  const rows = await sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = ${schema} AND table_name = ${name} LIMIT 1
  `;
  return rows.length > 0;
}

async function readSqlFile(path) {
  return await readFile(path, "utf8");
}

// ---------------------------------------------------------------------------
// Step 1: Schema migration
// ---------------------------------------------------------------------------

async function findSchemaMigration() {
  const files = await readdir("drizzle");
  const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();
  if (sqlFiles.length === 0) {
    throw new Error("No drizzle/*.sql migrations found. Run `npm run db:generate` first.");
  }
  return join("drizzle", sqlFiles[0]);
}

async function applySchema() {
  if (await tableExists("public", "profiles")) {
    console.log("→ Schema: profiles already exists — skipping.");
    return;
  }
  const path = await findSchemaMigration();
  console.log(`→ Schema: applying ${path}`);
  const text = await readSqlFile(path);
  await sql.unsafe(text);
  console.log("  ✓ Schema applied");
}

// ---------------------------------------------------------------------------
// Step 2: RLS policies (idempotent — drops + recreates everything)
// ---------------------------------------------------------------------------

async function applyRLS() {
  console.log("→ RLS: applying db/policies/0001_rls.sql");
  const text = await readSqlFile("db/policies/0001_rls.sql");
  await sql.unsafe(text);
  console.log("  ✓ RLS policies applied");
}

// ---------------------------------------------------------------------------
// Step 3: Admin seed
// ---------------------------------------------------------------------------

async function seedAdmin() {
  // First — sanity check: does a user already exist AND can it actually
  // sign in? If yes, leave it alone. If a row exists but it's a broken
  // hand-seeded one, blow it away and recreate via the Auth Admin API.
  const existing = await sql`
    SELECT id FROM auth.users WHERE email = ${adminEmail} LIMIT 1
  `;

  if (existing.length > 0) {
    const userId = existing[0].id;
    const works = await canSignIn();
    if (works) {
      console.log(`→ Admin: ${adminEmail} already exists and signs in — skipping.`);
      return userId;
    }
    console.log(
      `→ Admin: ${adminEmail} exists but sign-in fails — wiping + recreating via Auth Admin API.`
    );
    // CASCADE removes auth.identities + profiles + teachers/students rows.
    await sql`DELETE FROM auth.users WHERE email = ${adminEmail}`;
  }

  console.log(`→ Admin: creating ${adminEmail} via Auth Admin API`);

  // Use POST /auth/v1/admin/users — GoTrue handles all the internal
  // state (identities row, instance_id, password hashing, audience, etc.)
  // that direct SQL inserts miss.
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      app_metadata: { role: "admin" },
    }),
  });

  if (!res.ok) {
    throw new Error(
      `auth.admin.createUser ${res.status}: ${await res.text()}`
    );
  }
  const body = await res.json();
  const userId = body.id ?? body.user?.id;
  if (!userId) {
    throw new Error(`createUser returned no id: ${JSON.stringify(body)}`);
  }

  await sql`
    INSERT INTO profiles (id, role)
    VALUES (${userId}, 'admin')
    ON CONFLICT (id) DO NOTHING
  `;

  console.log("  ✓ Admin created via Auth API + profile inserted");
  return userId;
}

async function canSignIn() {
  const res = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    }
  );
  return res.ok;
}

// ---------------------------------------------------------------------------
// Step 4: Storage bucket (Storage REST API directly)
// ---------------------------------------------------------------------------

async function createBucket() {
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  const listRes = await fetch(`${supabaseUrl}/storage/v1/bucket`, { headers });
  if (!listRes.ok) {
    throw new Error(
      `listBuckets ${listRes.status}: ${await listRes.text()}`
    );
  }
  const buckets = await listRes.json();
  if (Array.isArray(buckets) && buckets.find((b) => b.name === "femi-media")) {
    console.log("→ Storage: femi-media already exists — skipping.");
    return;
  }

  console.log("→ Storage: creating femi-media");
  const createRes = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: "femi-media",
      name: "femi-media",
      public: true,
      file_size_limit: 25 * 1024 * 1024,
    }),
  });
  if (!createRes.ok) {
    throw new Error(
      `createBucket ${createRes.status}: ${await createRes.text()}`
    );
  }
  console.log("  ✓ Bucket created (public read)");
}

// ---------------------------------------------------------------------------
// Step 5: Verify admin sign-in + role (Auth REST API directly)
// ---------------------------------------------------------------------------

async function verify() {
  console.log("→ Verify: signing in as admin and reading JWT");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? serviceRoleKey;

  const res = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    }
  );

  if (!res.ok) {
    throw new Error(`signIn ${res.status}: ${await res.text()}`);
  }
  const body = await res.json();
  const role = body.user?.app_metadata?.role;
  if (role !== "admin") {
    throw new Error(`Expected admin role, got: ${JSON.stringify(role)}`);
  }
  console.log(`  ✓ Admin signs in; app_metadata.role = '${role}'`);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

try {
  await applySchema();
  await applyRLS();
  await seedAdmin();
  await createBucket();
  await verify();

  console.log("");
  console.log("✓ Setup complete.");
  console.log("");
  console.log("Next:");
  console.log("  1. Remove ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD from .env.local");
  console.log("  2. Run `npm run dev` and sign in at http://localhost:3000/admin/login");
  console.log("");
} catch (err) {
  console.error("");
  console.error("✗ Setup failed:", err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
} finally {
  await sql.end();
}

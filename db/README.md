# Database

## Layout

```
db/
├── policies/0001_rls.sql   ← RLS policies (idempotent)
├── seed/admin.sql          ← One-time admin user seed
└── README.md

drizzle/                    ← Drizzle Kit generated migrations
├── 0000_*.sql              ← initial schema
└── meta/                   ← snapshot + journal (commit these)
```

## Bring-up order

Run these against a fresh Supabase project, in this order:

1. **Schema migration** — `npm run db:push` (or apply `drizzle/0000_*.sql` via `psql`).
   - Creates all tables, enums, indexes, and FKs.
   - The generated migration was patched by hand to skip `CREATE TABLE auth.users`
     (Supabase owns that table). If you regenerate, redo the patch.

2. **RLS policies** — `psql "$DATABASE_URL" -f db/policies/0001_rls.sql`
   - Enables RLS on every public table and adds per-role policies.
   - Idempotent: every `CREATE POLICY` is preceded by `DROP POLICY IF EXISTS`,
     and helper functions use `CREATE OR REPLACE`.
   - **Always run this after a schema migration.** Drizzle migrations don't
     manage RLS state.

3. **Admin seed** — `psql "$DATABASE_URL" -f db/seed/admin.sql`
   - Replace `<ADMIN_EMAIL>` and `<ADMIN_PASSWORD>` placeholders first.
   - Creates the one platform admin (`role='admin'` in both
     `auth.users.app_metadata` and `profiles`).
   - Run only once per fresh project.

4. **Storage bucket** (for library cover images, future case images, resource PDFs):
   - Create a bucket named `femi-media` in the Supabase Storage UI.
   - Toggle **Public bucket** ON (assets are publicly readable).
   - Write access is via the service-role key only — no anon/auth INSERT policies.
     The admin upload action (`src/app/admin/.../library/actions.ts ::
     uploadLibraryImage`) uses `createSupabaseAdminClient()` which bypasses
     bucket RLS.
   - Path convention: `library/{slug}/cover-{timestamp}.{ext}`. Other content
     types will use sibling prefixes (`cases/...`, `resources/...`).

## Drizzle vs Supabase client — which to use, when

The codebase has two ways to talk to the database. They have different
security semantics — pick deliberately:

| Client | Auth | RLS | Use for |
|---|---|---|---|
| `createSupabaseServerClient()` | User's JWT (from cookies) | **Enforced** | Every read/write on behalf of an authenticated user |
| `createSupabaseAdminClient()`  | `service_role` key      | **Bypassed**| Provisioning (admin creates teacher, admin releases case via API), background jobs, anything where the actor isn't a real user |
| `db` (Drizzle, `src/db/client.ts`) | DB role from `DATABASE_URL` | **Bypassed**¹ | Complex joins, analytics, server-side reads where you want type-safe SQL |

¹ Drizzle connects with a Postgres role that has full table access. RLS is
**not** enforced through Drizzle. **If you query user data through Drizzle,
you MUST manually scope by `auth.uid()` / classroom / etc. in WHERE clauses.**
Use the Supabase server client (with user JWT) whenever you can — RLS does
the filtering for you. Reserve Drizzle for queries that are inherently
admin-scoped or that need complex joins.

## Regenerating migrations

```sh
npm run db:generate   # diff schema → drizzle/000X_*.sql
```

After regenerating:
1. Re-apply the `auth.users` patch (remove the `CREATE TABLE "auth"."users"` block).
2. Commit the new SQL file + updated `drizzle/meta/`.
3. Run RLS policies again — new tables won't have RLS until you add policies for them.

## Soft-delete

Tables with `deleted_at` (most of them) follow the soft-delete pattern.
Always filter `WHERE deleted_at IS NULL` for active records. The RLS policies
for `cases`, `quiz_questions`, `library_pages`, and `resources` already
enforce this for user-facing reads.

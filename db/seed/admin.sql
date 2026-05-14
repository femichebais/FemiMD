-- ============================================================================
-- Seed: admin user
-- ----------------------------------------------------------------------------
-- Run this ONCE per fresh Supabase project, AFTER:
--   1. drizzle-kit push  (creates the profiles table)
--   2. RLS policies for profiles are in place (step 3 of the build order)
--
-- Replace the two placeholders below before running:
--   <ADMIN_EMAIL>        — your platform admin email
--   <ADMIN_PASSWORD>     — strong password (you'll change this later via UI)
--
-- This creates an auth.users row with role='admin' baked into app_metadata
-- (so the JWT carries the role for our middleware) and a matching profiles
-- row (so app queries can JOIN on it).
-- ============================================================================

-- The admin's UUID — generated here so we can reuse it across both inserts.
-- If you re-run this seed, regenerate the UUID or you'll hit a PK conflict.
WITH new_admin AS (
  SELECT gen_random_uuid() AS id
)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_super_admin,
  is_sso_user,
  is_anonymous
)
SELECT
  new_admin.id,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  '<ADMIN_EMAIL>',
  crypt('<ADMIN_PASSWORD>', gen_salt('bf')),
  NOW(),
  jsonb_build_object(
    'provider', 'email',
    'providers', ARRAY['email']::text[],
    'role', 'admin'  -- this is what middleware + JWT check reads
  ),
  '{}'::jsonb,
  NOW(),
  NOW(),
  FALSE,
  FALSE,
  FALSE
FROM new_admin;

-- Mirror into profiles so app code can JOIN without hitting auth schema.
INSERT INTO profiles (id, role)
SELECT id, 'admin'::role
FROM auth.users
WHERE email = '<ADMIN_EMAIL>'
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT
  u.id,
  u.email,
  u.raw_app_meta_data->>'role' AS jwt_role,
  p.role AS profile_role
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email = '<ADMIN_EMAIL>';

-- Self-serve signup + admin approval flow.
--
-- Three changes:
--   1. Extend the role enum with 'pending' for signups awaiting approval.
--   2. Loosen students.classroom_id NOT NULL so admins can approve a student
--      with direct case access but no classroom (the MVP path until
--      classrooms are widely used).
--   3. New pending_signups table holding the queue of confirmed-but-unapproved
--      accounts that the admin reviews.

ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'pending';

ALTER TABLE "students" ALTER COLUMN "classroom_id" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "pending_signups" (
  "id" uuid PRIMARY KEY NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "requested_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "pending_signups_requested_idx"
  ON "pending_signups" ("requested_at");

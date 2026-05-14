-- Quiz schema refactor: questions move from being tied to (case,scope)
-- pairs to belonging to a `quizzes` row (which itself may optionally tie
-- back to a case + scope, or be standalone). Adds release + grant tables.
--
-- Safe to apply on the live DB because no quiz_questions / quiz_attempts
-- rows exist yet (verified). If data existed, we'd need a backfill that
-- creates one quiz row per (case_id, scope) and remaps question quiz_id.

-- 1. New: quizzes table
CREATE TABLE "quizzes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "topic" text,
  "case_id" uuid,
  "scope" "quiz_scope",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "quizzes_case_id_fk" FOREIGN KEY ("case_id")
    REFERENCES "cases"("id") ON DELETE cascade
);

-- 2. quiz_questions: drop (case_id, scope), add quiz_id FK
-- The RLS policy `read_quiz_questions` references case_id; drop it first.
-- We'll re-add a replacement that references quiz_id after the rename.
DROP POLICY IF EXISTS "read_quiz_questions" ON "quiz_questions";
DROP INDEX IF EXISTS "quiz_questions_case_scope_idx";
ALTER TABLE "quiz_questions" DROP CONSTRAINT IF EXISTS "quiz_questions_case_id_cases_id_fk";
ALTER TABLE "quiz_questions" DROP COLUMN IF EXISTS "case_id";
ALTER TABLE "quiz_questions" DROP COLUMN IF EXISTS "scope";
ALTER TABLE "quiz_questions" ADD COLUMN "quiz_id" uuid NOT NULL
  REFERENCES "quizzes"("id") ON DELETE cascade;
CREATE INDEX "quiz_questions_quiz_idx" ON "quiz_questions"("quiz_id");
-- Replacement RLS: anyone authenticated can read questions whose parent
-- quiz exists. App-layer queries further scope by release / grant.
CREATE POLICY "read_quiz_questions" ON "quiz_questions"
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM "quizzes" q WHERE q.id = "quiz_questions"."quiz_id" AND q.deleted_at IS NULL)
  );

-- 3. quiz_attempts: add quiz_id (nullable for now), relax case_id+scope
ALTER TABLE "quiz_attempts" ADD COLUMN "quiz_id" uuid
  REFERENCES "quizzes"("id") ON DELETE restrict;
ALTER TABLE "quiz_attempts" ALTER COLUMN "case_id" DROP NOT NULL;
ALTER TABLE "quiz_attempts" ALTER COLUMN "scope" DROP NOT NULL;
ALTER TABLE "quiz_attempts" DROP CONSTRAINT IF EXISTS "quiz_attempts_case_id_cases_id_fk";
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_case_id_cases_id_fk"
  FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE restrict;
DROP INDEX IF EXISTS "quiz_attempts_student_case_scope_idx";
CREATE INDEX "quiz_attempts_student_quiz_idx" ON "quiz_attempts"("student_id", "quiz_id");

-- 4. New: quiz_releases (per-classroom)
CREATE TABLE "quiz_releases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "classroom_id" uuid NOT NULL REFERENCES "classrooms"("id") ON DELETE cascade,
  "quiz_id" uuid NOT NULL REFERENCES "quizzes"("id") ON DELETE cascade,
  "released_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "quiz_releases_classroom_quiz_uq" ON "quiz_releases"("classroom_id", "quiz_id");

-- 5. New: student_quiz_grants (admin override)
CREATE TABLE "student_quiz_grants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE cascade,
  "quiz_id" uuid NOT NULL REFERENCES "quizzes"("id") ON DELETE cascade,
  "granted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "granted_by" uuid
);
CREATE UNIQUE INDEX "student_quiz_grants_uq" ON "student_quiz_grants"("student_id", "quiz_id");

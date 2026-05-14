CREATE TYPE "public"."level" AS ENUM('middle', 'high', 'undergrad');--> statement-breakpoint
CREATE TYPE "public"."quiz_scope" AS ENUM('pre', 'post');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('pdf', 'link', 'slides');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'teacher', 'student');--> statement-breakpoint
CREATE TYPE "public"."stage_type" AS ENUM('history', 'exam', 'diagnosis', 'disposition', 'treatment');--> statement-breakpoint
-- NOTE: auth.users is owned by Supabase and already exists. Drizzle declares
-- it in the schema only so we can reference it via FK; the CREATE TABLE
-- statement was removed by hand from this generated migration.
--> statement-breakpoint
CREATE TABLE "case_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"total_score" integer
);
--> statement-breakpoint
CREATE TABLE "case_level_config" (
	"case_id" uuid NOT NULL,
	"level" "level" NOT NULL,
	"treatment_enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "case_level_config_case_id_level_pk" PRIMARY KEY("case_id","level")
);
--> statement-breakpoint
CREATE TABLE "case_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"classroom_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"released_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"scenario_intro" text,
	"linked_diagnosis_slug" text,
	"quiz_question_count" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "choices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_id" uuid NOT NULL,
	"letter" text NOT NULL,
	"text" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"is_correct" boolean,
	"response_text" text,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classrooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"name" text NOT NULL,
	"level" "level" NOT NULL,
	"invite_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "library_page_levels" (
	"library_page_id" uuid NOT NULL,
	"level" "level" NOT NULL,
	CONSTRAINT "library_page_levels_library_page_id_level_pk" PRIMARY KEY("library_page_id","level")
);
--> statement-breakpoint
CREATE TABLE "library_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diagnosis_slug" text NOT NULL,
	"title" text NOT NULL,
	"eyebrow" text,
	"dek" text,
	"body_markdown" text NOT NULL,
	"cover_image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" "role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"scope" "quiz_scope" NOT NULL,
	"question_count" integer NOT NULL,
	"score" integer NOT NULL,
	"answers" jsonb NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_choices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"text" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"display_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"scope" "quiz_scope" NOT NULL,
	"prompt" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "resource_levels" (
	"resource_id" uuid NOT NULL,
	"level" "level" NOT NULL,
	CONSTRAINT "resource_levels_resource_id_level_pk" PRIMARY KEY("resource_id","level")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" "resource_type" NOT NULL,
	"url" text NOT NULL,
	"storage_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stage_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_attempt_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"earned_score" integer DEFAULT 0 NOT NULL,
	"picks" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"type" "stage_type" NOT NULL,
	"prompt" text NOT NULL,
	"max_picks" integer DEFAULT 1 NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY NOT NULL,
	"classroom_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "case_attempts" ADD CONSTRAINT "case_attempts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_attempts" ADD CONSTRAINT "case_attempts_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_level_config" ADD CONSTRAINT "case_level_config_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_releases" ADD CONSTRAINT "case_releases_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_releases" ADD CONSTRAINT "case_releases_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "choices" ADD CONSTRAINT "choices_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_page_levels" ADD CONSTRAINT "library_page_levels_library_page_id_library_pages_id_fk" FOREIGN KEY ("library_page_id") REFERENCES "public"."library_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_choices" ADD CONSTRAINT "quiz_choices_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_levels" ADD CONSTRAINT "resource_levels_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_attempts" ADD CONSTRAINT "stage_attempts_case_attempt_id_case_attempts_id_fk" FOREIGN KEY ("case_attempt_id") REFERENCES "public"."case_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_attempts" ADD CONSTRAINT "stage_attempts_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_id_profiles_id_fk" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_id_profiles_id_fk" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_attempts_student_idx" ON "case_attempts" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "case_attempts_case_idx" ON "case_attempts" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "case_attempts_student_case_idx" ON "case_attempts" USING btree ("student_id","case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "case_releases_classroom_case_uq" ON "case_releases" USING btree ("classroom_id","case_id");--> statement-breakpoint
CREATE INDEX "choices_stage_idx" ON "choices" USING btree ("stage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "classrooms_invite_code_uq" ON "classrooms" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "classrooms_school_idx" ON "classrooms" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "classrooms_teacher_idx" ON "classrooms" USING btree ("teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "library_pages_slug_uq" ON "library_pages" USING btree ("diagnosis_slug");--> statement-breakpoint
CREATE INDEX "quiz_attempts_student_idx" ON "quiz_attempts" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_student_case_scope_idx" ON "quiz_attempts" USING btree ("student_id","case_id","scope");--> statement-breakpoint
CREATE INDEX "quiz_choices_question_idx" ON "quiz_choices" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "quiz_questions_case_scope_idx" ON "quiz_questions" USING btree ("case_id","scope");--> statement-breakpoint
CREATE INDEX "stage_attempts_case_attempt_idx" ON "stage_attempts" USING btree ("case_attempt_id");--> statement-breakpoint
CREATE INDEX "stages_case_idx" ON "stages" USING btree ("case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stages_case_position_uq" ON "stages" USING btree ("case_id","position");--> statement-breakpoint
CREATE INDEX "students_classroom_idx" ON "students" USING btree ("classroom_id");
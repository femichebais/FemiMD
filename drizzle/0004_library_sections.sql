-- Library card refactor: each page becomes a stack of typed cards.
--
-- - Adds the `library_section_type` enum (8 fixed card titles).
-- - Adds `library_page_sections` (one row per card on a page; unique by
--   (page, type) and (page, position)).
-- - Makes `library_pages.body_markdown` nullable. Existing rows are NOT
--   auto-migrated here; the next save in the admin will migrate them by
--   creating a single `description` section from the old body. Reads in
--   the meantime fall back to the legacy body if no sections exist.

-- 1. Enum
CREATE TYPE "library_section_type" AS ENUM (
  'definition',
  'description',
  'what_happens_in_body',
  'symptoms',
  'physical_exam',
  'management',
  'treatment',
  'what_to_do'
);

-- 2. Table
CREATE TABLE "library_page_sections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "library_page_id" uuid NOT NULL,
  "type" "library_section_type" NOT NULL,
  "body_markdown" text NOT NULL,
  "position" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "library_page_sections_page_fk" FOREIGN KEY ("library_page_id")
    REFERENCES "library_pages"("id") ON DELETE cascade
);

CREATE INDEX "library_page_sections_page_idx"
  ON "library_page_sections" ("library_page_id");

CREATE UNIQUE INDEX "library_page_sections_page_position_uq"
  ON "library_page_sections" ("library_page_id", "position");

CREATE UNIQUE INDEX "library_page_sections_page_type_uq"
  ON "library_page_sections" ("library_page_id", "type");

-- 3. Legacy body becomes optional. Code falls back to it until the page is
-- re-saved through the new card editor.
ALTER TABLE "library_pages" ALTER COLUMN "body_markdown" DROP NOT NULL;

-- Make library section types customizable.
--
-- Before: every section was one of 8 fixed preset types.
-- After: a section is either typed (preset label + icon) OR custom
-- (free-form title, default icon). Exactly one of (type, title) must be
-- non-null per row.

ALTER TABLE "library_page_sections" ADD COLUMN "title" text;

ALTER TABLE "library_page_sections" ALTER COLUMN "type" DROP NOT NULL;

-- Exactly one of the two must be set. This rules out rows where both
-- are NULL (invalid) and rows where both are populated (ambiguous —
-- which label/icon would we use?).
ALTER TABLE "library_page_sections"
  ADD CONSTRAINT "library_page_sections_type_xor_title_chk"
  CHECK (
    (type IS NOT NULL AND title IS NULL)
    OR (type IS NULL AND title IS NOT NULL)
  );

-- Postgres treats NULLs as distinct in unique indexes by default, so the
-- existing (library_page_id, type) unique index continues to prevent
-- duplicate preset types while allowing many custom-titled rows per page.

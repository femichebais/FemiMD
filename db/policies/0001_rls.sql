-- ============================================================================
-- RLS policies for Femi Medical
-- ----------------------------------------------------------------------------
-- Apply ONCE after running drizzle-kit migrations. Re-running is safe — every
-- statement uses CREATE OR REPLACE or DROP IF EXISTS guards.
--
-- Architecture:
--   * Role is canonical from auth.jwt() -> 'app_metadata' -> 'role'.
--     app_metadata is NOT user-mutable, set by admin/service role at creation.
--   * Service-role key bypasses RLS entirely — admin Server Actions that
--     create teachers, release cases, etc. use the admin client.
--   * User-session clients (server-with-cookies, browser) ARE subject to RLS.
--   * Tables are enabled by default-deny; only the policies below grant access.
-- ============================================================================

-- ============================================================================
-- Helpers — STABLE so PG caches within a query
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auth_role() RETURNS text
LANGUAGE sql STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE
SECURITY INVOKER
SET search_path = ''
AS $$ SELECT public.auth_role() = 'admin'; $$;

CREATE OR REPLACE FUNCTION public.is_teacher() RETURNS boolean
LANGUAGE sql STABLE
SECURITY INVOKER
SET search_path = ''
AS $$ SELECT public.auth_role() = 'teacher'; $$;

CREATE OR REPLACE FUNCTION public.is_student() RETURNS boolean
LANGUAGE sql STABLE
SECURITY INVOKER
SET search_path = ''
AS $$ SELECT public.auth_role() = 'student'; $$;

-- For the current student, return their classroom_id. NULL if not a student.
CREATE OR REPLACE FUNCTION public.student_classroom_id() RETURNS uuid
LANGUAGE sql STABLE
SECURITY DEFINER  -- read students even when policies would block (helper for policies)
SET search_path = ''
AS $$
  SELECT classroom_id FROM public.students
  WHERE id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;
$$;

-- For the current student, return their classroom's level. NULL if not a student.
CREATE OR REPLACE FUNCTION public.student_level() RETURNS public.level
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.level FROM public.classrooms c
  JOIN public.students s ON s.classroom_id = c.id
  WHERE s.id = auth.uid()
    AND s.deleted_at IS NULL
    AND c.deleted_at IS NULL
  LIMIT 1;
$$;

-- For the current teacher, return their classroom ids.
CREATE OR REPLACE FUNCTION public.teacher_classroom_ids() RETURNS uuid[]
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  FROM public.classrooms
  WHERE teacher_id = auth.uid() AND deleted_at IS NULL;
$$;

-- For the current teacher, return the distinct levels of their classrooms.
CREATE OR REPLACE FUNCTION public.teacher_levels() RETURNS public.level[]
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(array_agg(DISTINCT level), ARRAY[]::public.level[])
  FROM public.classrooms
  WHERE teacher_id = auth.uid() AND deleted_at IS NULL;
$$;

-- ============================================================================
-- Enable RLS on every table
-- ============================================================================

ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_level_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_choices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_attempts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_attempts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_pages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_page_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_levels     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_releases       ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- profiles
-- ============================================================================

DROP POLICY IF EXISTS "admin_all_profiles"  ON public.profiles;
DROP POLICY IF EXISTS "self_read_profile"   ON public.profiles;

CREATE POLICY "admin_all_profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "self_read_profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- ============================================================================
-- schools
-- ============================================================================

DROP POLICY IF EXISTS "admin_all_schools"  ON public.schools;
DROP POLICY IF EXISTS "teacher_read_own_school" ON public.schools;

CREATE POLICY "admin_all_schools" ON public.schools
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "teacher_read_own_school" ON public.schools
  FOR SELECT TO authenticated
  USING (
    public.is_teacher()
    AND id = (SELECT school_id FROM public.teachers WHERE id = auth.uid())
  );

-- ============================================================================
-- teachers
-- ============================================================================

DROP POLICY IF EXISTS "admin_all_teachers" ON public.teachers;
DROP POLICY IF EXISTS "teacher_read_self"  ON public.teachers;

CREATE POLICY "admin_all_teachers" ON public.teachers
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "teacher_read_self" ON public.teachers
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- ============================================================================
-- classrooms
-- ============================================================================

DROP POLICY IF EXISTS "admin_all_classrooms"    ON public.classrooms;
DROP POLICY IF EXISTS "teacher_own_classrooms"  ON public.classrooms;
DROP POLICY IF EXISTS "student_read_classroom"  ON public.classrooms;

CREATE POLICY "admin_all_classrooms" ON public.classrooms
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "teacher_own_classrooms" ON public.classrooms
  FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "student_read_classroom" ON public.classrooms
  FOR SELECT TO authenticated
  USING (id = public.student_classroom_id());

-- ============================================================================
-- students
-- ============================================================================

DROP POLICY IF EXISTS "admin_all_students"     ON public.students;
DROP POLICY IF EXISTS "teacher_read_students"  ON public.students;
DROP POLICY IF EXISTS "student_read_self"      ON public.students;

CREATE POLICY "admin_all_students" ON public.students
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "teacher_read_students" ON public.students
  FOR SELECT TO authenticated
  USING (classroom_id = ANY(public.teacher_classroom_ids()));

CREATE POLICY "student_read_self" ON public.students
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- ============================================================================
-- cases — admin authors, teachers/students read by level/release
-- ============================================================================

DROP POLICY IF EXISTS "admin_all_cases"        ON public.cases;
DROP POLICY IF EXISTS "teacher_read_cases"     ON public.cases;
DROP POLICY IF EXISTS "student_read_released"  ON public.cases;

CREATE POLICY "admin_all_cases" ON public.cases
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Teacher sees any case enabled at any of their classroom levels.
CREATE POLICY "teacher_read_cases" ON public.cases
  FOR SELECT TO authenticated
  USING (
    public.is_teacher() AND deleted_at IS NULL AND EXISTS (
      SELECT 1 FROM public.case_level_config clc
      WHERE clc.case_id = cases.id
        AND clc.level = ANY(public.teacher_levels())
    )
  );

-- Student sees only cases released to their classroom AND at their level.
CREATE POLICY "student_read_released" ON public.cases
  FOR SELECT TO authenticated
  USING (
    public.is_student() AND deleted_at IS NULL AND EXISTS (
      SELECT 1 FROM public.case_releases cr
      WHERE cr.case_id = cases.id
        AND cr.classroom_id = public.student_classroom_id()
    ) AND EXISTS (
      SELECT 1 FROM public.case_level_config clc
      WHERE clc.case_id = cases.id AND clc.level = public.student_level()
    )
  );

-- ============================================================================
-- case_level_config
-- ============================================================================

DROP POLICY IF EXISTS "admin_all_clc"      ON public.case_level_config;
DROP POLICY IF EXISTS "teacher_read_clc"   ON public.case_level_config;
DROP POLICY IF EXISTS "student_read_clc"   ON public.case_level_config;

CREATE POLICY "admin_all_clc" ON public.case_level_config
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "teacher_read_clc" ON public.case_level_config
  FOR SELECT TO authenticated
  USING (level = ANY(public.teacher_levels()));

CREATE POLICY "student_read_clc" ON public.case_level_config
  FOR SELECT TO authenticated
  USING (level = public.student_level());

-- ============================================================================
-- stages / choices — visibility follows the parent case
-- ============================================================================

DROP POLICY IF EXISTS "admin_all_stages"   ON public.stages;
DROP POLICY IF EXISTS "read_stages"        ON public.stages;

CREATE POLICY "admin_all_stages" ON public.stages
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- If you can see the case, you can see its stages. The cases policy already
-- enforces release/level scoping, so we just reuse it via EXISTS.
CREATE POLICY "read_stages" ON public.stages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = stages.case_id));

DROP POLICY IF EXISTS "admin_all_choices" ON public.choices;
DROP POLICY IF EXISTS "read_choices"      ON public.choices;

CREATE POLICY "admin_all_choices" ON public.choices
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "read_choices" ON public.choices
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stages s WHERE s.id = choices.stage_id));

-- ============================================================================
-- quiz_questions / quiz_choices — same pattern as cases/stages
-- ============================================================================

DROP POLICY IF EXISTS "admin_all_quiz_questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "read_quiz_questions"      ON public.quiz_questions;

CREATE POLICY "admin_all_quiz_questions" ON public.quiz_questions
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "read_quiz_questions" ON public.quiz_questions
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = quiz_questions.case_id)
  );

DROP POLICY IF EXISTS "admin_all_quiz_choices" ON public.quiz_choices;
DROP POLICY IF EXISTS "read_quiz_choices"      ON public.quiz_choices;

CREATE POLICY "admin_all_quiz_choices" ON public.quiz_choices
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "read_quiz_choices" ON public.quiz_choices
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.quiz_questions q WHERE q.id = quiz_choices.question_id)
  );

-- ============================================================================
-- attempts: case_attempts, stage_attempts, quiz_attempts
-- Students write their own. Teachers read attempts in their classrooms.
-- ============================================================================

DROP POLICY IF EXISTS "admin_all_case_attempts"     ON public.case_attempts;
DROP POLICY IF EXISTS "student_own_case_attempts"   ON public.case_attempts;
DROP POLICY IF EXISTS "teacher_read_case_attempts"  ON public.case_attempts;

CREATE POLICY "admin_all_case_attempts" ON public.case_attempts
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "student_own_case_attempts" ON public.case_attempts
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "teacher_read_case_attempts" ON public.case_attempts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = case_attempts.student_id
        AND s.classroom_id = ANY(public.teacher_classroom_ids())
    )
  );

DROP POLICY IF EXISTS "admin_all_stage_attempts"     ON public.stage_attempts;
DROP POLICY IF EXISTS "student_own_stage_attempts"   ON public.stage_attempts;
DROP POLICY IF EXISTS "teacher_read_stage_attempts"  ON public.stage_attempts;

CREATE POLICY "admin_all_stage_attempts" ON public.stage_attempts
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "student_own_stage_attempts" ON public.stage_attempts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.case_attempts ca
      WHERE ca.id = stage_attempts.case_attempt_id AND ca.student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.case_attempts ca
      WHERE ca.id = stage_attempts.case_attempt_id AND ca.student_id = auth.uid()
    )
  );

CREATE POLICY "teacher_read_stage_attempts" ON public.stage_attempts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.case_attempts ca
      JOIN public.students s ON s.id = ca.student_id
      WHERE ca.id = stage_attempts.case_attempt_id
        AND s.classroom_id = ANY(public.teacher_classroom_ids())
    )
  );

DROP POLICY IF EXISTS "admin_all_quiz_attempts"     ON public.quiz_attempts;
DROP POLICY IF EXISTS "student_own_quiz_attempts"   ON public.quiz_attempts;
DROP POLICY IF EXISTS "teacher_read_quiz_attempts"  ON public.quiz_attempts;

CREATE POLICY "admin_all_quiz_attempts" ON public.quiz_attempts
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "student_own_quiz_attempts" ON public.quiz_attempts
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "teacher_read_quiz_attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = quiz_attempts.student_id
        AND s.classroom_id = ANY(public.teacher_classroom_ids())
    )
  );

-- ============================================================================
-- library_pages + level join
-- ============================================================================

DROP POLICY IF EXISTS "admin_all_library_pages"   ON public.library_pages;
DROP POLICY IF EXISTS "teacher_read_library"      ON public.library_pages;
DROP POLICY IF EXISTS "student_read_library"      ON public.library_pages;

CREATE POLICY "admin_all_library_pages" ON public.library_pages
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "teacher_read_library" ON public.library_pages
  FOR SELECT TO authenticated
  USING (
    public.is_teacher() AND deleted_at IS NULL AND EXISTS (
      SELECT 1 FROM public.library_page_levels lpl
      WHERE lpl.library_page_id = library_pages.id
        AND lpl.level = ANY(public.teacher_levels())
    )
  );

CREATE POLICY "student_read_library" ON public.library_pages
  FOR SELECT TO authenticated
  USING (
    public.is_student() AND deleted_at IS NULL AND EXISTS (
      SELECT 1 FROM public.library_page_levels lpl
      WHERE lpl.library_page_id = library_pages.id
        AND lpl.level = public.student_level()
    )
  );

DROP POLICY IF EXISTS "admin_all_lpl"    ON public.library_page_levels;
DROP POLICY IF EXISTS "read_lpl"         ON public.library_page_levels;

CREATE POLICY "admin_all_lpl" ON public.library_page_levels
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "read_lpl" ON public.library_page_levels
  FOR SELECT TO authenticated
  USING (
    level = public.student_level() OR level = ANY(public.teacher_levels())
  );

-- ============================================================================
-- resources + level join
-- ============================================================================

DROP POLICY IF EXISTS "admin_all_resources"  ON public.resources;
DROP POLICY IF EXISTS "teacher_read_res"     ON public.resources;
DROP POLICY IF EXISTS "student_read_res"     ON public.resources;

CREATE POLICY "admin_all_resources" ON public.resources
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "teacher_read_res" ON public.resources
  FOR SELECT TO authenticated
  USING (
    public.is_teacher() AND deleted_at IS NULL AND EXISTS (
      SELECT 1 FROM public.resource_levels rl
      WHERE rl.resource_id = resources.id
        AND rl.level = ANY(public.teacher_levels())
    )
  );

CREATE POLICY "student_read_res" ON public.resources
  FOR SELECT TO authenticated
  USING (
    public.is_student() AND deleted_at IS NULL AND EXISTS (
      SELECT 1 FROM public.resource_levels rl
      WHERE rl.resource_id = resources.id
        AND rl.level = public.student_level()
    )
  );

DROP POLICY IF EXISTS "admin_all_rl"  ON public.resource_levels;
DROP POLICY IF EXISTS "read_rl"       ON public.resource_levels;

CREATE POLICY "admin_all_rl" ON public.resource_levels
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "read_rl" ON public.resource_levels
  FOR SELECT TO authenticated
  USING (
    level = public.student_level() OR level = ANY(public.teacher_levels())
  );

-- ============================================================================
-- case_releases — teachers manage own classrooms; students read own classroom
-- ============================================================================

DROP POLICY IF EXISTS "admin_all_releases"     ON public.case_releases;
DROP POLICY IF EXISTS "teacher_own_releases"   ON public.case_releases;
DROP POLICY IF EXISTS "student_read_releases"  ON public.case_releases;

CREATE POLICY "admin_all_releases" ON public.case_releases
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "teacher_own_releases" ON public.case_releases
  FOR ALL TO authenticated
  USING (classroom_id = ANY(public.teacher_classroom_ids()))
  WITH CHECK (classroom_id = ANY(public.teacher_classroom_ids()));

CREATE POLICY "student_read_releases" ON public.case_releases
  FOR SELECT TO authenticated
  USING (classroom_id = public.student_classroom_id());

-- ============================================================================
-- Function grants — authenticated users must be able to call the helpers.
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.auth_role()              TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin()               TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher()             TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_student()             TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_classroom_id()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_level()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_classroom_ids()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_levels()         TO authenticated;

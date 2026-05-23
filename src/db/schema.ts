import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  pgSchema,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// =============================================================================
// auth.users reference (Supabase-managed)
// =============================================================================
// We never write to auth.users from app code — Supabase Auth owns it. We only
// reference its primary key so Drizzle understands the FK relationships.

const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

// =============================================================================
// Enums
// =============================================================================

export const roleEnum = pgEnum("role", ["admin", "teacher", "student"]);
export const levelEnum = pgEnum("level", ["middle", "high", "undergrad"]);
export const stageTypeEnum = pgEnum("stage_type", [
  "history",
  "exam",
  "diagnosis",
  "disposition",
  "treatment",
]);
export const quizScopeEnum = pgEnum("quiz_scope", ["pre", "post"]);
export const resourceTypeEnum = pgEnum("resource_type", ["pdf", "link", "slides"]);
export const librarySectionTypeEnum = pgEnum("library_section_type", [
  "definition",
  "description",
  "what_happens_in_body",
  "symptoms",
  "physical_exam",
  "management",
  "treatment",
  "what_to_do",
]);

// =============================================================================
// Profiles — bridges auth.users to app-level role/identity
// =============================================================================
// profiles.id always equals auth.users.id. Teachers and students reference
// profiles.id, NOT auth.users.id directly, so role is queryable in one hop.
// Admin has a profiles row but no teachers/students row.

export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  role: roleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// =============================================================================
// Tenants — schools, teachers, classrooms, students
// =============================================================================

export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const teachers = pgTable("teachers", {
  // PK linked to profiles.id (which equals auth.users.id). A teacher always
  // has a profile with role='teacher'.
  id: uuid("id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "restrict" }),
  email: text("email").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const classrooms = pgTable(
  "classrooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "restrict" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    level: levelEnum("level").notNull(),
    // Short random string, generated at create-time by app code (nanoid-ish).
    // Unique-when-active enforced via partial index in the SQL migration.
    inviteCode: text("invite_code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    inviteCodeUq: uniqueIndex("classrooms_invite_code_uq").on(table.inviteCode),
    schoolIdx: index("classrooms_school_idx").on(table.schoolId),
    teacherIdx: index("classrooms_teacher_idx").on(table.teacherId),
  })
);

export const students = pgTable(
  "students",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    classroomId: uuid("classroom_id")
      .notNull()
      .references(() => classrooms.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    classroomIdx: index("students_classroom_idx").on(table.classroomId),
  })
);

// =============================================================================
// Cases — admin-authored content. Cases are linear sequences of stages.
// =============================================================================

export const cases = pgTable("cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  scenarioIntro: text("scenario_intro"),
  // Slug for cross-linking to the relevant library article on the feedback screen.
  linkedDiagnosisSlug: text("linked_diagnosis_slug"),
  // Admin-authored "key takeaways" content shown at the end of the case.
  // Markdown; rendered on the feedback page below the score banner.
  clinicalTakeaway: text("clinical_takeaway"),
  // How many quiz questions to draw from the pool per attempt. Section 6.
  quizQuestionCount: integer("quiz_question_count").notNull().default(10),
  // Publication state. NULL = draft (only admin can see it). Set =
  // published; teachers can release, students can take.
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Brief lists case_levels (M:N) and case_level_config (per-level toggle) as
// separate tables with the same composite key. Consolidating into one table
// where row presence = case enabled at that level; treatment_enabled is the
// per-level toggle. This is the simpler, DRY model.
export const caseLevelConfig = pgTable(
  "case_level_config",
  {
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    level: levelEnum("level").notNull(),
    treatmentEnabled: boolean("treatment_enabled").notNull().default(false),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.caseId, table.level] }),
  })
);

export const stages = pgTable(
  "stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    // Position in the case sequence. Renamed from the brief's `order` to
    // `position` to avoid colliding with the SQL reserved word.
    position: integer("position").notNull(),
    type: stageTypeEnum("type").notNull(),
    prompt: text("prompt").notNull(),
    maxPicks: integer("max_picks").notNull().default(1),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    caseIdx: index("stages_case_idx").on(table.caseId),
    casePositionUq: uniqueIndex("stages_case_position_uq").on(
      table.caseId,
      table.position
    ),
  })
);

export const choices = pgTable(
  "choices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
    // 'A', 'B', etc. Display only — order is governed by displayOrder.
    letter: text("letter").notNull(),
    text: text("text").notNull(),
    score: integer("score").notNull().default(0),
    // Nullable; used for diagnosis/disposition (binary-correct stages).
    isCorrect: boolean("is_correct"),
    responseText: text("response_text"),
    displayOrder: integer("display_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    stageIdx: index("choices_stage_idx").on(table.stageId),
  })
);

// =============================================================================
// Quizzes — standalone quiz model
// =============================================================================
// A quiz is a pool of questions. Optionally tied to a case (case-attached
// pre/post tests) OR free-standing (admin-authored quiz banks the student
// can build their own quiz from by topic).

export const quizzes = pgTable("quizzes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  // Topic tag (e.g. "Cardiology") for student-built quizzes by topic.
  // Optional — case-attached quizzes inherit topic from their case.
  topic: text("topic"),
  // Optional case association. NULL = standalone quiz. Set = pre/post test
  // for that case (scope below disambiguates).
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "cascade" }),
  // Only set when caseId is set — indicates whether this is the case's
  // pre-test or post-test. Standalone quizzes have NULL scope.
  scope: quizScopeEnum("scope"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // New: quizzes own questions. Was case_id+scope; migration creates
    // one quiz per (case, scope) for any prior data.
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    quizIdx: index("quiz_questions_quiz_idx").on(table.quizId),
  })
);

export const quizChoices = pgTable(
  "quiz_choices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => quizQuestions.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => ({
    questionIdx: index("quiz_choices_question_idx").on(table.questionId),
  })
);

// =============================================================================
// Attempts — student case + quiz sessions. Retakes APPEND, never overwrite.
// =============================================================================

export const caseAttempts = pgTable(
  "case_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "restrict" }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    totalScore: integer("total_score"),
  },
  (table) => ({
    studentIdx: index("case_attempts_student_idx").on(table.studentId),
    caseIdx: index("case_attempts_case_idx").on(table.caseId),
    studentCaseIdx: index("case_attempts_student_case_idx").on(
      table.studentId,
      table.caseId
    ),
  })
);

export const stageAttempts = pgTable(
  "stage_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseAttemptId: uuid("case_attempt_id")
      .notNull()
      .references(() => caseAttempts.id, { onDelete: "cascade" }),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "restrict" }),
    earnedScore: integer("earned_score").notNull().default(0),
    // [{ choice_id, pick_order, score }]
    picks: jsonb("picks").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    caseAttemptIdx: index("stage_attempts_case_attempt_idx").on(
      table.caseAttemptId
    ),
  })
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    // The quiz this attempt is against. NEW — replaces caseId+scope as the
    // primary linkage. caseId/scope kept for now to preserve historical
    // analytics on case-attached attempts (NULL for standalone-quiz attempts).
    quizId: uuid("quiz_id").references(() => quizzes.id, {
      onDelete: "restrict",
    }),
    caseId: uuid("case_id").references(() => cases.id, {
      onDelete: "restrict",
    }),
    scope: quizScopeEnum("scope"),
    questionCount: integer("question_count").notNull(),
    score: integer("score").notNull(),
    // [{ question_id, choice_id, is_correct }]
    answers: jsonb("answers").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    studentIdx: index("quiz_attempts_student_idx").on(table.studentId),
    studentQuizIdx: index("quiz_attempts_student_quiz_idx").on(
      table.studentId,
      table.quizId
    ),
  })
);

// =============================================================================
// Quiz releases — teacher releases quizzes to classrooms (independent of
// case releases). Admin override via student_quiz_grants below.
// =============================================================================

export const quizReleases = pgTable(
  "quiz_releases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classroomId: uuid("classroom_id")
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    releasedAt: timestamp("released_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    classroomQuizUq: uniqueIndex("quiz_releases_classroom_quiz_uq").on(
      table.classroomId,
      table.quizId
    ),
  })
);

export const studentQuizGrants = pgTable(
  "student_quiz_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    grantedBy: uuid("granted_by"),
  },
  (table) => ({
    studentQuizUq: uniqueIndex("student_quiz_grants_uq").on(
      table.studentId,
      table.quizId
    ),
  })
);

// =============================================================================
// Library — diagnosis articles
// =============================================================================

export const libraryPages = pgTable(
  "library_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    diagnosisSlug: text("diagnosis_slug").notNull(),
    title: text("title").notNull(),
    eyebrow: text("eyebrow"),
    dek: text("dek"),
    // Legacy markdown body (pre-card refactor). New pages use library_page_sections.
    // Existing rows are auto-migrated into a single "description" section on next save.
    bodyMarkdown: text("body_markdown"),
    coverImageUrl: text("cover_image_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    slugUq: uniqueIndex("library_pages_slug_uq").on(table.diagnosisSlug),
  })
);

export const libraryPageLevels = pgTable(
  "library_page_levels",
  {
    libraryPageId: uuid("library_page_id")
      .notNull()
      .references(() => libraryPages.id, { onDelete: "cascade" }),
    level: levelEnum("level").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.libraryPageId, table.level] }),
  })
);

// Card-based article sections. Admin picks which sections appear per page and
// the order they render in. Each section is its own markdown body.
export const libraryPageSections = pgTable(
  "library_page_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    libraryPageId: uuid("library_page_id")
      .notNull()
      .references(() => libraryPages.id, { onDelete: "cascade" }),
    type: librarySectionTypeEnum("type").notNull(),
    bodyMarkdown: text("body_markdown").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pageIdx: index("library_page_sections_page_idx").on(table.libraryPageId),
    pagePositionUq: uniqueIndex("library_page_sections_page_position_uq").on(
      table.libraryPageId,
      table.position
    ),
    pageTypeUq: uniqueIndex("library_page_sections_page_type_uq").on(
      table.libraryPageId,
      table.type
    ),
  })
);

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  type: resourceTypeEnum("type").notNull(),
  url: text("url").notNull(),
  // Storage bucket path for uploaded PDFs/slides; null for external links.
  storagePath: text("storage_path"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const resourceLevels = pgTable(
  "resource_levels",
  {
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    level: levelEnum("level").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.resourceId, table.level] }),
  })
);

// =============================================================================
// Admin override grants — bypass classroom-level release for individual students
// =============================================================================
// The release model is primary: teachers toggle case_releases per classroom,
// every student in that classroom inherits access. These grant tables are
// the *exception path* — admin can hand a specific student access to a
// specific case even if it's not released to their classroom (or the
// student doesn't have a classroom). One row per (student, case) pair.

export const studentCaseGrants = pgTable(
  "student_case_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // Who granted it — for audit. References auth.users via profiles.id.
    grantedBy: uuid("granted_by"),
  },
  (table) => ({
    studentCaseUq: uniqueIndex("student_case_grants_uq").on(
      table.studentId,
      table.caseId
    ),
  })
);

// =============================================================================
// Case releases — teacher → classroom
// =============================================================================
// Brief: "Presence = released. No record = not released."

export const caseReleases = pgTable(
  "case_releases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classroomId: uuid("classroom_id")
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "restrict" }),
    releasedAt: timestamp("released_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    classroomCaseUq: uniqueIndex("case_releases_classroom_case_uq").on(
      table.classroomId,
      table.caseId
    ),
  })
);

// =============================================================================
// Type exports — inferred from the table definitions for use in app code.
// =============================================================================

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;
export type Teacher = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;
export type Classroom = typeof classrooms.$inferSelect;
export type NewClassroom = typeof classrooms.$inferInsert;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;
export type CaseLevelConfig = typeof caseLevelConfig.$inferSelect;
export type NewCaseLevelConfig = typeof caseLevelConfig.$inferInsert;
export type Stage = typeof stages.$inferSelect;
export type NewStage = typeof stages.$inferInsert;
export type Choice = typeof choices.$inferSelect;
export type NewChoice = typeof choices.$inferInsert;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type NewQuizQuestion = typeof quizQuestions.$inferInsert;
export type QuizChoice = typeof quizChoices.$inferSelect;
export type NewQuizChoice = typeof quizChoices.$inferInsert;
export type CaseAttempt = typeof caseAttempts.$inferSelect;
export type NewCaseAttempt = typeof caseAttempts.$inferInsert;
export type StageAttempt = typeof stageAttempts.$inferSelect;
export type NewStageAttempt = typeof stageAttempts.$inferInsert;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type NewQuizAttempt = typeof quizAttempts.$inferInsert;
export type LibraryPage = typeof libraryPages.$inferSelect;
export type NewLibraryPage = typeof libraryPages.$inferInsert;
export type LibraryPageSection = typeof libraryPageSections.$inferSelect;
export type NewLibraryPageSection = typeof libraryPageSections.$inferInsert;
export type LibrarySectionType =
  (typeof librarySectionTypeEnum.enumValues)[number];
export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
export type CaseRelease = typeof caseReleases.$inferSelect;
export type NewCaseRelease = typeof caseReleases.$inferInsert;
export type StudentCaseGrant = typeof studentCaseGrants.$inferSelect;
export type NewStudentCaseGrant = typeof studentCaseGrants.$inferInsert;
export type Quiz = typeof quizzes.$inferSelect;
export type NewQuiz = typeof quizzes.$inferInsert;
export type QuizRelease = typeof quizReleases.$inferSelect;
export type NewQuizRelease = typeof quizReleases.$inferInsert;
export type StudentQuizGrant = typeof studentQuizGrants.$inferSelect;
export type NewStudentQuizGrant = typeof studentQuizGrants.$inferInsert;

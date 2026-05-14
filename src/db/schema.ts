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
  // How many quiz questions to draw from the pool per attempt. Section 6.
  quizQuestionCount: integer("quiz_question_count").notNull().default(10),
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
// Quiz — pre/post per case
// =============================================================================

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    scope: quizScopeEnum("scope").notNull(),
    prompt: text("prompt").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    caseScopeIdx: index("quiz_questions_case_scope_idx").on(
      table.caseId,
      table.scope
    ),
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
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "restrict" }),
    scope: quizScopeEnum("scope").notNull(),
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
    studentCaseScopeIdx: index("quiz_attempts_student_case_scope_idx").on(
      table.studentId,
      table.caseId,
      table.scope
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
    bodyMarkdown: text("body_markdown").notNull(),
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
export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
export type CaseRelease = typeof caseReleases.$inferSelect;
export type NewCaseRelease = typeof caseReleases.$inferInsert;

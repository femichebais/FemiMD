"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { quizzes, quizQuestions, quizChoices, cases } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";

export type QuizScope = "pre" | "post";

export interface QuizMetaFormState {
  error?: string;
  values?: {
    title: string;
    topic: string;
    caseId: string;
    scope: QuizScope | "";
  };
}

function validateMeta(values: {
  title: string;
}): string | null {
  if (!values.title.trim()) return "Title is required.";
  if (values.title.length > 200) return "Title must be 200 characters or fewer.";
  return null;
}

// =============================================================================
// createQuiz — admin creates a new standalone or case-attached quiz
// =============================================================================

export async function createQuiz(
  _prev: QuizMetaFormState,
  formData: FormData
): Promise<QuizMetaFormState> {
  await requireRole("admin");

  const title = String(formData.get("title") ?? "").trim();
  const topic = String(formData.get("topic") ?? "").trim();
  const caseId = String(formData.get("case_id") ?? "");
  const scope = String(formData.get("scope") ?? "") as QuizScope | "";

  const err = validateMeta({ title });
  if (err) {
    return { error: err, values: { title, topic, caseId, scope } };
  }

  // If a case is selected, scope is required and must be 'pre' or 'post'.
  if (caseId) {
    if (scope !== "pre" && scope !== "post") {
      return {
        error: "Pick 'pre' or 'post' for a case-attached quiz.",
        values: { title, topic, caseId, scope },
      };
    }
    // Don't allow duplicate (case, scope) — that pair maps to a single
    // quiz row by convention (it's what ensureCaseQuiz() resolves to).
    const [dup] = await db
      .select({ id: quizzes.id })
      .from(quizzes)
      .where(
        and(
          eq(quizzes.caseId, caseId),
          eq(quizzes.scope, scope),
          isNull(quizzes.deletedAt)
        )
      )
      .limit(1);
    if (dup) {
      return {
        error: `A ${scope}-test already exists for this case. Manage it from the case editor.`,
        values: { title, topic, caseId, scope },
      };
    }
  }

  let newId: string;
  try {
    const [row] = await db
      .insert(quizzes)
      .values({
        title,
        topic: topic || null,
        caseId: caseId || null,
        scope: caseId ? (scope as QuizScope) : null,
      })
      .returning({ id: quizzes.id });
    newId = row.id;
  } catch (e) {
    console.error("[admin/quizzes/createQuiz]", e);
    return {
      error: "Could not save quiz.",
      values: { title, topic, caseId, scope },
    };
  }

  revalidatePath("/admin/quizzes");
  redirect(`/admin/quizzes/${newId}`);
}

// =============================================================================
// updateQuizMeta — admin edits title/topic on an existing quiz
// =============================================================================

export async function updateQuizMeta(args: {
  quizId: string;
  title: string;
  topic: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRole("admin");

  const title = args.title.trim();
  if (!title) return { ok: false, error: "Title is required." };

  try {
    await db
      .update(quizzes)
      .set({ title, topic: args.topic.trim() || null })
      .where(and(eq(quizzes.id, args.quizId), isNull(quizzes.deletedAt)));
  } catch (e) {
    console.error("[admin/quizzes/updateQuizMeta]", e);
    return { ok: false, error: "Could not save changes." };
  }

  revalidatePath(`/admin/quizzes/${args.quizId}`);
  revalidatePath("/admin/quizzes");
  return { ok: true };
}

// =============================================================================
// deleteQuiz — soft delete
// =============================================================================

export async function deleteQuiz(args: {
  quizId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRole("admin");

  try {
    await db
      .update(quizzes)
      .set({ deletedAt: new Date() })
      .where(and(eq(quizzes.id, args.quizId), isNull(quizzes.deletedAt)));
  } catch (e) {
    console.error("[admin/quizzes/deleteQuiz]", e);
    return { ok: false, error: "Could not delete quiz." };
  }

  revalidatePath("/admin/quizzes");
  return { ok: true };
}

// =============================================================================
// Question CRUD on a specific quiz (by quiz_id, not case+scope)
// =============================================================================

export interface QuestionDraft {
  prompt: string;
  choices: Array<{ text: string; isCorrect: boolean }>;
}

export type QuestionActionResult =
  | { ok: true }
  | { ok: false; error: string };

function validateQuestion(draft: QuestionDraft): string | null {
  if (!draft.prompt.trim()) return "Prompt is required.";
  if (draft.choices.length < 2) return "Need at least two choices.";
  if (draft.choices.length > 4) return "Quiz questions are limited to 4 choices.";
  if (draft.choices.some((c) => !c.text.trim()))
    return "Every choice needs text.";
  const correct = draft.choices.filter((c) => c.isCorrect).length;
  if (correct !== 1) return "Mark exactly one choice as correct.";
  return null;
}

export async function createQuizQuestion(args: {
  quizId: string;
  draft: QuestionDraft;
}): Promise<QuestionActionResult> {
  await requireRole("admin");

  const err = validateQuestion(args.draft);
  if (err) return { ok: false, error: err };

  try {
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(quizQuestions)
        .values({ quizId: args.quizId, prompt: args.draft.prompt.trim() })
        .returning({ id: quizQuestions.id });

      await tx.insert(quizChoices).values(
        args.draft.choices.map((c, i) => ({
          questionId: inserted.id,
          text: c.text.trim(),
          isCorrect: c.isCorrect,
          displayOrder: i,
        }))
      );
    });
  } catch (e) {
    console.error("[admin/quizzes/createQuizQuestion]", e);
    return { ok: false, error: "Could not save question." };
  }

  revalidatePath(`/admin/quizzes/${args.quizId}`);
  return { ok: true };
}

export async function updateQuizQuestion(args: {
  questionId: string;
  quizId: string;
  draft: QuestionDraft;
}): Promise<QuestionActionResult> {
  await requireRole("admin");

  const err = validateQuestion(args.draft);
  if (err) return { ok: false, error: err };

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(quizQuestions)
        .set({ prompt: args.draft.prompt.trim() })
        .where(
          and(
            eq(quizQuestions.id, args.questionId),
            isNull(quizQuestions.deletedAt)
          )
        );

      await tx
        .delete(quizChoices)
        .where(eq(quizChoices.questionId, args.questionId));

      await tx.insert(quizChoices).values(
        args.draft.choices.map((c, i) => ({
          questionId: args.questionId,
          text: c.text.trim(),
          isCorrect: c.isCorrect,
          displayOrder: i,
        }))
      );
    });
  } catch (e) {
    console.error("[admin/quizzes/updateQuizQuestion]", e);
    return { ok: false, error: "Could not save question." };
  }

  revalidatePath(`/admin/quizzes/${args.quizId}`);
  return { ok: true };
}

export async function deleteQuizQuestion(args: {
  questionId: string;
  quizId: string;
}): Promise<QuestionActionResult> {
  await requireRole("admin");

  try {
    await db
      .update(quizQuestions)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(quizQuestions.id, args.questionId),
          isNull(quizQuestions.deletedAt)
        )
      );
  } catch (e) {
    console.error("[admin/quizzes/deleteQuizQuestion]", e);
    return { ok: false, error: "Could not delete question." };
  }

  revalidatePath(`/admin/quizzes/${args.quizId}`);
  return { ok: true };
}

// Used by the create form's case-association dropdown — admin picks a
// published case to attach a pre/post quiz to it.
export async function listCasesForQuizForm(): Promise<
  Array<{ id: string; title: string }>
> {
  return await db
    .select({ id: cases.id, title: cases.title })
    .from(cases)
    .where(isNull(cases.deletedAt));
}

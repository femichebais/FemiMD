"use server";

import { revalidatePath } from "next/cache";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { quizQuestions, quizChoices, cases } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";

export type QuizScope = "pre" | "post";

// Shared draft shape from the client — used by both create and update.
export interface QuestionDraft {
  prompt: string;
  choices: Array<{
    // For update: existing choice id (so we don't churn FKs). Undefined for
    // newly added choices.
    id?: string;
    text: string;
    isCorrect: boolean;
  }>;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

function validate(draft: QuestionDraft): string | null {
  if (!draft.prompt.trim()) return "Prompt is required.";
  if (draft.choices.length < 2) return "Need at least two choices.";
  if (draft.choices.some((c) => !c.text.trim()))
    return "Every choice needs text.";
  const correct = draft.choices.filter((c) => c.isCorrect).length;
  if (correct !== 1) return "Mark exactly one choice as correct.";
  return null;
}

// =============================================================================
// createQuizQuestion
// =============================================================================

export async function createQuizQuestion(args: {
  caseId: string;
  scope: QuizScope;
  draft: QuestionDraft;
}): Promise<ActionResult> {
  await requireRole("admin");

  const err = validate(args.draft);
  if (err) return { ok: false, error: err };

  // Make sure the case exists and isn't soft-deleted.
  const [theCase] = await db
    .select({ id: cases.id })
    .from(cases)
    .where(and(eq(cases.id, args.caseId), isNull(cases.deletedAt)))
    .limit(1);
  if (!theCase) return { ok: false, error: "Case not found." };

  try {
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(quizQuestions)
        .values({
          caseId: args.caseId,
          scope: args.scope,
          prompt: args.draft.prompt.trim(),
        })
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
    console.error("[admin/quiz/createQuizQuestion]", e);
    return { ok: false, error: "Could not save question." };
  }

  revalidatePath(`/admin/cases/${args.caseId}/quiz`);
  return { ok: true };
}

// =============================================================================
// updateQuizQuestion — replace prompt and choices in one transaction.
// =============================================================================
// Choice rows are dropped + re-inserted (simplest "diff" — small fixed set).
// Existing choice ids are intentionally not preserved on update; if quiz
// attempts referenced choices by id, this would matter, but quiz_attempts
// stores answers as jsonb with choice ids inline — old attempts retain a
// snapshot of what was correct at the time, which is the right behavior.

export async function updateQuizQuestion(args: {
  questionId: string;
  caseId: string;
  draft: QuestionDraft;
}): Promise<ActionResult> {
  await requireRole("admin");

  const err = validate(args.draft);
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
    console.error("[admin/quiz/updateQuizQuestion]", e);
    return { ok: false, error: "Could not save question." };
  }

  revalidatePath(`/admin/cases/${args.caseId}/quiz`);
  return { ok: true };
}

// =============================================================================
// deleteQuizQuestion — soft delete
// =============================================================================

export async function deleteQuizQuestion(args: {
  questionId: string;
  caseId: string;
}): Promise<ActionResult> {
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
    console.error("[admin/quiz/deleteQuizQuestion]", e);
    return { ok: false, error: "Could not delete question." };
  }

  revalidatePath(`/admin/cases/${args.caseId}/quiz`);
  return { ok: true };
}

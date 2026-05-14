"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/db/client";
import {
  cases,
  caseLevelConfig,
  stages,
  choices,
} from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";

// =============================================================================
// Shared types — client passes this exact shape to createCase
// =============================================================================

export type Level = "middle" | "high" | "undergrad";
export type StageType =
  | "history"
  | "exam"
  | "diagnosis"
  | "disposition"
  | "treatment";

export interface DraftChoice {
  text: string;
  score: number;
  isCorrect: boolean | null;
  responseText: string;
}

export interface DraftStage {
  type: StageType;
  prompt: string;
  maxPicks: number;
  imageUrl: string | null;
  choices: DraftChoice[];
}

export interface DraftCaseLevel {
  level: Level;
  treatmentEnabled: boolean;
}

export interface DraftCase {
  title: string;
  description: string;
  scenarioIntro: string;
  linkedDiagnosisSlug: string;
  // Admin-authored "key takeaways" markdown shown at end of case feedback.
  clinicalTakeaway: string;
  quizQuestionCount: number;
  levels: DraftCaseLevel[];
  stages: DraftStage[];
}

export type CreateCaseResult =
  | { ok: true; caseId: string }
  | { ok: false; error: string };

// =============================================================================
// Validation
// =============================================================================

// Stage families — see src/app/admin/(authed)/cases/_components/draft-reducer.ts
// for the full explanation. These need to match.
const SINGLE_CORRECT_STAGES = new Set<StageType>(["diagnosis", "disposition"]);
const MULTI_CORRECT_STAGES = new Set<StageType>(["treatment"]);
const BINARY_STAGES = new Set<StageType>([
  ...SINGLE_CORRECT_STAGES,
  ...MULTI_CORRECT_STAGES,
]);

function letterFor(i: number): string {
  // A..Z, then AA..ZZ if a stage ever has > 26 choices (we hope it doesn't).
  if (i < 26) return String.fromCharCode(65 + i);
  return (
    String.fromCharCode(65 + Math.floor(i / 26) - 1) +
    String.fromCharCode(65 + (i % 26))
  );
}

function validate(draft: DraftCase): string | null {
  if (!draft.title.trim()) return "Title is required.";
  // linkedDiagnosisSlug is optional — feedback page just omits the library
  // link card if it's not set. If provided, it should be valid kebab-case
  // so the URL doesn't break.
  if (
    draft.linkedDiagnosisSlug.trim() &&
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.linkedDiagnosisSlug.trim())
  ) {
    return "Linked diagnosis slug must be lowercase kebab-case (e.g. myocardial-infarction).";
  }
  if (draft.levels.length === 0)
    return "Choose at least one level for the case.";
  if (draft.stages.length === 0)
    return "A case must have at least one stage.";
  if (draft.quizQuestionCount < 1)
    return "Quiz question count must be at least 1.";

  for (const [i, stage] of draft.stages.entries()) {
    const label = `Stage ${i + 1}`;
    if (!stage.prompt.trim()) return `${label}: prompt is required.`;
    if (stage.choices.length < 2)
      return `${label}: needs at least two choices.`;
    if (stage.maxPicks < 1 || stage.maxPicks > stage.choices.length)
      return `${label}: max picks must be 1–${stage.choices.length}.`;

    for (const [j, c] of stage.choices.entries()) {
      if (!c.text.trim())
        return `${label}, choice ${letterFor(j)}: text is required.`;
    }

    if (SINGLE_CORRECT_STAGES.has(stage.type)) {
      const correctCount = stage.choices.filter((c) => c.isCorrect === true)
        .length;
      if (correctCount !== 1) {
        return `${label} (${stage.type}): mark exactly one choice as correct.`;
      }
    }
    if (MULTI_CORRECT_STAGES.has(stage.type)) {
      const correctCount = stage.choices.filter((c) => c.isCorrect === true)
        .length;
      if (correctCount < 1) {
        return `${label} (${stage.type}): mark at least one choice as correct.`;
      }
    }
  }

  return null;
}

// =============================================================================
// createCase — single transaction, atomic. If anything fails, nothing persists.
// =============================================================================

export async function createCase(
  draft: DraftCase
): Promise<CreateCaseResult> {
  await requireRole("admin");

  const error = validate(draft);
  if (error) return { ok: false, error };

  let caseId: string;

  try {
    caseId = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(cases)
        .values({
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          scenarioIntro: draft.scenarioIntro.trim() || null,
          linkedDiagnosisSlug: draft.linkedDiagnosisSlug.trim() || null,
          clinicalTakeaway: draft.clinicalTakeaway.trim() || null,
          quizQuestionCount: draft.quizQuestionCount,
          // New cases start as drafts. Admin clicks Publish on the edit
          // page when ready — teachers/students only see published cases.
          publishedAt: null,
        })
        .returning({ id: cases.id });

      const newId = inserted.id;

      if (draft.levels.length > 0) {
        await tx.insert(caseLevelConfig).values(
          draft.levels.map((l) => ({
            caseId: newId,
            level: l.level,
            treatmentEnabled: l.treatmentEnabled,
          }))
        );
      }

      for (const [idx, stage] of draft.stages.entries()) {
        const [insertedStage] = await tx
          .insert(stages)
          .values({
            caseId: newId,
            position: idx,
            type: stage.type,
            prompt: stage.prompt.trim(),
            maxPicks: stage.maxPicks,
            imageUrl: stage.imageUrl,
          })
          .returning({ id: stages.id });

        const stageId = insertedStage.id;

        await tx.insert(choices).values(
          stage.choices.map((c, j) => ({
            stageId,
            letter: letterFor(j),
            text: c.text.trim(),
            score: BINARY_STAGES.has(stage.type)
              ? c.isCorrect
                ? 1
                : 0
              : c.score,
            isCorrect: c.isCorrect,
            responseText: c.responseText.trim() || null,
            displayOrder: j,
          }))
        );
      }

      return newId;
    });
  } catch (err) {
    console.error("[admin/cases/createCase] transaction failed:", err);
    return { ok: false, error: "Failed to save case. Try again." };
  }

  revalidatePath("/admin/cases");
  revalidatePath("/admin");
  return { ok: true, caseId };
}

// =============================================================================
// updateCaseText — text-only edits. Brief §7 enforces this at the API layer.
// Structural fields are intentionally not accepted; passing them does nothing.
// =============================================================================

export interface TextEdit {
  caseId: string;
  title: string;
  description: string;
  scenarioIntro: string;
  linkedDiagnosisSlug: string;
  clinicalTakeaway: string;
  stageEdits: Array<{
    stageId: string;
    prompt: string;
    choices: Array<{
      choiceId: string;
      text: string;
      responseText: string;
    }>;
  }>;
}

export type UpdateCaseResult = { ok: true } | { ok: false; error: string };

export async function updateCaseText(
  edit: TextEdit
): Promise<UpdateCaseResult> {
  await requireRole("admin");

  if (!edit.title.trim()) return { ok: false, error: "Title is required." };
  // linkedDiagnosisSlug optional; validate shape only when provided.
  if (
    edit.linkedDiagnosisSlug.trim() &&
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(edit.linkedDiagnosisSlug.trim())
  ) {
    return {
      ok: false,
      error: "Linked diagnosis slug must be lowercase kebab-case.",
    };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(cases)
        .set({
          title: edit.title.trim(),
          description: edit.description.trim() || null,
          scenarioIntro: edit.scenarioIntro.trim() || null,
          linkedDiagnosisSlug: edit.linkedDiagnosisSlug.trim() || null,
          clinicalTakeaway: edit.clinicalTakeaway.trim() || null,
        })
        .where(and(eq(cases.id, edit.caseId), isNull(cases.deletedAt)));

      for (const s of edit.stageEdits) {
        await tx
          .update(stages)
          .set({ prompt: s.prompt.trim() })
          .where(
            and(eq(stages.id, s.stageId), eq(stages.caseId, edit.caseId))
          );

        for (const c of s.choices) {
          await tx
            .update(choices)
            .set({
              text: c.text.trim(),
              responseText: c.responseText.trim() || null,
            })
            .where(
              and(eq(choices.id, c.choiceId), eq(choices.stageId, s.stageId))
            );
        }
      }
    });
  } catch (err) {
    console.error("[admin/cases/updateCaseText]", err);
    return { ok: false, error: "Failed to save changes." };
  }

  revalidatePath(`/admin/cases/${edit.caseId}`);
  revalidatePath("/admin/cases");
  return { ok: true };
}

// =============================================================================
// togglePublish — flips cases.published_at between NULL (draft) and now()
// =============================================================================

export type TogglePublishResult =
  | { ok: true; publishedAt: Date | null }
  | { ok: false; error: string };

export async function togglePublish(args: {
  caseId: string;
  publish: boolean;
}): Promise<TogglePublishResult> {
  await requireRole("admin");

  try {
    const [row] = await db
      .update(cases)
      .set({ publishedAt: args.publish ? new Date() : null })
      .where(and(eq(cases.id, args.caseId), isNull(cases.deletedAt)))
      .returning({ publishedAt: cases.publishedAt });

    if (!row) return { ok: false, error: "Case not found." };

    revalidatePath(`/admin/cases/${args.caseId}`);
    revalidatePath("/admin/cases");
    revalidatePath("/admin");
    return { ok: true, publishedAt: row.publishedAt };
  } catch (err) {
    console.error("[admin/cases/togglePublish]", err);
    return { ok: false, error: "Could not change publish state." };
  }
}

// =============================================================================
// deleteCase — soft delete
// =============================================================================

export interface DeleteCaseState {
  error?: string;
}

export async function deleteCase(
  _prevState: DeleteCaseState,
  formData: FormData
): Promise<DeleteCaseState> {
  await requireRole("admin");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id" };

  try {
    await db
      .update(cases)
      .set({ deletedAt: new Date() })
      .where(and(eq(cases.id, id), isNull(cases.deletedAt)));
  } catch (err) {
    console.error("[admin/cases/deleteCase]", err);
    return { error: "Could not delete case." };
  }

  revalidatePath("/admin/cases");
  revalidatePath("/admin");
  redirect("/admin/cases");
}

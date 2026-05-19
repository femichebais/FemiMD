"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, isNull, and, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  cases,
  caseLevelConfig,
  stages,
  choices,
  stageAttempts,
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
// updateCase — full reconciliation of a case in edit mode. Accepts the
// entire DraftCase and a serverIdMap so we can tell which stages/choices are
// existing rows (update) vs new (insert). Anything in the map that's no
// longer in the draft is removed.
//
// Safety: stages with student attempts can't be deleted (FK restrict on
// stage_attempts.stage_id). We surface a clean error in that case rather
// than letting the transaction fail mid-flight.
// =============================================================================

export interface UpdateCaseInput {
  caseId: string;
  draft: DraftCase;
  // tempId → server uuid for stages/choices already in the DB at the time
  // the editor was loaded. tempIds NOT in this map are treated as new.
  serverIdMap: {
    stages: Record<string, string>;
    choices: Record<string, string>;
  };
  // Parallel array to draft.stages — same length, same order. Each entry is
  // either the stage's tempId (so we can look it up in serverIdMap.stages)
  // or null for a brand-new stage. Same for choices, but as a nested array.
  // We pass these explicitly so the server doesn't have to guess.
  stageTempIds: Array<{
    tempId: string;
    isNew: boolean;
    choiceTempIds: Array<{ tempId: string; isNew: boolean }>;
  }>;
}

export type UpdateCaseResult = { ok: true } | { ok: false; error: string };

export async function updateCase(
  input: UpdateCaseInput
): Promise<UpdateCaseResult> {
  await requireRole("admin");

  const { caseId, draft, serverIdMap, stageTempIds } = input;

  const error = validate(draft);
  if (error) return { ok: false, error };

  if (stageTempIds.length !== draft.stages.length) {
    return { ok: false, error: "Internal: stage index mismatch." };
  }
  for (let i = 0; i < draft.stages.length; i++) {
    if (
      stageTempIds[i].choiceTempIds.length !== draft.stages[i].choices.length
    ) {
      return { ok: false, error: "Internal: choice index mismatch." };
    }
  }

  // Compute removed stage / choice ids by diffing the draft against the
  // serverIdMap snapshot from when the editor loaded.
  const keptStageIds = new Set(
    stageTempIds
      .filter((s) => !s.isNew)
      .map((s) => serverIdMap.stages[s.tempId])
      .filter(Boolean)
  );
  const removedStageIds = Object.values(serverIdMap.stages).filter(
    (id) => !keptStageIds.has(id)
  );

  try {
    await db.transaction(async (tx) => {
      // ---------------- case row ----------------
      await tx
        .update(cases)
        .set({
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          scenarioIntro: draft.scenarioIntro.trim() || null,
          linkedDiagnosisSlug: draft.linkedDiagnosisSlug.trim() || null,
          clinicalTakeaway: draft.clinicalTakeaway.trim() || null,
          quizQuestionCount: draft.quizQuestionCount,
        })
        .where(and(eq(cases.id, caseId), isNull(cases.deletedAt)));

      // ---------------- levels: replace ----------------
      await tx
        .delete(caseLevelConfig)
        .where(eq(caseLevelConfig.caseId, caseId));
      if (draft.levels.length > 0) {
        await tx.insert(caseLevelConfig).values(
          draft.levels.map((l) => ({
            caseId,
            level: l.level,
            treatmentEnabled: l.treatmentEnabled,
          }))
        );
      }

      // ---------------- stages: delete removed ----------------
      if (removedStageIds.length > 0) {
        // FK from stage_attempts.stage_id is onDelete: restrict, so we have
        // to refuse the whole save if any removed stage already has
        // attempts. Better to fail clean than mid-transaction.
        const blockers = await tx
          .select({ stageId: stageAttempts.stageId })
          .from(stageAttempts)
          .where(inArray(stageAttempts.stageId, removedStageIds))
          .limit(1);
        if (blockers.length > 0) {
          throw new Error(
            "Can't remove a stage that students have already attempted. Unpublish + remove attempts first, or keep the stage."
          );
        }
        await tx.delete(stages).where(inArray(stages.id, removedStageIds));
      }

      // ---------------- stages: shift positions out of the way ----------------
      // stages_case_position_uq is unique on (case_id, position), so swap
      // every kept stage to a negative position first; then we can assign
      // final positions without UNIQUE conflicts.
      await tx
        .update(stages)
        .set({ position: sql`-${stages.position} - 1` })
        .where(eq(stages.caseId, caseId));

      // ---------------- stages: upsert + reletter choices ----------------
      for (let i = 0; i < draft.stages.length; i++) {
        const stage = draft.stages[i];
        const meta = stageTempIds[i];
        const existingStageId =
          !meta.isNew && serverIdMap.stages[meta.tempId]
            ? serverIdMap.stages[meta.tempId]
            : null;

        let stageId: string;
        if (existingStageId) {
          await tx
            .update(stages)
            .set({
              position: i,
              type: stage.type,
              prompt: stage.prompt.trim(),
              maxPicks: stage.maxPicks,
              imageUrl: stage.imageUrl,
            })
            .where(
              and(eq(stages.id, existingStageId), eq(stages.caseId, caseId))
            );
          stageId = existingStageId;
        } else {
          const [inserted] = await tx
            .insert(stages)
            .values({
              caseId,
              position: i,
              type: stage.type,
              prompt: stage.prompt.trim(),
              maxPicks: stage.maxPicks,
              imageUrl: stage.imageUrl,
            })
            .returning({ id: stages.id });
          stageId = inserted.id;
        }

        // -------- choices for this stage --------
        const keptChoiceIds = new Set(
          meta.choiceTempIds
            .filter((c) => !c.isNew)
            .map((c) => serverIdMap.choices[c.tempId])
            .filter(Boolean)
        );

        // Find existing choices for this stage and delete any that aren't
        // kept. (FK from stage_attempts.picks is JSONB, not enforced — old
        // attempts just lose that pick from the feedback breakdown.)
        const existingChoices = await tx
          .select({ id: choices.id })
          .from(choices)
          .where(eq(choices.stageId, stageId));
        const toDelete = existingChoices
          .map((c) => c.id)
          .filter((id) => !keptChoiceIds.has(id));
        if (toDelete.length > 0) {
          await tx.delete(choices).where(inArray(choices.id, toDelete));
        }

        // Upsert each choice in draft order, re-lettering A..Z.
        for (let j = 0; j < stage.choices.length; j++) {
          const c = stage.choices[j];
          const cMeta = meta.choiceTempIds[j];
          const existingChoiceId =
            !cMeta.isNew && serverIdMap.choices[cMeta.tempId]
              ? serverIdMap.choices[cMeta.tempId]
              : null;

          const scoreToStore = BINARY_STAGES.has(stage.type)
            ? // For binary stages, we want the per-choice score the admin
              // set (so weighted scoring works). Default to 1 for correct,
              // 0 for incorrect when score wasn't explicitly given.
              c.score > 0
              ? c.score
              : c.isCorrect
                ? 1
                : 0
            : c.score;

          if (existingChoiceId) {
            await tx
              .update(choices)
              .set({
                letter: letterFor(j),
                text: c.text.trim(),
                score: scoreToStore,
                isCorrect: c.isCorrect,
                responseText: c.responseText.trim() || null,
                displayOrder: j,
              })
              .where(
                and(
                  eq(choices.id, existingChoiceId),
                  eq(choices.stageId, stageId)
                )
              );
          } else {
            await tx.insert(choices).values({
              stageId,
              letter: letterFor(j),
              text: c.text.trim(),
              score: scoreToStore,
              isCorrect: c.isCorrect,
              responseText: c.responseText.trim() || null,
              displayOrder: j,
            });
          }
        }
      }
    });
  } catch (err) {
    console.error("[admin/cases/updateCase]", err);
    const message =
      err instanceof Error && err.message ? err.message : "Failed to save.";
    return { ok: false, error: message };
  }

  revalidatePath(`/admin/cases/${caseId}`);
  revalidatePath("/admin/cases");
  revalidatePath("/admin");
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

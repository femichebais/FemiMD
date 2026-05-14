"use server";

import { revalidatePath } from "next/cache";
import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  caseAttempts,
  stageAttempts,
  choices,
  stages,
} from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { getCaseForStudent } from "@/lib/queries/student-cases";

// =============================================================================
// startCaseAttempt — creates the case_attempts row at player mount.
// =============================================================================
// Done on mount (not on first pick) so the id is in hand before any picks
// happen. Done via Server Action (not in the page server component) so a
// Next.js prefetch hovering the link doesn't create orphan attempts.

export interface StartCaseAttemptResult {
  ok: boolean;
  attemptId?: string;
  error?: string;
}

export async function startCaseAttempt(
  caseId: string
): Promise<StartCaseAttemptResult> {
  const { user } = await requireRole("student");

  // Re-validate access — defense in depth on top of RLS. If the case isn't
  // accessible (not released, wrong level, deleted), reject silently.
  const accessible = await getCaseForStudent(user.id, caseId);
  if (!accessible) {
    return { ok: false, error: "Case not available." };
  }

  try {
    const [row] = await db
      .insert(caseAttempts)
      .values({ studentId: user.id, caseId })
      .returning({ id: caseAttempts.id });
    return { ok: true, attemptId: row.id };
  } catch (err) {
    console.error("[student/startCaseAttempt]", err);
    return { ok: false, error: "Could not start case." };
  }
}

// =============================================================================
// recordStageAttempt — one row per stage when the student hits Continue.
// =============================================================================

export interface StagePickInput {
  choiceId: string;
  pickOrder: number;
}

export interface RecordStageAttemptResult {
  ok: boolean;
  earnedScore?: number;
  error?: string;
}

export async function recordStageAttempt(args: {
  caseAttemptId: string;
  stageId: string;
  picks: StagePickInput[];
}): Promise<RecordStageAttemptResult> {
  const { user } = await requireRole("student");

  if (args.picks.length === 0) {
    return { ok: false, error: "No picks to record." };
  }

  // Ownership check + verify the case_attempt is still open.
  const [attempt] = await db
    .select({
      id: caseAttempts.id,
      studentId: caseAttempts.studentId,
      caseId: caseAttempts.caseId,
      completedAt: caseAttempts.completedAt,
    })
    .from(caseAttempts)
    .where(eq(caseAttempts.id, args.caseAttemptId))
    .limit(1);

  if (!attempt || attempt.studentId !== user.id) {
    return { ok: false, error: "Attempt not found." };
  }
  if (attempt.completedAt) {
    return { ok: false, error: "Case already completed." };
  }

  // Verify the stage belongs to the attempt's case (don't trust the client).
  const [stage] = await db
    .select({ id: stages.id, caseId: stages.caseId, maxPicks: stages.maxPicks })
    .from(stages)
    .where(eq(stages.id, args.stageId))
    .limit(1);

  if (!stage || stage.caseId !== attempt.caseId) {
    return { ok: false, error: "Invalid stage." };
  }
  if (args.picks.length > stage.maxPicks) {
    return { ok: false, error: "Too many picks for this stage." };
  }

  // Resolve the choices for this stage so we authoritatively use the
  // server-side score (never trust client-supplied scores).
  const pickedChoiceIds = args.picks.map((p) => p.choiceId);
  const choiceRows = await db
    .select({ id: choices.id, stageId: choices.stageId, score: choices.score })
    .from(choices)
    .where(eq(choices.stageId, args.stageId));

  const choiceMap = new Map(choiceRows.map((c) => [c.id, c]));
  for (const id of pickedChoiceIds) {
    if (!choiceMap.has(id)) {
      return { ok: false, error: "Choice not part of this stage." };
    }
  }
  // De-dupe — a stage shouldn't record the same choice twice.
  if (new Set(pickedChoiceIds).size !== pickedChoiceIds.length) {
    return { ok: false, error: "Duplicate pick." };
  }

  // Score = sum of choice.score for every pick. Brief §5: additive.
  const enrichedPicks = args.picks.map((p) => {
    const c = choiceMap.get(p.choiceId)!;
    return { choice_id: p.choiceId, pick_order: p.pickOrder, score: c.score };
  });
  const earnedScore = enrichedPicks.reduce((sum, p) => sum + p.score, 0);

  try {
    await db.insert(stageAttempts).values({
      caseAttemptId: args.caseAttemptId,
      stageId: args.stageId,
      earnedScore,
      picks: enrichedPicks,
    });
  } catch (err) {
    console.error("[student/recordStageAttempt]", err);
    return { ok: false, error: "Could not save your picks." };
  }

  return { ok: true, earnedScore };
}

// =============================================================================
// completeCaseAttempt — marks the case_attempts row complete, totals score.
// =============================================================================

export interface CompleteCaseAttemptResult {
  ok: boolean;
  totalScore?: number;
  error?: string;
}

export async function completeCaseAttempt(args: {
  caseAttemptId: string;
}): Promise<CompleteCaseAttemptResult> {
  const { user } = await requireRole("student");

  const [attempt] = await db
    .select({
      id: caseAttempts.id,
      studentId: caseAttempts.studentId,
      completedAt: caseAttempts.completedAt,
    })
    .from(caseAttempts)
    .where(eq(caseAttempts.id, args.caseAttemptId))
    .limit(1);

  if (!attempt || attempt.studentId !== user.id) {
    return { ok: false, error: "Attempt not found." };
  }
  if (attempt.completedAt) {
    // Already complete — idempotent. Return the existing total.
    const [refreshed] = await db
      .select({ totalScore: caseAttempts.totalScore })
      .from(caseAttempts)
      .where(eq(caseAttempts.id, args.caseAttemptId))
      .limit(1);
    return { ok: true, totalScore: refreshed?.totalScore ?? 0 };
  }

  // Sum the stage_attempts for this case_attempt.
  const [totals] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${stageAttempts.earnedScore})::int, 0)`,
    })
    .from(stageAttempts)
    .where(eq(stageAttempts.caseAttemptId, args.caseAttemptId));

  const totalScore = Number(totals?.total ?? 0);

  try {
    await db
      .update(caseAttempts)
      .set({ completedAt: new Date(), totalScore })
      .where(
        and(
          eq(caseAttempts.id, args.caseAttemptId),
          isNull(caseAttempts.completedAt) // belt + suspenders against double-complete
        )
      );
  } catch (err) {
    console.error("[student/completeCaseAttempt]", err);
    return { ok: false, error: "Could not finalize case." };
  }

  revalidatePath("/student");
  return { ok: true, totalScore };
}

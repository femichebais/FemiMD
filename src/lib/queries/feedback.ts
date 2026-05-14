import { eq, and, asc, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  caseAttempts,
  stageAttempts,
  cases,
  stages,
  choices,
  type Case,
  type Stage,
  type Choice,
} from "@/db/schema";

// The picks JSONB we stored has this shape; revalidating at the boundary
// gives the page a clean typed structure to render.
export interface AttemptPick {
  choice_id: string;
  pick_order: number;
  score: number;
}

export interface StageBreakdown {
  stage: Stage;
  choices: Choice[];
  // Null if the student abandoned mid-case or skipped a stage somehow.
  attempt: { earnedScore: number; picks: AttemptPick[] } | null;
}

export interface AttemptFeedback {
  case: Case;
  attempt: {
    id: string;
    startedAt: Date;
    completedAt: Date | null;
    totalScore: number | null;
  };
  // Ordered by stage position.
  breakdown: StageBreakdown[];
}

function isPickArray(value: unknown): value is AttemptPick[] {
  return (
    Array.isArray(value) &&
    value.every(
      (v) =>
        typeof v === "object" &&
        v !== null &&
        typeof (v as Record<string, unknown>).choice_id === "string" &&
        typeof (v as Record<string, unknown>).pick_order === "number" &&
        typeof (v as Record<string, unknown>).score === "number"
    )
  );
}

// Loads everything needed to render the feedback screen. Performs the
// ownership check (attempt.student_id must equal the caller's id) and
// returns null if the attempt doesn't belong to this student. The page
// should 404 in that case — same response as "attempt doesn't exist" so
// we don't leak existence to a wrong-id probe.
export async function getAttemptFeedback(
  studentId: string,
  attemptId: string
): Promise<AttemptFeedback | null> {
  const [attemptRow] = await db
    .select({
      attempt: caseAttempts,
      case: cases,
    })
    .from(caseAttempts)
    .innerJoin(cases, eq(cases.id, caseAttempts.caseId))
    .where(eq(caseAttempts.id, attemptId))
    .limit(1);

  if (!attemptRow) return null;
  if (attemptRow.attempt.studentId !== studentId) return null;
  if (attemptRow.case.deletedAt) return null;

  const caseId = attemptRow.attempt.caseId;

  const [stageRows, stageAttemptRows] = await Promise.all([
    db
      .select()
      .from(stages)
      .where(eq(stages.caseId, caseId))
      .orderBy(asc(stages.position)),
    db
      .select()
      .from(stageAttempts)
      .where(eq(stageAttempts.caseAttemptId, attemptId)),
  ]);

  const stageIds = stageRows.map((s) => s.id);
  const choiceRows =
    stageIds.length === 0
      ? []
      : await db
          .select()
          .from(choices)
          .where(inArray(choices.stageId, stageIds))
          .orderBy(asc(choices.displayOrder));

  const attemptByStage = new Map<string, (typeof stageAttemptRows)[number]>();
  for (const sa of stageAttemptRows) attemptByStage.set(sa.stageId, sa);

  const breakdown: StageBreakdown[] = stageRows.map((stage) => {
    const stageChoices = choiceRows.filter((c) => c.stageId === stage.id);
    const sa = attemptByStage.get(stage.id) ?? null;
    let attempt: StageBreakdown["attempt"] = null;
    if (sa) {
      const picks = isPickArray(sa.picks) ? sa.picks : [];
      attempt = { earnedScore: sa.earnedScore, picks };
    }
    return { stage, choices: stageChoices, attempt };
  });

  return {
    case: attemptRow.case,
    attempt: {
      id: attemptRow.attempt.id,
      startedAt: attemptRow.attempt.startedAt,
      completedAt: attemptRow.attempt.completedAt,
      totalScore: attemptRow.attempt.totalScore,
    },
    breakdown,
  };
}

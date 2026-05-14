import { notFound } from "next/navigation";
import { eq, asc, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { cases, stages, choices } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { CasePlayer } from "@/app/student/(authed)/case/[id]/_components/case-player";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Admin walk-through of a case. Renders the same CasePlayer the student
// sees, but with previewMode=true so no attempt rows are created, no scores
// are persisted, and the final Continue returns to the editor.
//
// Why this is OK with our access model: requireRole('admin') gates entry,
// and CasePlayer in preview mode never invokes any of the student-scoped
// server actions, so RLS / release / level checks don't apply.
export default async function CasePreviewPage({ params }: PageProps) {
  const { id } = await params;
  await requireRole("admin");

  const [theCase] = await db
    .select()
    .from(cases)
    .where(eq(cases.id, id))
    .limit(1);

  if (!theCase || theCase.deletedAt) notFound();

  const stageRows = await db
    .select()
    .from(stages)
    .where(eq(stages.caseId, id))
    .orderBy(asc(stages.position));

  const stageIds = stageRows.map((s) => s.id);
  const choiceRows =
    stageIds.length === 0
      ? []
      : await db
          .select()
          .from(choices)
          .where(inArray(choices.stageId, stageIds))
          .orderBy(asc(choices.displayOrder));

  return (
    <CasePlayer
      caseId={id}
      caseData={theCase}
      stages={stageRows}
      choices={choiceRows}
      previewMode
    />
  );
}

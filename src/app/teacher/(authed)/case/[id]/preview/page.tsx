import { notFound } from "next/navigation";
import { eq, asc, inArray, and, isNull, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { cases, stages, choices } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { CasePlayer } from "@/app/student/(authed)/case/[id]/_components/case-player";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string | string[] }>;
}

// Teacher walk-through of a published case. Mirrors the admin preview at
// /admin/cases/[id]/preview but role-gates to 'teacher' and only allows
// previewing published cases (drafts are still admin-only).
//
// Back link defaults to /teacher; pass ?back=/teacher/classroom/<id> from
// the link in a classroom page to bounce back there.
export default async function TeacherCasePreviewPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  await requireRole("teacher");

  const back = typeof sp.back === "string" ? sp.back : "/teacher";
  // Defense-in-depth: only allow same-origin relative paths.
  const safeBack = back.startsWith("/") ? back : "/teacher";

  const [theCase] = await db
    .select()
    .from(cases)
    .where(
      and(eq(cases.id, id), isNull(cases.deletedAt), isNotNull(cases.publishedAt))
    )
    .limit(1);

  if (!theCase) notFound();

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
      previewReturnHref={safeBack}
    />
  );
}

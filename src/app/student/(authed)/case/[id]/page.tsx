import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/current-user";
import { getCasePlayData } from "@/lib/queries/student-cases";
import { CasePlayer } from "./_components/case-player";

interface CasePageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentCasePage({ params }: CasePageProps) {
  const { id } = await params;
  const { user } = await requireRole("student");

  // getCasePlayData enforces: case not deleted, released to student's
  // classroom, tagged for student's level. Anything else → 404 (don't
  // distinguish "doesn't exist" from "you can't see this").
  const data = await getCasePlayData(user.id, id);
  if (!data) notFound();

  return (
    <CasePlayer
      caseId={id}
      caseData={data.case}
      stages={data.stages}
      choices={data.choices}
    />
  );
}

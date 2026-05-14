import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, isNull, and } from "drizzle-orm";
import { StageLabel } from "@/components/ui";
import { db } from "@/db/client";
import { cases } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { getCaseForStudent } from "@/lib/queries/student-cases";
import { pickRandomQuestions } from "@/lib/queries/quiz";
import { QuizPlayer } from "./_components/quiz-player";
import type { QuizScope } from "./actions";

interface PageProps {
  params: Promise<{ id: string; scope: string }>;
}

export default async function StudentQuizPage({ params }: PageProps) {
  const { id, scope: scopeParam } = await params;

  if (scopeParam !== "pre" && scopeParam !== "post") notFound();
  const scope = scopeParam as QuizScope;

  const { user } = await requireRole("student");

  // Access check: same level/release scoping as the case player.
  const access = await getCaseForStudent(user.id, id);
  if (!access) notFound();

  // Need the case's configured question count to seed the random pull.
  const [caseRow] = await db
    .select({
      id: cases.id,
      title: cases.title,
      quizQuestionCount: cases.quizQuestionCount,
    })
    .from(cases)
    .where(and(eq(cases.id, id), isNull(cases.deletedAt)))
    .limit(1);

  if (!caseRow) notFound();

  const questions = await pickRandomQuestions(
    id,
    scope,
    caseRow.quizQuestionCount
  );

  if (questions.length === 0) {
    return (
      <main className="px-6 md:px-12 py-10 md:py-14 pb-20">
        <div className="max-w-case mx-auto">
          <StageLabel className="mb-5">
            {scope === "pre" ? "Pre-test" : "Post-test"} · {caseRow.title}
          </StageLabel>
          <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
            Nothing here yet.
          </h1>
          <p className="font-serif italic text-[16px] text-ink-mute mb-10">
            Your teacher or platform admin hasn&apos;t added{" "}
            {scope === "pre" ? "pre-test" : "post-test"} questions for this
            case.
          </p>
          <Link
            href="/student"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
          >
            ← All cases
          </Link>
        </div>
      </main>
    );
  }

  return (
    <QuizPlayer
      caseId={id}
      caseTitle={caseRow.title}
      scope={scope}
      questions={questions}
    />
  );
}

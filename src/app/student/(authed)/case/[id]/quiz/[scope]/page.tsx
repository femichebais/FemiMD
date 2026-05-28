import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, isNull, and } from "drizzle-orm";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { db } from "@/db/client";
import { cases } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { getCaseForStudent } from "@/lib/queries/student-cases";
import { pickRandomQuestions, ensureCaseQuiz } from "@/lib/queries/quiz";
import { QuizPlayer } from "./_components/quiz-player";
import { CEyebrow } from "@/components/clinical/primitives";
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

  const quizId = await ensureCaseQuiz(id, scope);
  const questions = await pickRandomQuestions(
    quizId,
    caseRow.quizQuestionCount
  );

  if (questions.length === 0) {
    return (
      <main className="px-5 md:px-8 py-10 md:py-14 pb-20">
        <div className="max-w-2xl mx-auto">
          <CEyebrow className="mb-3">Quiz · {caseRow.title}</CEyebrow>
          <h1 className="font-serif text-[36px] md:text-[44px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-3">
            Nothing here yet.
          </h1>
          <p className="text-[17px] leading-[1.55] text-clinical-muted-fg mb-10">
            Your teacher or admin hasn&apos;t added quiz questions for this
            case yet.
          </p>
          <Link
            href="/student"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-clinical-muted-fg hover:text-clinical-fg transition-colors"
          >
            <ArrowLeft weight="bold" className="h-3.5 w-3.5" />
            All cases
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
      quizId={quizId}
      quizTitle={`${caseRow.title} · Quiz`}
      questions={questions}
    />
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { StageLabel } from "@/components/ui";
import { requireRole } from "@/lib/auth/current-user";
import { getStudentQuizPlay } from "@/lib/queries/student-quizzes";
import { QuizPlayer } from "@/app/student/(authed)/case/[id]/quiz/[scope]/_components/quiz-player";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Standalone-quiz take page. Reuses the same QuizPlayer the case-attached
// pre/post tests use; just doesn't pass caseId / caseTitle / scope.
export default async function StudentTakeQuizPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await requireRole("student");

  const data = await getStudentQuizPlay(user.id, id);
  if (!data) notFound();

  if (data.questions.length === 0) {
    return (
      <main className="px-6 md:px-12 py-10 md:py-14 pb-20">
        <div className="max-w-case mx-auto">
          <StageLabel className="mb-5">{data.quiz.title}</StageLabel>
          <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
            Nothing here yet.
          </h1>
          <p className="font-serif italic text-[16px] text-ink-mute mb-10">
            This quiz has no questions yet. Check back later.
          </p>
          <Link
            href="/student/quizzes"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
          >
            ← All quizzes
          </Link>
        </div>
      </main>
    );
  }

  // If the quiz is case-attached, pass caseId/scope/caseTitle through so
  // the post-test "case completed" check populates correctly on submit.
  return (
    <QuizPlayer
      quizId={data.quiz.id}
      quizTitle={data.quiz.title}
      caseId={data.quiz.caseId ?? undefined}
      caseTitle={data.caseTitle ?? undefined}
      scope={data.quiz.scope ?? undefined}
      questions={data.questions}
    />
  );
}

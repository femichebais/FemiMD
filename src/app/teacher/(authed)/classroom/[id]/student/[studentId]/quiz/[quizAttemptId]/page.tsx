import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, X } from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/lib/auth/current-user";
import { getQuizAttemptForTeacher } from "@/lib/queries/teacher";
import { CCard, CEyebrow } from "@/components/clinical/primitives";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{
    id: string;
    studentId: string;
    quizAttemptId: string;
  }>;
}

const SCOPE_LABEL: Record<string, string> = {
  pre: "Pre-test",
  post: "Post-test",
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function TeacherQuizAttemptPage({ params }: PageProps) {
  const { id: classroomId, studentId, quizAttemptId } = await params;

  const { user } = await requireRole("teacher");
  const detail = await getQuizAttemptForTeacher(
    user.id,
    classroomId,
    studentId,
    quizAttemptId
  );
  if (!detail) notFound();

  const { student, classroom, quiz, attempt, questions } = detail;

  const pct =
    attempt.questionCount === 0
      ? 0
      : Math.round((attempt.score / attempt.questionCount) * 100);

  const scopeLabel =
    quiz.scope === "pre" || quiz.scope === "post"
      ? SCOPE_LABEL[quiz.scope]
      : null;

  return (
    <main className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-14 pb-24">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <CEyebrow className="mb-3">{classroom.name}</CEyebrow>
          <h1 className="font-serif text-[34px] md:text-[40px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-1">
            {student.name}&rsquo;s quiz
          </h1>
          <p className="text-[16px] text-clinical-muted-fg">
            {scopeLabel ? `${scopeLabel} · ` : ""}
            {quiz.caseTitle ?? quiz.title}
          </p>
        </div>
        <Link
          href={`/teacher/classroom/${classroomId}/student/${studentId}`}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-clinical-muted-fg hover:text-clinical-fg transition-colors"
        >
          <ArrowLeft weight="bold" className="h-3.5 w-3.5" />
          Back to {student.name}
        </Link>
      </div>

      <CCard className="bg-clinical-hero px-6 md:px-8 py-7 mb-12 flex items-baseline justify-between gap-6 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary mb-2">
            Score
          </p>
          <div className="font-serif text-[44px] leading-none tabular-nums text-clinical-fg font-medium">
            {pct}
            <span className="text-clinical-muted-fg text-[26px] ml-1">%</span>
          </div>
          <p className="mt-2 text-[12.5px] text-clinical-muted-fg tabular-nums">
            {attempt.score} of {attempt.questionCount} correct
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary mb-2">
            Completed
          </p>
          <p className="text-[13px] font-mono text-clinical-fg">
            {dateFmt.format(new Date(attempt.completedAt))}
          </p>
        </div>
      </CCard>

      <CEyebrow className="mb-5">Picks per question</CEyebrow>

      {questions.map((q, i) => (
        <section key={q.id + "-" + i} className="mb-10">
          <CEyebrow className="mb-3">
            Question {i + 1} of {questions.length}
          </CEyebrow>
          <h2 className="font-serif text-[22px] md:text-[24px] leading-[1.25] tracking-[-0.01em] text-clinical-fg font-medium mb-5">
            {q.prompt}
          </h2>

          <ul className="flex flex-col gap-2">
            {q.choices.map((c, j) => {
              const isPicked = q.pickedChoiceId === c.id;
              const isCorrect = c.isCorrect;
              const isWrongPick = isPicked && !isCorrect;
              const variant = isCorrect
                ? "correct"
                : isWrongPick
                  ? "wrong"
                  : "default";

              return (
                <li
                  key={c.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-clinical border",
                    variant === "correct" &&
                      "border-clinical-success/40 bg-clinical-success/10",
                    variant === "wrong" &&
                      "border-clinical-destructive/40 bg-clinical-destructive/10",
                    variant === "default" &&
                      "border-clinical-border bg-clinical-card"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid place-items-center h-8 w-8 rounded-clinical flex-shrink-0 text-[13px] font-bold font-mono",
                      variant === "correct" && "bg-clinical-success text-white",
                      variant === "wrong" &&
                        "bg-clinical-destructive text-white",
                      variant === "default" &&
                        "bg-clinical-muted text-clinical-muted-fg"
                    )}
                  >
                    {String.fromCharCode(65 + j)}
                  </span>
                  <span className="font-serif text-[16px] md:text-[17px] leading-[1.4] text-clinical-fg flex-1">
                    {c.text}
                  </span>
                  {(variant === "correct" || variant === "wrong") && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap",
                        variant === "correct"
                          ? "text-clinical-success"
                          : "text-clinical-destructive"
                      )}
                    >
                      {variant === "correct" ? (
                        <>
                          <Check weight="bold" className="h-3.5 w-3.5" />
                          Correct answer
                        </>
                      ) : (
                        <>
                          <X weight="bold" className="h-3.5 w-3.5" />
                          Student&rsquo;s pick
                        </>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}

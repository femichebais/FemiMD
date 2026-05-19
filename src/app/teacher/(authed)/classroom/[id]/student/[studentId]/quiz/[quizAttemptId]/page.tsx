import Link from "next/link";
import { notFound } from "next/navigation";
import { StageLabel } from "@/components/ui";
import { requireRole } from "@/lib/auth/current-user";
import { getQuizAttemptForTeacher } from "@/lib/queries/teacher";

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
    <main className="max-w-case mx-auto px-6 md:px-12 py-10 md:py-14 pb-24">
      <div className="flex items-baseline justify-between mb-3">
        <StageLabel>{classroom.name}</StageLabel>
        <Link
          href={`/teacher/classroom/${classroomId}/student/${studentId}`}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
        >
          ← Back to {student.name}
        </Link>
      </div>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-1">
        {student.name}&apos;s quiz
      </h1>
      <p className="font-serif italic text-[18px] text-ink-mute mb-12">
        {scopeLabel ? `${scopeLabel} · ` : ""}
        {quiz.caseTitle ?? quiz.title}
      </p>

      <section className="bg-paper-2 border border-rule-strong rounded-[2px] px-7 py-7 mb-14 flex items-baseline justify-between gap-6">
        <div>
          <div className="label-mono mb-2">Score</div>
          <div className="font-serif text-[44px] leading-none font-normal tabular-nums">
            {pct}
            <span className="text-ink-mute text-[28px] ml-1">%</span>
          </div>
          <div className="mt-2 font-mono text-[12px] uppercase tracking-[0.05em] text-ink-mute tabular-nums">
            {attempt.score} of {attempt.questionCount} correct
          </div>
        </div>
        <div className="text-right">
          <div className="label-mono mb-2">Completed</div>
          <div className="font-mono text-[12px] text-ink tracking-[0.02em]">
            {new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }).format(new Date(attempt.completedAt))}
          </div>
        </div>
      </section>

      <StageLabel className="mb-7">Picks per question</StageLabel>

      {questions.map((q, i) => (
        <section key={q.id + "-" + i} className="mb-12">
          <StageLabel className="mb-3">
            Question {i + 1} of {questions.length}
          </StageLabel>
          <h2 className="font-serif text-[22px] leading-[1.3] font-normal tracking-[-0.01em] mb-6">
            {q.prompt}
          </h2>

          <ul className="flex flex-col -mt-px">
            {q.choices.map((c, j) => {
              const isPicked = q.pickedChoiceId === c.id;
              const isCorrect = c.isCorrect;
              const isWrongPick = isPicked && !isCorrect;
              const bg = isCorrect
                ? "bg-accent-soft"
                : isWrongPick
                  ? "bg-[#F6E8DE]"
                  : "";
              const ruler = isCorrect
                ? "bg-accent"
                : isWrongPick
                  ? "bg-[var(--warning)]"
                  : "bg-transparent";
              const letterColor = isCorrect
                ? "text-accent font-medium"
                : isWrongPick
                  ? "text-[var(--warning)] font-medium"
                  : "text-ink-fade";
              const trailing = isCorrect
                ? "Correct answer"
                : isWrongPick
                  ? "Student's pick"
                  : isPicked
                    ? "Student's pick"
                    : "";
              return (
                <li
                  key={c.id}
                  className={`relative flex items-baseline gap-5 px-4 pl-[14px] py-[14px] border-b border-rule first:border-t first:border-t-rule ${bg}`}
                >
                  <span
                    aria-hidden
                    className={`absolute left-0 top-0 bottom-0 w-[2px] ${ruler}`}
                  />
                  <span
                    className={`font-mono text-[11px] w-[14px] flex-shrink-0 ${letterColor}`}
                  >
                    {String.fromCharCode(65 + j)}
                  </span>
                  <span className="font-serif text-[17px] leading-[1.4] text-ink flex-1">
                    {c.text}
                  </span>
                  {trailing && (
                    <span
                      className={
                        "font-mono text-[10px] uppercase tracking-[0.05em] " +
                        (isCorrect
                          ? "text-accent"
                          : "text-[var(--warning)]")
                      }
                    >
                      {trailing}
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

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ClipboardText,
} from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/lib/auth/current-user";
import { getQuizForTeacherPreview } from "@/lib/queries/quiz";
import {
  CBadge,
  CCard,
  CEyebrow,
} from "@/components/clinical/primitives";
import { cn } from "@/lib/utils";

const SCOPE_LABEL: Record<string, string> = {
  pre: "Pre-test",
  post: "Post-test",
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string | string[] }>;
}

// Teacher-only read-only preview of a quiz: every question in the bank,
// with the correct answer highlighted. No state, no submission, no random
// subset — so the teacher can audit exactly what's authored. Students still
// see a randomized N-question sample at /student/quizzes/[id].
export default async function TeacherQuizPreviewPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  await requireRole("teacher");

  const back = typeof sp.back === "string" ? sp.back : "/teacher";
  const safeBack = back.startsWith("/") ? back : "/teacher";

  const detail = await getQuizForTeacherPreview(id);
  if (!detail) notFound();

  const { quiz, caseTitle, questions } = detail;
  const scopeLabel =
    quiz.scope === "pre" || quiz.scope === "post"
      ? SCOPE_LABEL[quiz.scope]
      : null;

  return (
    <main className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-14 pb-24">
      <div className="mb-8 flex items-center justify-between gap-4 px-4 py-3 rounded-clinical border border-clinical-primary/30 bg-clinical-primary-soft">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary">
            Preview mode
          </div>
          <div className="text-[13px] text-clinical-muted-fg mt-0.5">
            Every question in the bank, with the correct answer marked.
            Students see a random subset.
          </div>
        </div>
        <Link
          href={safeBack}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-clinical-muted-fg hover:text-clinical-fg transition-colors whitespace-nowrap"
        >
          <ArrowLeft weight="bold" className="h-3.5 w-3.5" />
          Back
        </Link>
      </div>

      <CEyebrow className="mb-3">Quiz preview</CEyebrow>
      <h1 className="font-serif text-[34px] md:text-[40px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-3">
        {quiz.title}
      </h1>
      <div className="flex flex-wrap items-center gap-2 mb-10">
        {scopeLabel && <CBadge tone="primary">{scopeLabel}</CBadge>}
        {caseTitle && <CBadge tone="neutral">for {caseTitle}</CBadge>}
        {quiz.topic && !caseTitle && <CBadge tone="neutral">{quiz.topic}</CBadge>}
        <span className="text-[12.5px] text-clinical-muted-fg tabular-nums ml-1">
          {questions.length} question{questions.length === 1 ? "" : "s"} in the
          bank
        </span>
      </div>

      {questions.length === 0 ? (
        <CCard className="px-6 py-10 text-center">
          <ClipboardText
            weight="duotone"
            className="h-9 w-9 text-clinical-muted-fg mx-auto mb-3"
          />
          <p className="text-clinical-fg font-medium">
            No questions authored yet.
          </p>
          <p className="text-[14px] text-clinical-muted-fg mt-1">
            The platform admin can add questions in{" "}
            <code className="text-[12.5px] font-mono">/admin/quizzes</code>.
          </p>
        </CCard>
      ) : (
        questions.map((q, i) => (
          <section key={q.question.id} className="mb-10">
            <CEyebrow className="mb-3">
              Question {i + 1} of {questions.length}
            </CEyebrow>
            <h2 className="font-serif text-[22px] md:text-[24px] leading-[1.25] tracking-[-0.01em] text-clinical-fg font-medium mb-5">
              {q.question.prompt}
            </h2>

            <ul className="flex flex-col gap-2">
              {q.choices.map((c, j) => (
                <li
                  key={c.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-clinical border",
                    c.isCorrect
                      ? "border-clinical-success/40 bg-clinical-success/10"
                      : "border-clinical-border bg-clinical-card"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid place-items-center h-8 w-8 rounded-clinical flex-shrink-0 text-[13px] font-bold font-mono",
                      c.isCorrect
                        ? "bg-clinical-success text-white"
                        : "bg-clinical-muted text-clinical-muted-fg"
                    )}
                  >
                    {String.fromCharCode(65 + j)}
                  </span>
                  <span className="font-serif text-[16px] md:text-[17px] leading-[1.4] text-clinical-fg flex-1">
                    {c.text}
                  </span>
                  {c.isCorrect && (
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-clinical-success whitespace-nowrap">
                      <Check weight="bold" className="h-3.5 w-3.5" />
                      Correct
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}

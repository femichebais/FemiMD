import Link from "next/link";
import type { Metadata } from "next";
import { Button, StageLabel } from "@/components/ui";
import { listAllQuizzes, type AdminQuizRow } from "@/lib/queries/quiz";
import { DeleteQuizButton } from "./delete-quiz-button";

export const metadata: Metadata = { title: "Quizzes" };

async function safeList(): Promise<AdminQuizRow[]> {
  try {
    return await listAllQuizzes();
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[admin/quizzes]", err);
    }
    return [];
  }
}

export default async function AdminQuizzesPage() {
  const rows = await safeList();

  return (
    <>
      <StageLabel className="mb-5">Quizzes</StageLabel>
      <div className="flex items-baseline justify-between mb-3">
        <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em]">
          All quizzes.
        </h1>
        <Link href="/admin/quizzes/new">
          <Button>+ New quiz</Button>
        </Link>
      </div>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        Case-attached pre/post tests are auto-provisioned the first time
        you open their question bank from the case editor. Standalone
        quizzes (admin-authored, optionally tied to a topic) appear here
        too. Both can be released to classrooms by teachers.
      </p>

      {rows.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute">
          No quizzes yet — create one above, or open any case&apos;s edit
          page to provision its pre/post tests.
        </p>
      ) : (
        <ul>
          {rows.map((q) => (
            <li
              key={q.id}
              className="grid grid-cols-[1fr_160px_120px_100px_80px] items-baseline gap-6 py-5 border-b border-rule"
            >
              <Link
                href={`/admin/quizzes/${q.id}`}
                className="font-serif text-[18px] text-ink hover:text-accent transition-colors truncate"
              >
                {q.title}
                {q.caseId && (
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade">
                    case-attached
                  </span>
                )}
              </Link>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-mute">
                {q.topic ?? (q.scope ? `${q.scope}-test` : "no topic")}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade">
                {q.questionCount} question{q.questionCount === 1 ? "" : "s"}
              </span>
              <Link
                href={`/admin/quizzes/${q.id}`}
                className="justify-self-end font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-accent border border-rule-strong px-3 py-2 rounded-[2px] transition-colors"
              >
                Manage
              </Link>
              <span className="justify-self-end">
                <DeleteQuizButton quizId={q.id} quizTitle={q.title} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

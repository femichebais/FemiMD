import Link from "next/link";
import type { Metadata } from "next";
import { StageLabel } from "@/components/ui";
import { listAllQuizzes, type AdminQuizRow } from "@/lib/queries/quiz";

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
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        All quizzes.
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        Case-attached pre/post tests are auto-provisioned the first time
        you open their question bank from the case editor. Standalone
        quizzes (admin-authored, optionally tied to a topic) appear here
        too. Both can be released to classrooms by teachers.
      </p>

      {rows.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute">
          No quizzes yet. Open any case&apos;s edit page and click{" "}
          <strong className="not-italic font-medium">
            Manage pre + post test →
          </strong>{" "}
          to provision its first quiz.
        </p>
      ) : (
        <ul>
          {rows.map((q) => (
            <li
              key={q.id}
              className="grid grid-cols-[1fr_160px_120px_120px] items-baseline gap-6 py-5 border-b border-rule"
            >
              <span className="font-serif text-[18px] text-ink truncate">
                {q.title}
                {q.caseId && (
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade">
                    case-attached
                  </span>
                )}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-mute">
                {q.topic ?? (q.scope ? `${q.scope}-test` : "no topic")}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade">
                {q.questionCount} question{q.questionCount === 1 ? "" : "s"}
              </span>
              <span className="justify-self-end">
                {q.caseId ? (
                  <Link
                    href={`/admin/cases/${q.caseId}/quiz`}
                    className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-accent border border-rule-strong px-3 py-2 rounded-[2px] transition-colors"
                  >
                    Manage
                  </Link>
                ) : (
                  <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade">
                    standalone
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

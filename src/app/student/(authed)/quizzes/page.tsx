import Link from "next/link";
import type { Metadata } from "next";
import { StageLabel } from "@/components/ui";
import { requireRole } from "@/lib/auth/current-user";
import {
  listStudentQuizzes,
  type StudentQuizRow,
} from "@/lib/queries/student-quizzes";

export const metadata: Metadata = { title: "Quizzes" };

async function safeList(studentId: string): Promise<StudentQuizRow[]> {
  try {
    return await listStudentQuizzes(studentId);
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[student/quizzes]", err);
    }
    return [];
  }
}

export default async function StudentQuizzesPage() {
  const { user } = await requireRole("student");
  const rows = await safeList(user.id);

  return (
    <main className="max-w-case mx-auto px-6 md:px-12 py-10 md:py-14">
      <StageLabel className="mb-5">Quizzes</StageLabel>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        Quizzes for you.
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        Released by your teacher or granted to you specifically. Each
        session draws a random subset of questions — retakes are different
        every time.
      </p>

      {rows.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute">
          No quizzes released to you yet. Pre/post tests show up here as
          your teacher releases them.
        </p>
      ) : (
        <ul>
          {rows.map((q) => (
            <li
              key={q.id}
              className="border-b border-rule last:border-b-0 py-6"
            >
              <Link
                href={`/student/quizzes/${q.id}`}
                className="block group"
              >
                <h2 className="font-serif text-[22px] text-ink group-hover:text-accent transition-colors">
                  {q.title}
                </h2>
                <div className="mt-2 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-fade">
                  <span>
                    {q.questionCount} question
                    {q.questionCount === 1 ? "" : "s"}
                  </span>
                  {q.scope && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{q.scope}-test</span>
                    </>
                  )}
                  {q.caseTitle && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="normal-case tracking-normal">
                        for {q.caseTitle}
                      </span>
                    </>
                  )}
                  {q.topic && !q.caseTitle && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{q.topic}</span>
                    </>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

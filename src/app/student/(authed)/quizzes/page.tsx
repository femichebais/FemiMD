import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ClipboardText } from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/lib/auth/current-user";
import {
  listStudentQuizzes,
  type StudentQuizRow,
} from "@/lib/queries/student-quizzes";
import {
  CCard,
  CBadge,
  CEyebrow,
} from "@/components/clinical/primitives";

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
    <main className="max-w-5xl mx-auto px-5 md:px-8 py-10 md:py-14">
      <CEyebrow className="mb-3">Quizzes</CEyebrow>
      <h1 className="font-serif text-[40px] md:text-[48px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-4">
        Quizzes for you.
      </h1>
      <p className="text-[17px] leading-[1.55] text-clinical-muted-fg max-w-prose mb-10">
        Released by your teacher, or granted to you specifically. Each
        session draws a random subset of questions — retakes are different
        every time.
      </p>

      {rows.length === 0 ? (
        <CCard className="px-6 py-10 text-center">
          <ClipboardText
            weight="duotone"
            className="h-9 w-9 text-clinical-muted-fg mx-auto mb-3"
          />
          <p className="text-clinical-fg font-medium">
            No quizzes released to you yet.
          </p>
          <p className="text-[14px] text-clinical-muted-fg mt-1">
            Pre/post tests show up here as your teacher releases them.
          </p>
        </CCard>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((q) => (
            <li key={q.id}>
              <Link href={`/student/quizzes/${q.id}`} className="block group">
                <CCard hoverable className="p-5 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {q.scope && (
                      <CBadge tone="primary">{q.scope}-test</CBadge>
                    )}
                    {q.topic && !q.caseTitle && (
                      <CBadge tone="neutral">{q.topic}</CBadge>
                    )}
                  </div>
                  <h2 className="font-serif text-[19px] leading-tight text-clinical-fg font-medium mb-1 group-hover:text-clinical-primary transition-colors">
                    {q.title}
                  </h2>
                  {q.caseTitle && (
                    <p className="text-[13px] text-clinical-muted-fg mb-3">
                      for {q.caseTitle}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="text-[12px] font-medium text-clinical-muted-fg tabular-nums">
                      {q.questionCount} question
                      {q.questionCount === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center text-[13px] font-medium text-clinical-primary">
                      Take quiz
                      <ArrowRight
                        weight="bold"
                        className="ml-1.5 h-3.5 w-3.5"
                      />
                    </span>
                  </div>
                </CCard>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ClipboardText,
} from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/lib/auth/current-user";
import {
  listStudentQuizzes,
  type StudentQuizRow,
} from "@/lib/queries/student-quizzes";
import {
  CCard,
  CBadge,
  CEyebrow,
  CLinkButton,
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
    <main className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14">
      {/* Hero — mirrors the cases tab so the two reads as siblings. */}
      <section className="rounded-clinical bg-clinical-hero border border-clinical-border px-6 md:px-10 py-10 md:py-14 mb-12 relative overflow-hidden">
        <div className="relative max-w-2xl">
          <CEyebrow className="mb-4">Knowledge check</CEyebrow>
          <h1 className="font-serif text-[44px] md:text-[56px] leading-[1.02] tracking-[-0.025em] text-clinical-fg font-medium mb-5">
            Take a quiz.
          </h1>
          <p className="text-[17px] leading-[1.55] text-clinical-muted-fg mb-7 max-w-xl">
            A few questions, randomly drawn. Retakes are fresh every time
            — quiz attempts are kept separately, so you can see how you
            improve.
          </p>
          {rows.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <CLinkButton
                href="#quizzes"
                size="lg"
                variant="primary"
              >
                Take a quiz <ArrowRight weight="bold" className="h-4 w-4" />
              </CLinkButton>
            </div>
          )}
        </div>
        <div
          aria-hidden
          className="hidden md:block absolute -right-20 -top-20 h-72 w-72 rounded-full bg-clinical-primary-glow/15 blur-3xl"
        />
        <div
          aria-hidden
          className="hidden md:block absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-clinical-primary/10 blur-3xl"
        />
      </section>

      <section id="quizzes" className="scroll-mt-24">
        <div className="mb-5">
          <CEyebrow className="mb-1.5">Available quizzes</CEyebrow>
          <h2 className="font-serif text-[24px] md:text-[26px] tracking-[-0.01em] text-clinical-fg font-medium">
            Pick one to start
          </h2>
        </div>

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
                    <h3 className="font-serif text-[19px] leading-tight text-clinical-fg font-medium mb-1 group-hover:text-clinical-primary transition-colors">
                      {q.title}
                    </h3>
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
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import {
  ArrowRight,
  ChartLineUp,
  Stethoscope,
} from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/lib/auth/current-user";
import {
  listStudentDashboard,
  type StudentDashboardCase,
} from "@/lib/queries/student-cases";
import {
  listStudentQuizzes,
  type StudentQuizRow,
} from "@/lib/queries/student-quizzes";
import {
  CCard,
  CLinkButton,
  CEyebrow,
} from "@/components/clinical/primitives";

export const metadata: Metadata = { title: "Your cases" };

async function safeList(userId: string): Promise<StudentDashboardCase[]> {
  try {
    return await listStudentDashboard(userId);
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[student/dashboard]", err);
    }
    return [];
  }
}

async function safeQuizzes(studentId: string): Promise<StudentQuizRow[]> {
  try {
    return await listStudentQuizzes(studentId);
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[student/dashboard:quizzes]", err);
    }
    return [];
  }
}

export default async function StudentDashboard() {
  const { user } = await requireRole("student");
  const [all, quizzes] = await Promise.all([
    safeList(user.id),
    safeQuizzes(user.id),
  ]);

  const hasQuizzes = quizzes.length > 0;

  return (
    <main className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14">
      {/* Hero — quietly bold serif headline mirroring the reference. */}
      <section className="rounded-clinical bg-clinical-hero border border-clinical-border px-6 md:px-10 py-10 md:py-14 mb-12 relative overflow-hidden">
        <div className="relative max-w-2xl">
          <CEyebrow className="mb-4">A new patient just walked in</CEyebrow>
          <h1 className="font-serif text-[44px] md:text-[56px] leading-[1.02] tracking-[-0.025em] text-clinical-fg font-medium mb-5">
            Be the doctor.
            <br />
            Solve the case.
          </h1>
          <p className="text-[17px] leading-[1.55] text-clinical-muted-fg mb-7 max-w-xl">
            Meet patients, gather clues, perform the exam, and make the diagnosis.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <CLinkButton href="/student/cases" size="lg" variant="primary">
              Take a case <ArrowRight weight="bold" className="h-4 w-4" />
            </CLinkButton>
            <CLinkButton
              href="/student/progress"
              size="lg"
              variant="outline"
            >
              <ChartLineUp weight="bold" className="h-4 w-4" />
              Your progress
            </CLinkButton>
          </div>
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

      {/* Quiz hero — mirrors the cases hero so students see both entries side-by-side. */}
      <section className="rounded-clinical bg-clinical-hero border border-clinical-border px-6 md:px-10 py-10 md:py-14 mb-12 relative overflow-hidden">
        <div className="relative max-w-2xl">
          <CEyebrow className="mb-4">Knowledge check</CEyebrow>
          <h1 className="font-serif text-[44px] md:text-[56px] leading-[1.02] tracking-[-0.025em] text-clinical-fg font-medium mb-5">
            Test your clinical instincts.
          </h1>
          <p className="text-[17px] leading-[1.55] text-clinical-muted-fg mb-7 max-w-xl">
            Review symptoms, spot patterns, and choose the most likely diagnosis.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <CLinkButton
              href="/student/quizzes"
              size="lg"
              variant="primary"
            >
              {hasQuizzes ? "Take a quiz" : "Browse quizzes"}
              <ArrowRight weight="bold" className="h-4 w-4" />
            </CLinkButton>
          </div>
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

      {all.length === 0 && (
        <CCard className="px-6 py-12 text-center">
          <Stethoscope
            weight="duotone"
            className="h-10 w-10 text-clinical-muted-fg mx-auto mb-3"
          />
          <p className="text-clinical-fg font-medium mb-1">
            No cases released yet.
          </p>
          <p className="text-[14px] text-clinical-muted-fg">
            Your teacher hasn&apos;t shared any patients with you yet. Check
            back soon.
          </p>
        </CCard>
      )}

    </main>
  );
}

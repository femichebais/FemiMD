import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ChartLineUp, Stethoscope } from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/lib/auth/current-user";
import {
  listStudentDashboard,
  type StudentDashboardCase,
} from "@/lib/queries/student-cases";
import {
  CCard,
  CLinkButton,
  CBadge,
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

export default async function StudentDashboard() {
  const { user } = await requireRole("student");
  const all = await safeList(user.id);

  const available = all.filter((c) => c.state !== "completed");
  const completed = all.filter((c) => c.state === "completed");
  const firstAvailable = available[0];

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
            Real patients. Real symptoms. Real decisions — minus the lecture.
            Step into the clinic, ask the questions, run the exam, and make
            the call.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {firstAvailable ? (
              <CLinkButton
                href={`/student/case/${firstAvailable.id}`}
                size="lg"
                variant="primary"
              >
                Start a case <ArrowRight weight="bold" className="h-4 w-4" />
              </CLinkButton>
            ) : (
              <CLinkButton
                href="/student/library"
                size="lg"
                variant="primary"
              >
                Browse the library
                <ArrowRight weight="bold" className="h-4 w-4" />
              </CLinkButton>
            )}
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

      <CaseGroup
        eyebrow="Waiting room"
        title="Patients to see"
        empty="Nothing to take. Nice work."
        cases={available}
        primaryCta
      />
      <CaseGroup
        eyebrow="Records"
        title="Cases you&rsquo;ve closed"
        empty=""
        cases={completed}
      />
    </main>
  );
}

interface CaseGroupProps {
  eyebrow: string;
  title: string;
  empty: string;
  cases: StudentDashboardCase[];
  primaryCta?: boolean;
}

function CaseGroup({
  eyebrow,
  title,
  empty,
  cases,
  primaryCta,
}: CaseGroupProps) {
  if (cases.length === 0 && !empty) return null;
  return (
    <section className="mb-12">
      <div className="mb-5">
        <CEyebrow className="mb-1.5">{eyebrow}</CEyebrow>
        <h2 className="font-serif text-[24px] md:text-[26px] tracking-[-0.01em] text-clinical-fg font-medium">
          {title}
        </h2>
      </div>
      {cases.length === 0 ? (
        <p className="text-clinical-muted-fg text-[15px]">{empty}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {cases.map((c) => (
            <li key={c.id}>
              <CaseCard caseRow={c} primaryCta={primaryCta} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CaseCard({
  caseRow: c,
  primaryCta,
}: {
  caseRow: StudentDashboardCase;
  primaryCta?: boolean;
}) {
  const state = c.state;
  const tone =
    state === "completed"
      ? "success"
      : state === "in_progress"
        ? "warning"
        : "primary";
  const stateLabel =
    state === "completed"
      ? "Completed"
      : state === "in_progress"
        ? "In progress"
        : "New";

  return (
    <CCard hoverable className="p-5 sm:p-6 h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-2">
        <CBadge tone={tone}>{stateLabel}</CBadge>
        {c.bestScore !== null && (
          <span className="text-[11px] font-mono text-clinical-muted-fg tabular-nums">
            best {c.bestScore} pts
          </span>
        )}
      </div>
      <h3 className="font-serif text-[20px] leading-[1.2] tracking-[-0.01em] text-clinical-fg font-medium mb-1.5">
        <Link
          href={`/student/case/${c.id}`}
          className="hover:text-clinical-primary"
        >
          {c.title}
        </Link>
      </h3>
      {c.description && (
        <p className="text-[14px] leading-[1.55] text-clinical-muted-fg mb-4 line-clamp-3">
          {c.description}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <div className="flex items-center gap-3 text-[11.5px] font-medium text-clinical-muted-fg tabular-nums">
          <span>
            {c.stageCount} stage{c.stageCount === 1 ? "" : "s"}
          </span>
          <span aria-hidden>·</span>
          <span>
            {c.attemptCount} attempt{c.attemptCount === 1 ? "" : "s"}
          </span>
        </div>
        <CLinkButton
          href={`/student/case/${c.id}`}
          size="sm"
          variant={primaryCta && state !== "completed" ? "primary" : "outline"}
        >
          {state === "completed" ? "Review" : state === "in_progress" ? "Resume" : "Start case"}
          <ArrowRight weight="bold" className="h-3.5 w-3.5" />
        </CLinkButton>
      </div>
    </CCard>
  );
}

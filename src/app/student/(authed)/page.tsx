import Link from "next/link";
import type { Metadata } from "next";
import { StageLabel } from "@/components/ui";
import { requireRole } from "@/lib/auth/current-user";
import {
  listStudentDashboard,
  type StudentDashboardCase,
} from "@/lib/queries/student-cases";

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

  const inProgress = all.filter((c) => c.state === "in_progress");
  const notStarted = all.filter((c) => c.state === "not_started");
  const completed = all.filter((c) => c.state === "completed");

  return (
    <main className="max-w-case mx-auto px-6 md:px-12 py-10 md:py-14">
      <StageLabel className="mb-5">Your cases</StageLabel>
      <div className="flex items-baseline justify-between mb-3">
        <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em]">
          Cases for you.
        </h1>
        <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
          <Link
            href="/student/quizzes"
            className="hover:text-ink transition-colors"
          >
            Quizzes →
          </Link>
          <Link
            href="/student/progress"
            className="hover:text-ink transition-colors"
          >
            Full progress →
          </Link>
        </div>
      </div>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        Work through these at your own pace. A case is complete when you
        finish it and submit the post-test.
      </p>

      {all.length === 0 && (
        <p className="font-serif italic text-[16px] text-ink-mute">
          Your teacher hasn&apos;t released any cases yet.
        </p>
      )}

      <CaseGroup label="In progress" cases={inProgress} />
      <CaseGroup label="Not started" cases={notStarted} />
      <CaseGroup label="Completed" cases={completed} />
    </main>
  );
}

function CaseGroup({
  label,
  cases,
}: {
  label: string;
  cases: StudentDashboardCase[];
}) {
  if (cases.length === 0) return null;
  return (
    <section className="mb-12">
      <StageLabel className="mb-5">{label}</StageLabel>
      <ul>
        {cases.map((c) => (
          <li key={c.id} className="border-b border-rule last:border-b-0 py-6">
            <Link href={`/student/case/${c.id}`} className="block group">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-serif text-[22px] text-ink group-hover:text-accent transition-colors">
                  {c.title}
                </h2>
                {c.bestScore !== null && (
                  <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade whitespace-nowrap">
                    best {c.bestScore}
                  </span>
                )}
              </div>
              {c.description && (
                <p className="text-[15px] text-ink-mute leading-[1.6] mt-1">
                  {c.description}
                </p>
              )}
            </Link>
            <div className="mt-2 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-fade">
              <span>
                {c.stageCount} stage{c.stageCount === 1 ? "" : "s"}
              </span>
              <span aria-hidden>·</span>
              <span>
                {c.attemptCount} attempt
                {c.attemptCount === 1 ? "" : "s"}
              </span>
              <span aria-hidden>·</span>
              <Link
                href={`/student/case/${c.id}/quiz/pre`}
                className="hover:text-ink transition-colors"
              >
                Pre-test →
              </Link>
              {c.state === "completed" && (
                <>
                  <span aria-hidden>·</span>
                  <Link
                    href={`/student/case/${c.id}/feedback`}
                    className="hover:text-ink transition-colors"
                  >
                    Last feedback →
                  </Link>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

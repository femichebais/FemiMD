import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { StageLabel } from "@/components/ui";
import { requireRole } from "@/lib/auth/current-user";
import { getClassroomDetail } from "@/lib/queries/teacher";
import { ReleaseToggle } from "./_components/release-toggle";
import { QuizReleaseToggle } from "./_components/quiz-release-toggle";

const LEVEL_LABEL: Record<string, string> = {
  middle: "Middle school",
  high: "High school",
  undergrad: "Undergrad",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassroomDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await requireRole("teacher");
  const detail = await getClassroomDetail(user.id, id);
  if (!detail) notFound();

  // Resolve invite link from request headers so it works in dev + prod
  // without hard-coding a base URL.
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const inviteUrl = `${proto}://${host}/invite/${detail.classroom.inviteCode}`;

  const { classroom, roster, availableCases, availableQuizzes, topline } =
    detail;

  return (
    <main className="max-w-[1100px] mx-auto px-6 md:px-12 py-10 md:py-14">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <StageLabel className="mb-3">
            Classroom · {LEVEL_LABEL[classroom.level] ?? classroom.level}
          </StageLabel>
          <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em]">
            {classroom.name}
          </h1>
        </div>
        <Link
          href="/teacher"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
        >
          ← All classrooms
        </Link>
      </div>

      {/* Invite link */}
      <section className="bg-paper-2 border border-rule-strong rounded-[2px] p-6 mb-12">
        <div className="label-mono mb-3">Invite link</div>
        <div className="flex items-center gap-3">
          <code className="flex-1 font-mono text-[13px] bg-surface px-3 py-2 border border-rule rounded-[2px] truncate">
            {inviteUrl}
          </code>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-fade">
            code {classroom.inviteCode}
          </span>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade">
          Share this with your students — they&apos;ll sign up and land in
          this classroom automatically.
        </p>
      </section>

      {/* Top-line stats */}
      <section className="border-y border-rule py-6 mb-14">
        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          <Stat label="Students" value={topline.studentCount} />
          <Stat label="Cases released" value={topline.releasedCaseCount} />
          <Stat label="Total attempts" value={topline.totalAttempts} />
          <Stat
            label="Avg completion"
            value={`${Math.round(topline.avgCompletion * 100)}%`}
          />
        </dl>
      </section>

      {/* Roster */}
      <StageLabel className="mb-5">Roster</StageLabel>
      {roster.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute mb-14">
          No students yet. Share the invite link.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-6 md:mx-0 px-6 md:px-0 mb-14">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-rule-strong">
              <th className="text-left py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                Name
              </th>
              <th className="text-left py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                Email
              </th>
              <th className="text-right py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                Attempts
              </th>
              <th className="text-right py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                Completed
              </th>
              <th className="text-right py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                Avg score
              </th>
            </tr>
          </thead>
          <tbody>
            {roster.map((s) => (
              <tr
                key={s.id}
                className="border-b border-rule hover:bg-paper-2 transition-colors"
              >
                <td className="py-4">
                  <Link
                    href={`/teacher/classroom/${id}/student/${s.id}`}
                    className="font-serif text-[16px] text-ink hover:text-accent"
                  >
                    {/* Path uses [id]/student/[studentId] — both ids match. */}
                    {s.name}
                  </Link>
                </td>
                <td className="py-4 font-mono text-[12px] text-ink-mute">
                  {s.email}
                </td>
                <td className="py-4 text-right font-mono text-[13px] tabular-nums">
                  {s.attemptCount}
                </td>
                <td className="py-4 text-right font-mono text-[13px] tabular-nums">
                  {s.completedCount} / {topline.releasedCaseCount}
                </td>
                <td className="py-4 text-right font-mono text-[13px] tabular-nums">
                  {s.avgScore === null ? "—" : s.avgScore.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {/* Cases at this level */}
      <StageLabel className="mb-5">Cases at this level</StageLabel>
      {availableCases.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute">
          No cases have been authored for {LEVEL_LABEL[classroom.level]} yet.
        </p>
      ) : (
        <ul>
          {availableCases.map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-[1fr_140px_80px_140px] items-center gap-6 py-4 border-b border-rule"
            >
              <span className="font-serif text-[17px] text-ink">{c.title}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade justify-self-end">
                {c.isReleased && c.releasedAt
                  ? `since ${new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                    }).format(new Date(c.releasedAt))}`
                  : ""}
              </span>
              <Link
                href={`/teacher/case/${c.id}/preview?back=/teacher/classroom/${id}`}
                className="justify-self-end font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-accent border border-rule-strong px-3 py-2 rounded-[2px] transition-colors whitespace-nowrap"
              >
                Preview
              </Link>
              <span className="justify-self-end">
                <ReleaseToggle
                  classroomId={id}
                  caseId={c.id}
                  initialReleased={c.isReleased}
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Quizzes — releasable independently of cases. Includes case-attached
          pre/post tests + standalone quizzes admin authored. */}
      <StageLabel className="mb-5 mt-14">Quizzes</StageLabel>
      {availableQuizzes.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute">
          No quizzes available yet. Admin can author them from{" "}
          <code className="font-mono text-[12px]">/admin/quizzes</code>.
        </p>
      ) : (
        <ul>
          {availableQuizzes.map((q) => (
            <li
              key={q.id}
              className="grid grid-cols-[1fr_140px_140px] items-center gap-6 py-4 border-b border-rule"
            >
              <span className="font-serif text-[17px] text-ink">
                {q.title}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade justify-self-end">
                {q.caseTitle
                  ? `${q.scope === "pre" ? "Pre" : q.scope === "post" ? "Post" : ""} · ${q.caseTitle}`
                  : (q.topic ?? "standalone")}
              </span>
              <span className="justify-self-end">
                <QuizReleaseToggle
                  classroomId={id}
                  quizId={q.id}
                  initialReleased={q.isReleased}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">
        {label}
      </dt>
      <dd className="font-serif text-[26px] font-medium tabular-nums">
        {value}
      </dd>
    </div>
  );
}

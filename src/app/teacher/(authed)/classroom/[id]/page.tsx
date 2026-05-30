import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft, Eye } from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/lib/auth/current-user";
import { getClassroomDetail } from "@/lib/queries/teacher";
import { ReleaseToggle } from "./_components/release-toggle";
import { QuizReleaseToggle } from "./_components/quiz-release-toggle";
import { ReferenceReleaseToggle } from "./_components/reference-release-toggle";
import { DeleteClassroomButton } from "./_components/delete-classroom-button";
import { RemoveStudentButton } from "./_components/remove-student-button";
import {
  CCard,
  CBadge,
  CEyebrow,
} from "@/components/clinical/primitives";
import { formatShortDate } from "@/lib/format-date";

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

  const {
    classroom,
    roster,
    availableCases,
    availableQuizzes,
    availableLibrary,
    availableResources,
    topline,
  } = detail;

  return (
    <main className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <CEyebrow className="mb-3">Classroom</CEyebrow>
          <h1 className="font-serif text-[36px] md:text-[44px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-2">
            {classroom.name}
          </h1>
          <CBadge tone="neutral">
            {LEVEL_LABEL[classroom.level] ?? classroom.level}
          </CBadge>
        </div>
        <div className="flex items-center gap-4">
          <DeleteClassroomButton
            classroomId={classroom.id}
            classroomName={classroom.name}
          />
          <Link
            href="/teacher"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-clinical-muted-fg hover:text-clinical-fg transition-colors"
          >
            <ArrowLeft weight="bold" className="h-3.5 w-3.5" />
            All classrooms
          </Link>
        </div>
      </div>

      {/* Invite link */}
      <CCard className="bg-clinical-hero p-6 mb-12 mt-8">
        <CEyebrow className="mb-3">Invite link</CEyebrow>
        <div className="flex items-center gap-3">
          <code className="flex-1 text-[13px] bg-clinical-card border border-clinical-border rounded-clinical px-3 py-2 truncate font-mono">
            {inviteUrl}
          </code>
          <span className="text-[11px] font-mono text-clinical-muted-fg">
            code · {classroom.inviteCode}
          </span>
        </div>
        <p className="mt-3 text-[12.5px] text-clinical-muted-fg">
          Share this with your students — they&rsquo;ll sign up and land here
          automatically.
        </p>
      </CCard>

      {/* Top-line stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-14">
        <Stat label="Students" value={topline.studentCount} />
        <Stat label="Cases released" value={topline.releasedCaseCount} />
        <Stat label="Case attempts" value={topline.totalCaseAttempts} />
        <Stat
          label="Case completion"
          value={`${Math.round(topline.caseCompletion * 100)}%`}
        />
        <Stat label="Quizzes released" value={topline.releasedQuizCount} />
        <Stat label="Quiz attempts" value={topline.totalQuizAttempts} />
        <Stat
          label="Quiz completion"
          value={`${Math.round(topline.quizCompletion * 100)}%`}
        />
      </section>

      {/* Roster */}
      <h2 className="font-serif text-[22px] tracking-[-0.01em] text-clinical-fg font-medium mb-4">
        Roster
      </h2>
      {roster.length === 0 ? (
        <CCard className="px-6 py-8 text-center mb-14">
          <p className="text-clinical-muted-fg">
            No students yet. Share the invite link.
          </p>
        </CCard>
      ) : (
        <CCard className="overflow-hidden mb-14">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead>
                <tr className="border-b border-clinical-border bg-clinical-muted/50">
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th align="right">Case attempts</Th>
                  <Th align="right">Case completed</Th>
                  <Th align="right">Case avg</Th>
                  <Th align="right">Quiz attempts</Th>
                  <Th align="right">Quiz completed</Th>
                  <Th align="right">Quiz avg</Th>
                  <Th align="right">{""}</Th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-clinical-border last:border-b-0 hover:bg-clinical-muted/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/teacher/classroom/${id}/student/${s.id}`}
                        className="font-serif text-[15px] text-clinical-fg hover:text-clinical-primary"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-[12.5px] font-mono text-clinical-muted-fg">
                      {s.email}
                    </td>
                    <td className="py-3 px-4 text-right text-[13px] tabular-nums text-clinical-fg">
                      {s.caseAttemptCount}
                    </td>
                    <td className="py-3 px-4 text-right text-[13px] tabular-nums text-clinical-fg">
                      {s.caseCompletedCount} / {topline.releasedCaseCount}
                    </td>
                    <td className="py-3 px-4 text-right text-[13px] tabular-nums text-clinical-fg">
                      {s.caseAvgPct === null
                        ? "—"
                        : `${Math.round(s.caseAvgPct)}%`}
                    </td>
                    <td className="py-3 px-4 text-right text-[13px] tabular-nums text-clinical-fg">
                      {s.quizAttemptCount}
                    </td>
                    <td className="py-3 px-4 text-right text-[13px] tabular-nums text-clinical-fg">
                      {s.quizCompletedCount} / {topline.releasedQuizCount}
                    </td>
                    <td className="py-3 px-4 text-right text-[13px] tabular-nums text-clinical-fg">
                      {s.quizAvgPct === null
                        ? "—"
                        : `${Math.round(s.quizAvgPct)}%`}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <RemoveStudentButton
                        classroomId={id}
                        studentId={s.id}
                        studentName={s.name}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CCard>
      )}

      {/* Cases assigned to this classroom by the admin */}
      <h2 className="font-serif text-[22px] tracking-[-0.01em] text-clinical-fg font-medium mb-4">
        Cases
      </h2>
      {availableCases.length === 0 ? (
        <CCard className="px-6 py-8 text-center mb-14">
          <p className="text-clinical-muted-fg">
            No cases assigned by your admin yet.
          </p>
        </CCard>
      ) : (
        <CCard className="overflow-hidden mb-14">
          <ul className="divide-y divide-clinical-border">
            {availableCases.map((c) => (
              <li
                key={c.id}
                className="px-5 py-4 grid grid-cols-[1fr_auto_auto_auto] items-center gap-4"
              >
                <span className="font-serif text-[16px] text-clinical-fg truncate">
                  {c.title}
                </span>
                <span className="text-[11.5px] font-mono text-clinical-muted-fg tabular-nums whitespace-nowrap">
                  {c.isReleased && c.releasedAt
                    ? `since ${formatShortDate(c.releasedAt)}`
                    : ""}
                </span>
                <Link
                  href={`/teacher/case/${c.id}/preview?back=/teacher/classroom/${id}`}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-clinical-muted-fg hover:text-clinical-primary px-2.5 py-1 rounded-clinical hover:bg-clinical-muted transition-colors"
                >
                  <Eye weight="bold" className="h-3.5 w-3.5" />
                  Preview
                </Link>
                <ReleaseToggle
                  classroomId={id}
                  caseId={c.id}
                  initialReleased={c.isReleased}
                />
              </li>
            ))}
          </ul>
        </CCard>
      )}

      <h2 className="font-serif text-[22px] tracking-[-0.01em] text-clinical-fg font-medium mb-4">
        Quizzes
      </h2>
      {availableQuizzes.length === 0 ? (
        <CCard className="px-6 py-8 text-center mb-14">
          <p className="text-clinical-muted-fg">
            No quizzes assigned by your admin yet.
          </p>
        </CCard>
      ) : (
        <CCard className="overflow-hidden mb-14">
          <ul className="divide-y divide-clinical-border">
            {availableQuizzes.map((q) => (
              <li
                key={q.id}
                className="px-5 py-4 grid grid-cols-[1fr_auto_auto_auto] items-center gap-4"
              >
                <span className="font-serif text-[16px] text-clinical-fg truncate">
                  {q.title}
                </span>
                <span className="text-[11.5px] font-mono text-clinical-muted-fg whitespace-nowrap">
                  {q.caseTitle ?? q.topic ?? "standalone"}
                </span>
                <Link
                  href={`/teacher/quiz/${q.id}/preview?back=/teacher/classroom/${id}`}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-clinical-muted-fg hover:text-clinical-primary px-2.5 py-1 rounded-clinical hover:bg-clinical-muted transition-colors"
                >
                  <Eye weight="bold" className="h-3.5 w-3.5" />
                  Preview
                </Link>
                <QuizReleaseToggle
                  classroomId={id}
                  quizId={q.id}
                  initialReleased={q.isReleased}
                />
              </li>
            ))}
          </ul>
        </CCard>
      )}

      {/* Library pages assigned to this classroom by the admin */}
      <h2 className="font-serif text-[22px] tracking-[-0.01em] text-clinical-fg font-medium mb-4">
        Library
      </h2>
      {availableLibrary.length === 0 ? (
        <CCard className="px-6 py-8 text-center mb-14">
          <p className="text-clinical-muted-fg">
            No library articles assigned by your admin yet.
          </p>
        </CCard>
      ) : (
        <CCard className="overflow-hidden mb-14">
          <ul className="divide-y divide-clinical-border">
            {availableLibrary.map((l) => (
              <li
                key={l.id}
                className="px-5 py-4 grid grid-cols-[1fr_auto] items-center gap-4"
              >
                <span className="font-serif text-[16px] text-clinical-fg truncate">
                  {l.title}
                </span>
                <ReferenceReleaseToggle
                  kind="library"
                  classroomId={id}
                  itemId={l.id}
                  initialReleased={l.isReleased}
                />
              </li>
            ))}
          </ul>
        </CCard>
      )}

      {/* Resources assigned to this classroom by the admin */}
      <h2 className="font-serif text-[22px] tracking-[-0.01em] text-clinical-fg font-medium mb-4">
        Resources
      </h2>
      {availableResources.length === 0 ? (
        <CCard className="px-6 py-8 text-center">
          <p className="text-clinical-muted-fg">
            No resources assigned by your admin yet.
          </p>
        </CCard>
      ) : (
        <CCard className="overflow-hidden">
          <ul className="divide-y divide-clinical-border">
            {availableResources.map((r) => (
              <li
                key={r.id}
                className="px-5 py-4 grid grid-cols-[1fr_auto] items-center gap-4"
              >
                <span className="font-serif text-[16px] text-clinical-fg truncate">
                  {r.title}
                </span>
                <ReferenceReleaseToggle
                  kind="resource"
                  classroomId={id}
                  itemId={r.id}
                  initialReleased={r.isReleased}
                />
              </li>
            ))}
          </ul>
        </CCard>
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
    <CCard className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-muted-fg mb-1.5">
        {label}
      </p>
      <p className="font-serif text-[26px] leading-none font-medium tabular-nums text-clinical-fg">
        {value}
      </p>
    </CCard>
  );
}

function Th({
  children,
  align = "left",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-4 py-2.5 text-${align} text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg`}
    >
      {children}
    </th>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { StageLabel } from "@/components/ui";
import { getClassroomDetailForAdmin } from "@/lib/queries/admin-classrooms";
import { AssignToggle } from "./assign-toggle";
import { DeleteClassroomButton } from "./delete-classroom-button";

const LEVEL_LABEL: Record<string, string> = {
  middle: "Middle school",
  high: "High school",
  undergrad: "Undergrad",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminClassroomDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getClassroomDetailForAdmin(id);
  if (!detail) notFound();

  const {
    classroom,
    availableCases,
    availableQuizzes,
    availableLibrary,
    availableResources,
  } = detail;
  const assignedCaseCount = availableCases.filter((c) => c.isAssigned).length;
  const assignedQuizCount = availableQuizzes.filter((q) => q.isAssigned).length;
  const assignedLibraryCount = availableLibrary.filter(
    (l) => l.isAssigned
  ).length;
  const assignedResourceCount = availableResources.filter(
    (r) => r.isAssigned
  ).length;
  const levelLower = LEVEL_LABEL[classroom.level]?.toLowerCase();

  return (
    <>
      <div className="flex items-baseline justify-between mb-5">
        <StageLabel>Classroom</StageLabel>
        <Link
          href="/admin/classrooms"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
        >
          ← All classrooms
        </Link>
      </div>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-2">
        {classroom.name}
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-4">
        {classroom.teacherName} ({classroom.teacherEmail}) ·{" "}
        {classroom.schoolName} · {LEVEL_LABEL[classroom.level] ?? classroom.level}
      </p>
      <p className="font-serif italic text-[14px] text-ink-mute mb-12 max-w-prose">
        Assign content to make it visible to this classroom&apos;s teacher. The
        teacher then decides what to release to students.
      </p>

      {/* Cases */}
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-serif text-[22px] tracking-[-0.01em]">
          Assign cases
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade tabular-nums">
          {assignedCaseCount} of {availableCases.length} assigned
        </span>
      </div>
      <p className="font-serif italic text-[14px] text-ink-mute mb-6">
        Only cases tagged for {levelLower} are listed.
      </p>

      {availableCases.length === 0 ? (
        <p className="font-serif italic text-[14px] text-ink-mute">
          No cases authored for {LEVEL_LABEL[classroom.level]} yet.
        </p>
      ) : (
        <ul className="border-t border-rule">
          {availableCases.map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-[1fr_120px_120px] items-baseline gap-6 py-4 border-b border-rule"
            >
              <span className="font-serif text-[16px] text-ink truncate">
                {c.title}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade">
                {c.isPublished ? "published" : "draft"}
              </span>
              <span className="justify-self-end">
                <AssignToggle
                  kind="case"
                  classroomId={classroom.id}
                  itemId={c.id}
                  initialAssigned={c.isAssigned}
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Quizzes */}
      <div className="flex items-baseline justify-between mb-3 mt-14">
        <h2 className="font-serif text-[22px] tracking-[-0.01em]">
          Assign quizzes
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade tabular-nums">
          {assignedQuizCount} of {availableQuizzes.length} assigned
        </span>
      </div>
      <p className="font-serif italic text-[14px] text-ink-mute mb-6">
        Assigning a quiz is independent of assigning its case.
      </p>

      {availableQuizzes.length === 0 ? (
        <p className="font-serif italic text-[14px] text-ink-mute">
          No quizzes authored yet.
        </p>
      ) : (
        <ul className="border-t border-rule">
          {availableQuizzes.map((q) => (
            <li
              key={q.id}
              className="grid grid-cols-[1fr_120px_120px] items-baseline gap-6 py-4 border-b border-rule"
            >
              <span className="font-serif text-[16px] text-ink truncate">
                {q.title}
                {q.caseTitle && (
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-fade">
                    {q.caseTitle}
                  </span>
                )}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade">
                {q.scope ?? "standalone"}
              </span>
              <span className="justify-self-end">
                <AssignToggle
                  kind="quiz"
                  classroomId={classroom.id}
                  itemId={q.id}
                  initialAssigned={q.isAssigned}
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Library */}
      <div className="flex items-baseline justify-between mb-3 mt-14">
        <h2 className="font-serif text-[22px] tracking-[-0.01em]">
          Assign library
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade tabular-nums">
          {assignedLibraryCount} of {availableLibrary.length} assigned
        </span>
      </div>
      <p className="font-serif italic text-[14px] text-ink-mute mb-6">
        Only articles tagged for {levelLower} are listed.
      </p>

      {availableLibrary.length === 0 ? (
        <p className="font-serif italic text-[14px] text-ink-mute">
          No library articles for {LEVEL_LABEL[classroom.level]} yet.
        </p>
      ) : (
        <ul className="border-t border-rule">
          {availableLibrary.map((l) => (
            <li
              key={l.id}
              className="grid grid-cols-[1fr_120px] items-baseline gap-6 py-4 border-b border-rule"
            >
              <span className="font-serif text-[16px] text-ink truncate">
                {l.title}
              </span>
              <span className="justify-self-end">
                <AssignToggle
                  kind="library"
                  classroomId={classroom.id}
                  itemId={l.id}
                  initialAssigned={l.isAssigned}
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Resources */}
      <div className="flex items-baseline justify-between mb-3 mt-14">
        <h2 className="font-serif text-[22px] tracking-[-0.01em]">
          Assign resources
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade tabular-nums">
          {assignedResourceCount} of {availableResources.length} assigned
        </span>
      </div>
      <p className="font-serif italic text-[14px] text-ink-mute mb-6">
        Only resources tagged for {levelLower} are listed.
      </p>

      {availableResources.length === 0 ? (
        <p className="font-serif italic text-[14px] text-ink-mute">
          No resources for {LEVEL_LABEL[classroom.level]} yet.
        </p>
      ) : (
        <ul className="border-t border-rule">
          {availableResources.map((r) => (
            <li
              key={r.id}
              className="grid grid-cols-[1fr_120px] items-baseline gap-6 py-4 border-b border-rule"
            >
              <span className="font-serif text-[16px] text-ink truncate">
                {r.title}
              </span>
              <span className="justify-self-end">
                <AssignToggle
                  kind="resource"
                  classroomId={classroom.id}
                  itemId={r.id}
                  initialAssigned={r.isAssigned}
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-16 pt-6 border-t border-rule">
        <DeleteClassroomButton
          classroomId={classroom.id}
          classroomName={classroom.name}
        />
      </div>
    </>
  );
}

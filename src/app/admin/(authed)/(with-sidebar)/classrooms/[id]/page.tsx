import Link from "next/link";
import { notFound } from "next/navigation";
import { StageLabel } from "@/components/ui";
import { getClassroomDetailForAdmin } from "@/lib/queries/admin-classrooms";
import { ReleaseToggle } from "./release-toggle";
import { QuizReleaseToggle } from "./quiz-release-toggle";
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

  const { classroom, availableCases, availableQuizzes } = detail;
  const releasedCount = availableCases.filter((c) => c.isReleased).length;
  const releasedQuizCount = availableQuizzes.filter((q) => q.isReleased).length;

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
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        {classroom.teacherName} ({classroom.teacherEmail}) ·{" "}
        {classroom.schoolName} · {LEVEL_LABEL[classroom.level] ?? classroom.level}
      </p>

      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-serif text-[22px] tracking-[-0.01em]">
          Release cases
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade tabular-nums">
          {releasedCount} of {availableCases.length} released
        </span>
      </div>
      <p className="font-serif italic text-[14px] text-ink-mute mb-6">
        Only cases tagged for {LEVEL_LABEL[classroom.level]?.toLowerCase()} are
        listed.
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
                <ReleaseToggle
                  classroomId={classroom.id}
                  caseId={c.id}
                  initialReleased={c.isReleased}
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-baseline justify-between mb-3 mt-14">
        <h2 className="font-serif text-[22px] tracking-[-0.01em]">
          Release quizzes
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade tabular-nums">
          {releasedQuizCount} of {availableQuizzes.length} released
        </span>
      </div>
      <p className="font-serif italic text-[14px] text-ink-mute mb-6">
        Releasing a quiz is independent of releasing its case.
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
                <QuizReleaseToggle
                  classroomId={classroom.id}
                  quizId={q.id}
                  initialReleased={q.isReleased}
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

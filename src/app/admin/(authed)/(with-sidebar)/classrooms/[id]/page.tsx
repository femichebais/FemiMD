import Link from "next/link";
import { notFound } from "next/navigation";
import { StageLabel } from "@/components/ui";
import { getClassroomDetailForAdmin } from "@/lib/queries/admin-classrooms";
import { ReleaseToggle } from "./release-toggle";

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

  const { classroom, availableCases } = detail;
  const releasedCount = availableCases.filter((c) => c.isReleased).length;

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
    </>
  );
}

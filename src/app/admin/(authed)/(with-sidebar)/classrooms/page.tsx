import Link from "next/link";
import { StageLabel } from "@/components/ui";
import {
  listAllClassrooms,
  type AdminClassroomRow,
} from "@/lib/queries/admin-classrooms";

const LEVEL_LABEL: Record<string, string> = {
  middle: "Middle",
  high: "High",
  undergrad: "Undergrad",
};

async function safeList(): Promise<AdminClassroomRow[]> {
  try {
    return await listAllClassrooms();
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[admin/classrooms/list]", err);
    }
    return [];
  }
}

export default async function AdminClassroomsPage() {
  const rows = await safeList();

  return (
    <>
      <StageLabel className="mb-5">Classrooms</StageLabel>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        All classrooms.
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        Open a classroom to release cases to it. Teachers can still toggle
        release inside their own classroom too.
      </p>

      {rows.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute">
          No classrooms yet.
        </p>
      ) : (
        <ul>
          {rows.map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-[1fr_160px_140px_100px_100px_70px] items-baseline gap-6 py-5 border-b border-rule"
            >
              <Link
                href={`/admin/classrooms/${c.id}`}
                className="font-serif text-[18px] text-ink hover:text-accent transition-colors truncate"
              >
                {c.name}
              </Link>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-mute truncate">
                {c.teacherName}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-mute truncate">
                {c.schoolName}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade">
                {LEVEL_LABEL[c.level] ?? c.level}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade tabular-nums">
                {c.studentCount} student{c.studentCount === 1 ? "" : "s"}
              </span>
              <Link
                href={`/admin/classrooms/${c.id}`}
                className="justify-self-end font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-accent border border-rule-strong px-3 py-2 rounded-[2px] transition-colors"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

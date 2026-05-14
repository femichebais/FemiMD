import { StageLabel } from "@/components/ui";
import { requireRole } from "@/lib/auth/current-user";
import {
  listResourcesForStudent,
  type StudentResourceRow,
} from "@/lib/queries/resources";

const TYPE_LABEL: Record<string, string> = {
  pdf: "PDF",
  link: "Link",
  slides: "Slides",
};

async function safeList(studentId: string): Promise<StudentResourceRow[]> {
  try {
    return await listResourcesForStudent(studentId);
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[student/resources]", err);
    }
    return [];
  }
}

export default async function StudentResourcesPage() {
  const { user } = await requireRole("student");
  const rows = await safeList(user.id);

  return (
    <main className="max-w-case mx-auto px-6 md:px-12 py-10 md:py-14">
      <StageLabel className="mb-5">Resources</StageLabel>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        Reading list.
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        Anything your teacher or the platform admin has shared for your level.
      </p>

      {rows.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute">
          No resources have been shared yet.
        </p>
      ) : (
        <ul>
          {rows.map((r) => (
            <li
              key={r.id}
              className="border-b border-rule last:border-b-0 py-5"
            >
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group grid grid-cols-[70px_1fr_24px] items-baseline gap-5"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-fade group-hover:text-accent transition-colors">
                  {TYPE_LABEL[r.type] ?? r.type}
                </span>
                <span className="font-serif text-[19px] text-ink group-hover:text-accent transition-colors">
                  {r.title}
                </span>
                <span
                  aria-hidden
                  className="font-mono text-[14px] text-ink-fade group-hover:text-accent transition-colors justify-self-end"
                >
                  →
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

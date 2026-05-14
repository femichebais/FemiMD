import Link from "next/link";
import { Button, StageLabel } from "@/components/ui";
import { listCases, type CaseListRow } from "@/lib/queries/cases";

const LEVEL_LABEL: Record<string, string> = {
  middle: "Middle",
  high: "High",
  undergrad: "Undergrad",
};

async function safeListCases(): Promise<CaseListRow[]> {
  try {
    return await listCases();
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[admin/cases] listCases failed:", err);
    }
    return [];
  }
}

export default async function CasesListPage() {
  const rows = await safeListCases();

  return (
    <>
      <StageLabel className="mb-5">Cases</StageLabel>
      <div className="flex items-baseline justify-between mb-3">
        <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em]">
          Authored cases.
        </h1>
        <Link href="/admin/cases/new">
          <Button>+ New case</Button>
        </Link>
      </div>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        After a case is published, only text edits are allowed — structure is
        locked. Delete the case and recreate it to change structure.
      </p>

      {rows.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute">
          No cases yet. Author your first one.
        </p>
      ) : (
        <ul>
          {rows.map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-[1fr_140px_100px_100px_70px] items-center gap-5 py-5 border-b border-rule"
            >
              <Link
                href={`/admin/cases/${c.id}`}
                className="font-serif text-[18px] text-ink hover:text-accent transition-colors truncate"
              >
                {c.title}
              </Link>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-mute">
                {c.levels.length === 0
                  ? "no levels"
                  : c.levels
                      .map((l) => LEVEL_LABEL[l] ?? l)
                      .join(" · ")}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade">
                {c.stageCount} stage{c.stageCount === 1 ? "" : "s"}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade">
                {c.attemptCount} attempt{c.attemptCount === 1 ? "" : "s"}
              </span>
              <Link
                href={`/admin/cases/${c.id}`}
                className="justify-self-end font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-accent border border-rule-strong px-3 py-2 rounded-[2px] transition-colors"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

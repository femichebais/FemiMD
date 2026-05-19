import Link from "next/link";
import { Button, StageLabel } from "@/components/ui";
import { listCases, type CaseListRow } from "@/lib/queries/cases";
import { PublishToggle } from "./publish-toggle";

const LEVEL_LABEL: Record<string, string> = {
  middle: "Middle school",
  high: "High school",
  undergrad: "Undergraduate",
};

// Order sections from earliest to latest schooling stage.
const LEVEL_ORDER = ["middle", "high", "undergrad"] as const;

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

  // Bucket each case under every level it's authored for. A case marked for
  // both Middle and High shows up in both sections — that mirrors how Femi
  // thinks about which student cohorts can take it.
  const byLevel: Record<string, CaseListRow[]> = {
    middle: [],
    high: [],
    undergrad: [],
  };
  const unassigned: CaseListRow[] = [];
  for (const c of rows) {
    if (c.levels.length === 0) {
      unassigned.push(c);
      continue;
    }
    for (const l of c.levels) {
      (byLevel[l] ??= []).push(c);
    }
  }

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
        Grouped by student level. A case shows up in every section it&apos;s
        authored for. Drafts stay admin-only; click Publish on a row to
        release it.
      </p>

      {rows.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute">
          No cases yet. Author your first one.
        </p>
      ) : (
        <>
          {LEVEL_ORDER.map((level) => {
            const list = byLevel[level] ?? [];
            return (
              <LevelSection
                key={level}
                title={LEVEL_LABEL[level]}
                cases={list}
              />
            );
          })}
          {unassigned.length > 0 && (
            <LevelSection title="No level assigned" cases={unassigned} />
          )}
        </>
      )}
    </>
  );
}

function LevelSection({
  title,
  cases,
}: {
  title: string;
  cases: CaseListRow[];
}) {
  return (
    <section className="mb-12">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mute">
          {title}
        </h2>
        <span className="font-mono text-[10px] text-ink-fade tracking-[0.05em]">
          {cases.length} case{cases.length === 1 ? "" : "s"}
        </span>
      </div>
      {cases.length === 0 ? (
        <p className="font-serif italic text-[14px] text-ink-fade pb-4 border-b border-rule">
          No cases authored for this level yet.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-6 md:mx-0 px-6 md:px-0">
          <ul className="min-w-[700px]">
            {cases.map((c) => (
              <CaseRow key={c.id} c={c} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function CaseRow({ c }: { c: CaseListRow }) {
  const isDraft = c.publishedAt === null;
  return (
    <li className="grid grid-cols-[1fr_110px_120px_90px_120px_70px] items-center gap-4 py-5 border-b border-rule">
      <Link
        href={`/admin/cases/${c.id}`}
        className="font-serif text-[18px] text-ink hover:text-accent transition-colors truncate"
      >
        {c.title}
      </Link>

      <span
        className={
          "font-mono text-[10px] uppercase tracking-[0.18em] inline-flex items-center gap-2 " +
          (isDraft ? "text-ink-fade" : "text-accent")
        }
      >
        <span
          className={
            "w-[6px] h-[6px] rounded-full " +
            (isDraft ? "bg-ink-fade" : "bg-accent")
          }
          aria-hidden
        />
        {isDraft ? "Draft" : "Published"}
      </span>

      <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-mute">
        {c.levels.length === 0
          ? "no levels"
          : c.levels.map((l) => LEVEL_LABEL[l] ?? l).join(" · ")}
      </span>

      <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade">
        {c.stageCount} stage{c.stageCount === 1 ? "" : "s"}
      </span>

      <PublishToggle caseId={c.id} initialPublishedAt={c.publishedAt} />

      <Link
        href={`/admin/cases/${c.id}`}
        className="justify-self-end font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-accent border border-rule-strong px-3 py-2 rounded-[2px] transition-colors"
      >
        Edit
      </Link>
    </li>
  );
}

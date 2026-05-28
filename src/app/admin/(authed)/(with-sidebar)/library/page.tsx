import Link from "next/link";
import { Button, StageLabel } from "@/components/ui";
import { listAllLibraryPages, type AdminLibraryRow } from "@/lib/queries/library";
import { DeleteLibraryButton } from "./[slug]/delete-library-button";

const LEVEL_LABEL: Record<string, string> = {
  middle: "Middle",
  high: "High",
  undergrad: "Undergrad",
};

async function safeList(): Promise<AdminLibraryRow[]> {
  try {
    return await listAllLibraryPages();
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[admin/library/list]", err);
    }
    return [];
  }
}

export default async function AdminLibraryPage() {
  const rows = await safeList();

  return (
    <>
      <StageLabel className="mb-5">Library</StageLabel>
      <div className="flex items-baseline justify-between mb-3">
        <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em]">
          Diagnosis articles.
        </h1>
        <Link href="/admin/library/new">
          <Button>+ New page</Button>
        </Link>
      </div>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        Linked from case feedback pages by slug. Text and images are freely
        editable post-publish.
      </p>

      {rows.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute">
          No pages yet.
        </p>
      ) : (
        <ul>
          {rows.map((page) => (
            <li
              key={page.id}
              className="grid grid-cols-[1fr_140px_140px_70px_70px] items-baseline gap-6 py-5 border-b border-rule"
            >
              <Link
                href={`/admin/library/${page.slug}`}
                className="font-serif text-[18px] text-ink hover:text-accent transition-colors"
              >
                {page.title}
              </Link>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-mute">
                {page.levels.length === 0
                  ? "no levels"
                  : page.levels.map((l) => LEVEL_LABEL[l] ?? l).join(" · ")}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade truncate">
                /{page.slug}
              </span>
              <Link
                href={`/admin/library/${page.slug}`}
                className="justify-self-end font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-accent border border-rule-strong px-3 py-2 rounded-[2px] transition-colors"
              >
                Edit
              </Link>
              <span className="justify-self-end">
                <DeleteLibraryButton id={page.id} title={page.title} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

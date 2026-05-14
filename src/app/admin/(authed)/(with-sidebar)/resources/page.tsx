import { StageLabel } from "@/components/ui";
import {
  listAllResources,
  type AdminResourceRow,
} from "@/lib/queries/resources";
import { CreateResourceForm } from "./_components/create-resource-form";
import { DeleteResourceButton } from "./_components/delete-resource-button";

const LEVEL_LABEL: Record<string, string> = {
  middle: "Middle",
  high: "High",
  undergrad: "Undergrad",
};

const TYPE_LABEL: Record<string, string> = {
  pdf: "PDF",
  link: "Link",
  slides: "Slides",
};

async function safeList(): Promise<AdminResourceRow[]> {
  try {
    return await listAllResources();
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[admin/resources]", err);
    }
    return [];
  }
}

export default async function AdminResourcesPage() {
  const rows = await safeList();

  return (
    <>
      <StageLabel className="mb-5">Resources</StageLabel>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        Files & links.
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-10">
        PDFs and slide decks live in Supabase Storage. External links are
        stored as URLs only.
      </p>

      <CreateResourceForm />

      {rows.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute">
          No resources yet.
        </p>
      ) : (
        <ul>
          {rows.map((r) => (
            <li
              key={r.id}
              className="grid grid-cols-[80px_1fr_140px_140px_80px] items-baseline gap-6 py-5 border-b border-rule"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-fade">
                {TYPE_LABEL[r.type] ?? r.type}
              </span>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-serif text-[18px] text-ink hover:text-accent transition-colors truncate"
              >
                {r.title}
              </a>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-mute">
                {r.levels.length === 0
                  ? "no levels"
                  : r.levels.map((l) => LEVEL_LABEL[l] ?? l).join(" · ")}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade">
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                }).format(new Date(r.createdAt))}
              </span>
              <span className="justify-self-end">
                <DeleteResourceButton id={r.id} title={r.title} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

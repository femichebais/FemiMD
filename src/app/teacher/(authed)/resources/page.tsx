import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/current-user";
import { listAllResources, type AdminResourceRow } from "@/lib/queries/resources";
import { CEyebrow } from "@/components/clinical/primitives";

export const metadata: Metadata = { title: "Resources" };

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
      console.error("[teacher/resources]", err);
    }
    return [];
  }
}

export default async function TeacherResourcesPage() {
  await requireRole("teacher");
  const rows = await safeList();

  return (
    <main className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14">
      <CEyebrow className="mb-3">Resources</CEyebrow>
      <h1 className="font-serif text-[36px] md:text-[44px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-2">
        Reading list.
      </h1>
      <p className="text-[15.5px] text-clinical-muted-fg mb-10">
        Reference material shared across the platform.
      </p>

      {rows.length === 0 ? (
        <p className="text-[15px] text-clinical-muted-fg">
          No resources have been shared yet.
        </p>
      ) : (
        <ul className="border-t border-clinical-border">
          {rows.map((r) => (
            <li key={r.id} className="border-b border-clinical-border">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group grid grid-cols-[64px_1fr_auto] items-baseline gap-5 py-5"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-clinical-muted-fg group-hover:text-clinical-primary transition-colors">
                  {TYPE_LABEL[r.type] ?? r.type}
                </span>
                <span className="font-serif text-[18px] text-clinical-fg group-hover:text-clinical-primary transition-colors">
                  {r.title}
                  {r.levels.length > 0 && (
                    <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.14em] text-clinical-muted-fg">
                      {r.levels.join(" · ")}
                    </span>
                  )}
                </span>
                <span
                  aria-hidden
                  className="font-mono text-[14px] text-clinical-muted-fg group-hover:text-clinical-primary transition-colors justify-self-end"
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

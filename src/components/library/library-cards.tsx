import {
  Heart,
  BookOpen,
  Sliders,
  Stethoscope,
  MagnifyingGlass,
  Pill,
  Syringe,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { LibraryPageSection, LibrarySectionType } from "@/db/schema";
import {
  SECTION_TYPE_LABELS,
  ACCENT_SECTION_TYPE,
} from "@/lib/library/section-types";
import { cn } from "@/lib/utils";

const ICON_BY_TYPE: Record<LibrarySectionType, PhosphorIcon> = {
  definition: Heart,
  description: BookOpen,
  what_happens_in_body: Sliders,
  symptoms: Stethoscope,
  physical_exam: MagnifyingGlass,
  management: Pill,
  treatment: Syringe,
  what_to_do: ArrowRight,
};

export interface LibraryCardsProps {
  sections: LibraryPageSection[];
}

export function LibraryCards({ sections }: LibraryCardsProps) {
  if (sections.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {sections.map((s) => (
        <LibraryCard key={s.id} section={s} />
      ))}
    </div>
  );
}

function LibraryCard({ section }: { section: LibraryPageSection }) {
  // Typed sections get a preset icon + label; custom-titled sections use
  // a default book icon and render the admin-provided title as-is.
  const Icon = section.type ? ICON_BY_TYPE[section.type] : BookOpen;
  const isAccent = section.type === ACCENT_SECTION_TYPE;
  const label = section.type
    ? SECTION_TYPE_LABELS[section.type]
    : (section.title ?? "Untitled");

  return (
    <article
      className={cn(
        "rounded-clinical border px-5 py-4 sm:px-6 sm:py-5",
        isAccent
          ? "border-clinical-warn-border bg-clinical-warn-bg"
          : "border-clinical-border bg-clinical-card"
      )}
    >
      <header className="flex items-center gap-2.5 mb-3">
        <Icon
          weight={isAccent ? "bold" : "regular"}
          className={cn(
            "h-5 w-5",
            isAccent ? "text-clinical-warn-fg" : "text-clinical-primary"
          )}
        />
        <h3
          className={cn(
            "text-[12px] font-semibold tracking-[0.08em] uppercase",
            isAccent ? "text-clinical-warn-fg" : "text-clinical-fg"
          )}
        >
          {label}
        </h3>
      </header>
      <CardBody markdown={section.bodyMarkdown} accent={isAccent} />
    </article>
  );
}

// Card-scoped markdown rendering. Tighter than the full ArticleBody — the
// only blocks we expect inside a card are paragraphs and bullet lists.
function CardBody({
  markdown,
  accent,
}: {
  markdown: string;
  accent: boolean;
}) {
  return (
    <div
      className={cn(
        "text-[15.5px] leading-[1.55]",
        accent
          ? "text-clinical-warn-fg font-semibold"
          : "text-clinical-fg/90"
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1 mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1 mb-0">{children}</ol>
          ),
          li: ({ children }) => (
            <li
              className={cn(
                accent
                  ? "marker:text-clinical-warn-fg"
                  : "marker:text-clinical-muted-fg"
              )}
            >
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="underline underline-offset-2 hover:text-clinical-primary"
            >
              {children}
            </a>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

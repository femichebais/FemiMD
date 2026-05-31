import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/current-user";
import { getLibraryPageForTeacher } from "@/lib/queries/library";
import { ArticleBody } from "@/components/markdown/article";
import { LibraryCards } from "@/components/library/library-cards";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TeacherArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const { user } = await requireRole("teacher");

  const result = await getLibraryPageForTeacher(slug, user.id);
  if (!result) notFound();
  const { page, sections } = result;

  return (
    <article className="max-w-read">
      {page.eyebrow && (
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mute mb-5">
          {page.eyebrow}
        </div>
      )}

      <h1 className="font-serif text-[52px] leading-[1.05] tracking-[-0.025em] font-normal mb-7">
        {page.title}
      </h1>

      {page.dek && (
        <p className="font-serif italic text-[21px] leading-[1.5] text-ink-mute font-light mb-14">
          {page.dek}
        </p>
      )}

      {page.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={page.coverImageUrl}
          alt=""
          className="w-full mb-12 rounded-clinical border border-clinical-border"
        />
      )}

      {sections.length > 0 ? (
        <LibraryCards sections={sections} />
      ) : (
        page.bodyMarkdown && <ArticleBody markdown={page.bodyMarkdown} />
      )}
    </article>
  );
}

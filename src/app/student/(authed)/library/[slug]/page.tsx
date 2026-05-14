import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/current-user";
import { getLibraryPageForStudent } from "@/lib/queries/library";
import { ArticleBody } from "@/components/markdown/article";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function StudentArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const { user } = await requireRole("student");

  const page = await getLibraryPageForStudent(user.id, slug);
  if (!page) notFound();

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
          className="w-full mb-12 rounded-[2px] border border-rule"
        />
      )}

      <ArticleBody markdown={page.bodyMarkdown} />
    </article>
  );
}

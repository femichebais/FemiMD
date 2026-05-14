import { notFound } from "next/navigation";
import { StageLabel } from "@/components/ui";
import { LibraryPageForm } from "../_components/library-page-form";
import { updateLibraryPage } from "../actions";
import { DeleteLibraryButton } from "./delete-library-button";
import { getLibraryPageBySlug } from "@/lib/queries/library";
import type { Level } from "../actions";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditLibraryPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getLibraryPageBySlug(slug);
  if (!data) notFound();

  // Bind the page id so the form action signature stays
  // (state, formData) => state.
  const boundUpdate = updateLibraryPage.bind(null, data.page.id);

  return (
    <>
      <div className="flex items-baseline justify-between mb-5">
        <StageLabel>Edit page</StageLabel>
        <DeleteLibraryButton id={data.page.id} title={data.page.title} />
      </div>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        {data.page.title}
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        Edits are saved as you submit. The slug can be changed, but old links
        will break.
      </p>

      <LibraryPageForm
        action={boundUpdate}
        initial={{
          title: data.page.title,
          eyebrow: data.page.eyebrow ?? "",
          dek: data.page.dek ?? "",
          slug: data.page.diagnosisSlug,
          bodyMarkdown: data.page.bodyMarkdown,
          coverImageUrl: data.page.coverImageUrl ?? "",
          levels: data.levels as Level[],
        }}
        submitLabel="Save changes"
      />
    </>
  );
}

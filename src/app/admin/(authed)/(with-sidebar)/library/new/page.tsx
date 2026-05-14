import { StageLabel } from "@/components/ui";
import { LibraryPageForm } from "../_components/library-page-form";
import { createLibraryPage } from "../actions";

export default function NewLibraryPage() {
  return (
    <>
      <StageLabel className="mb-5">New page</StageLabel>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        Create a library page.
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        Authored in markdown. The slug links from any case&apos;s feedback page.
      </p>
      <LibraryPageForm action={createLibraryPage} submitLabel="Create page" />
    </>
  );
}

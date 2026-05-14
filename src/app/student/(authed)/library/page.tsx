import { StageLabel } from "@/components/ui";

export default function LibraryIndexPage() {
  return (
    <article className="max-w-read">
      <StageLabel className="mb-5">Library</StageLabel>
      <h1 className="font-serif text-[44px] leading-[1.05] tracking-[-0.025em] font-normal mb-7">
        Clinical reference.
      </h1>
      <p className="font-serif italic text-[19px] leading-[1.5] text-ink-mute mb-9 font-light">
        Articles you can read alongside the cases. Pick a diagnosis from the
        list to read more.
      </p>
      <p className="text-[16px] leading-[1.75] text-ink-mute">
        Every case you complete links here. The articles are written for your
        level — anything outside it won&apos;t appear in your list.
      </p>
    </article>
  );
}

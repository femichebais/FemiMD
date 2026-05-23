import Link from "next/link";
import { ArrowRight, BookOpen } from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/lib/auth/current-user";
import { listLibraryForTeacher } from "@/lib/queries/library";
import { CCard, CEyebrow } from "@/components/clinical/primitives";

export default async function TeacherLibraryIndexPage() {
  await requireRole("teacher");
  let entries: Awaited<ReturnType<typeof listLibraryForTeacher>> = [];
  try {
    entries = await listLibraryForTeacher();
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[teacher/library/index]", err);
    }
  }

  return (
    <article>
      <CEyebrow className="mb-3">Clinical library</CEyebrow>
      <h1 className="font-serif text-[40px] md:text-[48px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-4">
        Reference, on hand.
      </h1>
      <p className="text-[17px] leading-[1.55] text-clinical-muted-fg max-w-prose mb-10">
        Articles your students read alongside the cases. You can see every
        published article — student access is gated by classroom level.
      </p>

      {entries.length === 0 ? (
        <CCard className="px-6 py-10 text-center">
          <BookOpen
            weight="duotone"
            className="h-9 w-9 text-clinical-muted-fg mx-auto mb-3"
          />
          <p className="text-clinical-fg font-medium mb-1">
            No library pages published yet.
          </p>
          <p className="text-[14px] text-clinical-muted-fg">
            Articles published in the CMS will show up here.
          </p>
        </CCard>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {entries.map((e) => (
            <li key={e.id}>
              <Link
                href={`/teacher/library/${e.slug}`}
                className="block group"
              >
                <CCard
                  hoverable
                  className="p-4 sm:p-5 h-full flex items-center gap-4"
                >
                  <span
                    className="grid place-items-center h-10 w-10 rounded-clinical bg-clinical-primary-soft text-clinical-primary flex-shrink-0"
                    aria-hidden
                  >
                    <BookOpen weight="duotone" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {e.eyebrow && (
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-clinical-muted-fg mb-0.5">
                        {e.eyebrow}
                      </p>
                    )}
                    <p className="font-serif text-[17px] text-clinical-fg leading-tight group-hover:text-clinical-primary transition-colors truncate">
                      {e.title}
                    </p>
                  </div>
                  <ArrowRight
                    weight="bold"
                    className="h-4 w-4 text-clinical-muted-fg group-hover:text-clinical-primary transition-colors flex-shrink-0"
                  />
                </CCard>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

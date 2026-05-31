import { requireRole } from "@/lib/auth/current-user";
import { listLibraryForTeacher } from "@/lib/queries/library";
import { LibraryToc } from "@/app/student/(authed)/library/_components/library-toc";

async function safeList(teacherId: string) {
  try {
    return await listLibraryForTeacher(teacherId);
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[teacher/library/list]", err);
    }
    return [];
  }
}

export default async function TeacherLibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireRole("teacher");
  const entries = await safeList(user.id);

  return (
    <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-10 md:py-14 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 md:gap-20">
      <aside className="md:sticky md:top-[110px] md:self-start">
        <LibraryToc
          entries={entries}
          basePath="/teacher/library"
          emptyMessage="No library pages published yet."
        />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

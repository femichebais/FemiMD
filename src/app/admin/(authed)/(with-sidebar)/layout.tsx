import { AdminSidebar } from "../admin-sidebar";
import { countPendingSignups } from "@/lib/queries/admin-signups";

async function safePendingCount(): Promise<number> {
  try {
    return await countPendingSignups();
  } catch (err) {
    // If the table doesn't exist yet (pre-migration) or the DB is down,
    // the sidebar still has to render — fall through to 0 rather than 500
    // every admin page.
    if (process.env.NODE_ENV === "production") {
      console.error("[admin/layout] pending signup count failed:", err);
    }
    return 0;
  }
}

// Adds the admin section sidebar. Pages OUTSIDE this group (like the case
// editor) get the full content width and render their own sidebar.
export default async function AdminWithSidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pendingSignups = await safePendingCount();

  return (
    <div className="flex-1 max-w-[1240px] w-full mx-auto px-6 md:px-12 py-10 md:py-14 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 md:gap-16">
      <aside className="md:sticky md:top-[110px] md:self-start">
        <AdminSidebar badges={{ pendingSignups }} />
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}

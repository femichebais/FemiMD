import { AdminSidebar } from "../admin-sidebar";

// Adds the admin section sidebar. Pages OUTSIDE this group (like the case
// editor) get the full content width and render their own sidebar.
export default function AdminWithSidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 max-w-[1240px] w-full mx-auto px-6 md:px-12 py-10 md:py-14 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 md:gap-16">
      <aside className="md:sticky md:top-[110px] md:self-start">
        <AdminSidebar />
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}

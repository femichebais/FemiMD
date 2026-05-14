import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

type Role = "admin" | "teacher" | "student";

// Each section has its own login entry — students/teachers share /login,
// admin lives at /admin/login. Mismatched roles are sent back to login,
// not to a sibling section, to avoid leaking the existence of the other
// section to a wrong-role user.
const SECTIONS: Array<{ prefix: string; role: Role; login: string }> = [
  { prefix: "/admin", role: "admin", login: "/admin/login" },
  { prefix: "/teacher", role: "teacher", login: "/login" },
  { prefix: "/student", role: "student", login: "/login" },
];

// Auth-aware paths that should bounce a signed-in user to their dashboard.
const LOGIN_PATHS = new Set([
  "/login",
  "/admin/login",
  "/forgot-password",
  "/reset-password",
]);

const DASHBOARD_FOR: Record<Role, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

function getRole(user: { app_metadata?: Record<string, unknown> } | null): Role | null {
  const role = user?.app_metadata?.role;
  if (role === "admin" || role === "teacher" || role === "student") {
    return role;
  }
  return null;
}

export async function middleware(request: NextRequest) {
  // Always run updateSession first — it refreshes cookies and gives us the
  // validated user in one call. Skipping this for "public" paths would
  // leave the auth state stale for any subsequent request that needs it.
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const role = getRole(user);

  // Section gating: /admin, /teacher, /student
  for (const section of SECTIONS) {
    const inside =
      pathname === section.prefix || pathname.startsWith(`${section.prefix}/`);
    if (!inside) continue;

    // Allow the section's own login page (admin login lives under /admin)
    if (LOGIN_PATHS.has(pathname)) break;

    if (!user || role !== section.role) {
      const url = request.nextUrl.clone();
      url.pathname = section.login;
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    break;
  }

  // If a signed-in user hits a login page, bounce them to their dashboard.
  if (user && role && LOGIN_PATHS.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = DASHBOARD_FOR[role];
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets and Next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|css|js|map)$).*)",
  ],
};

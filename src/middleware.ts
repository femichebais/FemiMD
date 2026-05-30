import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

type Role = "admin" | "teacher" | "student" | "pending";

// Each section has its own login entry — students/teachers share /login,
// admin lives at /admin/login. Mismatched roles are sent back to login,
// not to a sibling section, to avoid leaking the existence of the other
// section to a wrong-role user.
//
// /pending is the holding pen for self-signups awaiting admin approval —
// it has the same shape as a regular section but the user has no case
// content yet.
const SECTIONS: Array<{ prefix: string; role: Role; login: string }> = [
  { prefix: "/admin", role: "admin", login: "/admin/login" },
  { prefix: "/teacher", role: "teacher", login: "/login" },
  { prefix: "/student", role: "student", login: "/login" },
  { prefix: "/pending", role: "pending", login: "/login" },
];

// Auth-aware paths that should bounce a signed-in user to their dashboard.
const LOGIN_PATHS = new Set([
  "/login",
  "/admin/login",
  "/signup",
  "/signup/pending",
  "/forgot-password",
  "/reset-password",
]);

const DASHBOARD_FOR: Record<Role, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  pending: "/pending",
};

function getRole(
  user: { app_metadata?: Record<string, unknown> } | null
): Role | null {
  const role = user?.app_metadata?.role;
  if (
    role === "admin" ||
    role === "teacher" ||
    role === "student" ||
    role === "pending"
  ) {
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

  // Section gating: /admin, /teacher, /student, /pending
  for (const section of SECTIONS) {
    const inside =
      pathname === section.prefix || pathname.startsWith(`${section.prefix}/`);
    if (!inside) continue;

    // Allow the section's own login page (admin login lives under /admin)
    if (LOGIN_PATHS.has(pathname)) break;

    if (!user || role !== section.role) {
      // A pending user wandering into a real section gets sent to their
      // holding pen instead of login — they have a session, just not the
      // right role yet. Everyone else goes to the section's login.
      const url = request.nextUrl.clone();
      if (role === "pending") {
        url.pathname = "/pending";
        url.search = "";
      } else {
        url.pathname = section.login;
        url.searchParams.set("next", pathname);
      }
      return NextResponse.redirect(url);
    }
    break;
  }

  // If a signed-in user hits a login/signup page, bounce them to their
  // dashboard (or /pending if they're still awaiting approval).
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

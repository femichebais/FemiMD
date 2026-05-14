import type { Metadata } from "next";
import { Fraunces, Geist, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { currentUser } from "@/lib/auth/current-user";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

// Site URL resolution, in priority order:
//   1. NEXT_PUBLIC_SITE_URL — explicit override (use for custom domains)
//   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel's stable production URL
//   3. VERCEL_URL — Vercel's per-deployment URL (preview deploys)
//   4. localhost — local dev fallback
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
const DESCRIPTION =
  "Patient cases for high school and undergraduate students. Stage by stage. Decisions that build clinical judgement.";

export const metadata: Metadata = {
  // metadataBase resolves relative URLs in metadata (including the OG image
  // produced by opengraph-image.tsx) to absolute. Without it, Twitter/iMessage
  // unfurls don't render the image.
  metadataBase: new URL(SITE_URL),

  // `template` lets each route export a short title ("Library") and it
  // composes as "Library · Femi". Default is used when a route has none.
  title: {
    template: "%s · Femi",
    default: "Femi Medical — Clinical education",
  },
  description: DESCRIPTION,

  openGraph: {
    title: "Femi Medical",
    description: DESCRIPTION,
    type: "website",
    siteName: "Femi Medical",
    url: SITE_URL,
    locale: "en_US",
    // Image is wired automatically from src/app/opengraph-image.tsx.
  },

  twitter: {
    card: "summary_large_image",
    title: "Femi Medical",
    description: DESCRIPTION,
  },

  // Prevent indexing on non-prod URLs by default. In production, an explicit
  // NEXT_PUBLIC_ALLOW_INDEXING=1 flips this on.
  robots:
    process.env.NEXT_PUBLIC_ALLOW_INDEXING === "1"
      ? { index: true, follow: true }
      : { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Resolve auth on the server. Until env is configured this throws —
  // catch so the design system page still renders during local bring-up.
  let initialUser = null;
  try {
    const session = await currentUser();
    initialUser = session?.user ?? null;
  } catch {
    initialUser = null;
  }

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${geist.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
      </body>
    </html>
  );
}

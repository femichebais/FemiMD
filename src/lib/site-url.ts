import { headers } from "next/headers";

// Returns the base URL of the current request (e.g. http://localhost:3000
// in dev, https://app.example.com in prod). Used to build absolute URLs
// for Supabase redirectTo, classroom invite links, etc.
//
// We prefer NEXT_PUBLIC_SITE_URL when set (lets you override in environments
// where the Host header isn't reliable — e.g. behind a proxy), and fall
// back to deriving from the request headers.
export async function getSiteUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  // localhost is HTTP; everything else is HTTPS (Vercel + custom domains
  // both terminate TLS upstream).
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

/**
 * The app's public address, used in emailed links. No trailing slash.
 * BETTER_AUTH_URL when set; on a Vercel preview without it, that deployment's own address.
 */
export function appUrl(): string {
  const preview = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
  return (process.env.BETTER_AUTH_URL || preview || "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * Only allow redirects to paths on this site ("/manager"), never to another
 * site ("https://evil.example" or "//evil.example").
 */
export function safeNextPath(next: unknown): string | null {
  if (typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

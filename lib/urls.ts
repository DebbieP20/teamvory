/** The app's public address, used in emailed links. No trailing slash. */
export function appUrl(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
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

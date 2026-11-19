import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { rateLimitsOff } from "@/lib/test-switches";
import { sha256 } from "@/lib/tokens";

/**
 * Records an attempt and returns true if the limit for `key` is exceeded.
 * RATE_LIMITS=off disables it for automated tests (never on the live site).
 */
export async function isRateLimited(key: string, max: number, windowMs: number): Promise<boolean> {
  if (rateLimitsOff()) return false;
  const since = new Date(Date.now() - windowMs);
  const recent = await db.rateLimitEvent.count({ where: { key, createdAt: { gte: since } } });
  if (recent >= max) return true;
  await db.rateLimitEvent.create({ data: { key } });
  return false;
}

/** A hash of the visitor's IP address, for rate-limit keys (never store the raw IP). */
export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return sha256(`${process.env.IP_HASH_SALT ?? "teamvory"}:${ip}`);
}

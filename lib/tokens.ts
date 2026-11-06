import { createHash, randomBytes } from "node:crypto";

/** A random, URL-safe token for emailed links (256 bits). */
export function createToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex digest. Tokens are stored hashed so a database leak can't be used to accept them. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

import { connection } from "next/server";
import { db } from "@/lib/db";

// GET /api/health: confirms the app is running and can reach the database.
// Used by the browser tests now, and by uptime monitoring after launch.
export async function GET() {
  await connection(); // always check live, never prerender at build time

  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "ok" });
  } catch (error) {
    console.error("Health check: database unreachable", error);
    return Response.json({ status: "error", database: "unreachable" }, { status: 503 });
  }
}

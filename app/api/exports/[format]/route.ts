import { toDocx } from "@/lib/exports/docx";
import { exportData } from "@/lib/exports/data";
import { toJpg, toPng } from "@/lib/exports/image";
import { toPdf } from "@/lib/exports/pdf";
import { toXlsx } from "@/lib/exports/xlsx";
import { weekStart } from "@/lib/dates";
import { requireManager } from "@/lib/session";

// Schedule downloads (decision 12): /api/exports/pdf?week=2026-11-16 (pdf, png, jpg, docx, xlsx),
// with &hours=0 to leave the hours out.

const FORMATS = {
  pdf: { type: "application/pdf", make: toPdf },
  png: { type: "image/png", make: toPng },
  jpg: { type: "image/jpeg", make: toJpg },
  docx: { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", make: toDocx },
  xlsx: { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", make: toXlsx },
} as const;

export async function GET(request: Request, { params }: RouteContext<"/api/exports/[format]">) {
  const { membership } = await requireManager();
  const { format } = await params;
  const spec = FORMATS[format as keyof typeof FORMATS];
  const query = new URL(request.url).searchParams;
  const week = query.get("week") ?? "";
  // ?hours=0 leaves "Hours this week" out, to share the schedule without everyone's hours.
  const includeHours = query.get("hours") !== "0";
  if (!spec) return new Response("Unknown format", { status: 404 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || weekStart(week) !== week) return new Response("Choose a week (a Monday)", { status: 400 });

  const data = await exportData(membership.businessId, week, { includeHours });
  if (!data) return new Response("That week has no schedule yet", { status: 404 });

  const body = await spec.make(data);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": spec.type,
      "Content-Disposition": `attachment; filename="teamvory-schedule-${week}.${format}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

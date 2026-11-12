import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import sharp from "sharp";
import { type ExportData, fmtHours } from "@/lib/exports/data";

// PNG/JPG: the grid drawn with satori (JSX → SVG, text as shapes, brand font),
// then resvg turns the SVG into a PNG and sharp makes the JPG.

const NAVY = "#0B1F44";
const WIDTH = 1600;

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 700; style: "normal" }[]> | null = null;
function loadFonts() {
  const dir = join(process.cwd(), "node_modules/@fontsource/dm-sans/files");
  fonts ??= Promise.all(
    ([400, 700] as const).map(async (weight) => ({
      name: "DM Sans",
      data: await readFile(join(dir, `dm-sans-latin-${weight}-normal.woff`)),
      weight,
      style: "normal" as const,
    })),
  );
  return fonts;
}

function Grid({ data }: { data: ExportData }) {
  const cell = { flex: 1, display: "flex", flexDirection: "column", padding: 10, borderLeft: "1px solid #E2E8F0" } as const;
  return (
    <div style={{ display: "flex", flexDirection: "column", width: WIDTH, boxSizing: "border-box", padding: 40, background: "#F8FAFC", color: NAVY, fontFamily: "DM Sans", fontSize: 20 }}>
      <div style={{ display: "flex", fontSize: 36, fontWeight: 700 }}>
        {data.businessName} · {data.week}
      </div>
      <div style={{ display: "flex", color: "#64748B", marginTop: 4, marginBottom: 24 }}>{data.status}</div>
      <div style={{ display: "flex", flexDirection: "column", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "flex", background: NAVY, color: "#FFFFFF", fontWeight: 700 }}>
          <div style={{ display: "flex", width: 170, padding: 10 }}>Shift</div>
          {data.days.map((d) => (
            <div key={d.date} style={{ ...cell, borderLeft: "1px solid #1E3A6B" }}>
              {d.short}
            </div>
          ))}
        </div>
        {data.rows.map((row) => (
          <div key={row.label} style={{ display: "flex", borderTop: "1px solid #E2E8F0", minHeight: 90 }}>
            <div style={{ display: "flex", width: 170, padding: 10, fontWeight: 700, fontSize: 18 }}>{row.label}</div>
            {row.cells.map((c, i) => {
              const missing = c ? c.required - c.people.length : 0;
              return (
                <div key={i} style={{ ...cell, background: missing > 0 ? "#FEF2F2" : "#FFFFFF" }}>
                  {c?.eventTitle && <div style={{ display: "flex", color: "#5B21B6", fontSize: 16, fontWeight: 700 }}>{c.eventTitle}</div>}
                  {c?.people.map((p) => (
                    <div key={p} style={{ display: "flex" }}>
                      {p}
                    </div>
                  ))}
                  {missing > 0 && <div style={{ display: "flex", color: "#B91C1C", fontWeight: 700 }}>{missing} needed</div>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", marginTop: 28, gap: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Hours this week</div>
          {data.hours.map((h) => (
            <div key={h.name} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #E2E8F0", padding: "6px 0" }}>
              <span>{h.name}</span>
              <span>
                {fmtHours(h.hours)} h · {h.shifts} shift{h.shifts === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
        {data.events.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Events</div>
            {data.events.map((e) => (
              <div key={`${e.day}-${e.title}`} style={{ display: "flex", padding: "6px 0" }}>
                {e.day}: {e.title}, {e.time}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", color: "#94A3B8", fontSize: 16, marginTop: 24 }}>Made with TeamVory</div>
    </div>
  );
}

export async function toPng(data: ExportData): Promise<Buffer> {
  // Only the width is fixed; the height follows the content (rows, people, events).
  const svg = await satori(<Grid data={data} />, { width: WIDTH, fonts: await loadFonts() });
  return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } }).render().asPng());
}

export async function toJpg(data: ExportData): Promise<Buffer> {
  return sharp(await toPng(data)).flatten({ background: "#FFFFFF" }).jpeg({ quality: 88 }).toBuffer();
}

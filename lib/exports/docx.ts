import "server-only";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { type ExportData, fmtHours } from "@/lib/exports/data";

const NAVY = "0B1F44";

const headerCell = (text: string) =>
  new TableCell({
    shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 18 })] })],
  });

const textCell = (lines: { text: string; bold?: boolean; color?: string; italics?: boolean }[]) =>
  new TableCell({
    children: lines.length
      ? lines.map((l) => new Paragraph({ children: [new TextRun({ ...l, size: 18 })] }))
      : [new Paragraph("")],
  });

/** Word (.docx): landscape page with the grid, then hours (if included) and events. */
export async function toDocx(data: ExportData): Promise<Buffer> {
  const grid = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Shift"), ...data.days.map((d) => headerCell(d.short))] }),
      ...data.rows.map(
        (row) =>
          new TableRow({
            children: [
              textCell([{ text: row.label, bold: true }]),
              ...row.cells.map((cell) => {
                if (!cell) return textCell([]);
                const missing = cell.required - cell.people.length;
                return textCell([
                  ...(cell.eventTitle ? [{ text: cell.eventTitle, italics: true, color: "5B21B6" }] : []),
                  ...cell.people.map((p) => ({ text: p })),
                  ...(missing > 0 ? [{ text: `${missing} needed`, bold: true, color: "B91C1C" }] : []),
                ]);
              }),
            ],
          }),
      ),
    ],
  });

  const hours =
    data.hours &&
    new Table({
      width: { size: 50, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: [headerCell("Name"), headerCell("Shifts"), headerCell("Hours")] }),
        ...data.hours.map(
          (h) => new TableRow({ children: [textCell([{ text: h.name }]), textCell([{ text: String(h.shifts) }]), textCell([{ text: fmtHours(h.hours) }])] }),
        ),
      ],
    });

  const doc = new Document({
    creator: "TeamVory",
    title: `${data.businessName} schedule, ${data.week}`,
    styles: { default: { document: { run: { font: "Calibri" } } } },
    sections: [
      {
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: `${data.businessName} · ${data.week}`, color: NAVY })] }),
          new Paragraph({ children: [new TextRun({ text: data.status, italics: true, color: "64748B" })] }),
          new Paragraph(""),
          grid,
          ...(hours
            ? [
                new Paragraph(""),
                new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Hours this week", color: NAVY })] }),
                hours,
              ]
            : []),
          ...(data.events.length
            ? [
                new Paragraph(""),
                new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Events", color: NAVY })] }),
                ...data.events.map(
                  (e) =>
                    new Paragraph({
                      children: [new TextRun({ text: `${e.day}: `, bold: true }), new TextRun(`${e.title}, ${e.time}${e.location ? `, ${e.location}` : ""}`)],
                    }),
                ),
              ]
            : []),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Made with TeamVory", size: 16, color: "94A3B8" })] }),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

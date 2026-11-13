import "server-only";
import ExcelJS from "exceljs";
import { cellText, type ExportData } from "@/lib/exports/data";

const NAVY = "FF0B1F44";
const MINT = "FFE6FFFA";

/** Excel: a "Schedule" sheet laid out like the grid, plus "Hours" (if included) and "Events". */
export async function toXlsx(data: ExportData): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  book.creator = "TeamVory";

  const sheet = book.addWorksheet("Schedule", { pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 } });
  sheet.addRow([`${data.businessName} · ${data.week}`]).font = { bold: true, size: 14, color: { argb: NAVY } };
  sheet.addRow([data.status]).font = { italic: true, color: { argb: "FF64748B" } };
  sheet.addRow([]);
  const header = sheet.addRow(["Shift", ...data.days.map((d) => d.short)]);
  header.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  });
  for (const row of data.rows) {
    const r = sheet.addRow([row.label, ...row.cells.map(cellText)]);
    r.alignment = { wrapText: true, vertical: "top" };
    r.getCell(1).font = { bold: true };
    row.cells.forEach((cell, i) => {
      if (cell && cell.people.length < cell.required) r.getCell(i + 2).font = { color: { argb: "FFB91C1C" } };
    });
  }
  sheet.columns = [{ width: 16 }, ...data.days.map(() => ({ width: 18 }))];

  if (data.hours) {
    const hours = book.addWorksheet("Hours");
    hours.addRow(["Name", "Shifts", "Hours"]).font = { bold: true };
    for (const h of data.hours) hours.addRow([h.name, h.shifts, h.hours]);
    hours.columns = [{ width: 24 }, { width: 10 }, { width: 10 }];
    hours.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: MINT } };
  }

  if (data.events.length) {
    const events = book.addWorksheet("Events");
    events.addRow(["Day", "Event", "Time", "Location"]).font = { bold: true };
    for (const e of data.events) events.addRow([e.day, e.title, e.time, e.location ?? ""]);
    events.columns = [{ width: 14 }, { width: 28 }, { width: 18 }, { width: 24 }];
  }

  return Buffer.from(await book.xlsx.writeBuffer());
}

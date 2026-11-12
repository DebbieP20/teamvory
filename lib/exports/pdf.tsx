import "server-only";
import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { type ExportData, fmtHours } from "@/lib/exports/data";

// PDF with the built-in Helvetica (no font files needed), landscape, one page for a usual week.

const NAVY = "#0B1F44";
const s = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica", color: NAVY },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  status: { color: "#64748B", marginTop: 2, marginBottom: 12 },
  row: { flexDirection: "row" },
  head: { backgroundColor: NAVY, color: "#FFFFFF", fontFamily: "Helvetica-Bold" },
  label: { width: 70, padding: 4, fontFamily: "Helvetica-Bold", borderBottom: "1 solid #E2E8F0" },
  cell: { flex: 1, padding: 4, borderBottom: "1 solid #E2E8F0", borderLeft: "1 solid #E2E8F0", minHeight: 34 },
  missing: { color: "#B91C1C", fontFamily: "Helvetica-Bold" },
  event: { color: "#5B21B6", fontFamily: "Helvetica-Oblique" },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 6 },
  footer: { position: "absolute", bottom: 16, right: 28, color: "#94A3B8", fontSize: 8 },
});

function SchedulePdf({ data }: { data: ExportData }) {
  return (
    <Document title={`${data.businessName} schedule, ${data.week}`} author="TeamVory">
      <Page size="LETTER" orientation="landscape" style={s.page}>
        <Text style={s.title}>
          {data.businessName} · {data.week}
        </Text>
        <Text style={s.status}>{data.status}</Text>

        <View style={[s.row, s.head]}>
          <Text style={[s.label, { borderBottom: 0 }]}>Shift</Text>
          {data.days.map((d) => (
            <Text key={d.date} style={[s.cell, { minHeight: 0, borderLeft: "1 solid #1E3A6B", borderBottom: 0 }]}>
              {d.short}
            </Text>
          ))}
        </View>
        {data.rows.map((row) => (
          <View key={row.label} style={s.row} wrap={false}>
            <Text style={s.label}>{row.label}</Text>
            {row.cells.map((cell, i) => (
              <View key={i} style={s.cell}>
                {cell?.eventTitle && <Text style={s.event}>{cell.eventTitle}</Text>}
                {cell?.people.map((p) => <Text key={p}>{p}</Text>)}
                {cell && cell.people.length < cell.required && <Text style={s.missing}>{cell.required - cell.people.length} needed</Text>}
              </View>
            ))}
          </View>
        ))}

        <View style={s.row}>
          <View style={{ width: "45%" }}>
            <Text style={s.h2}>Hours this week</Text>
            {data.hours.map((h) => (
              <View key={h.name} style={[s.row, { borderBottom: "1 solid #E2E8F0", paddingVertical: 2 }]}>
                <Text style={{ flex: 1 }}>{h.name}</Text>
                <Text style={{ width: 60 }}>
                  {h.shifts} shift{h.shifts === 1 ? "" : "s"}
                </Text>
                <Text style={{ width: 40, textAlign: "right" }}>{fmtHours(h.hours)} h</Text>
              </View>
            ))}
          </View>
          {data.events.length > 0 && (
            <View style={{ width: "45%", marginLeft: "10%" }}>
              <Text style={s.h2}>Events</Text>
              {data.events.map((e) => (
                <Text key={`${e.day}-${e.title}`} style={{ marginBottom: 2 }}>
                  {e.day}: {e.title}, {e.time}
                  {e.location ? `, ${e.location}` : ""}
                </Text>
              ))}
            </View>
          )}
        </View>
        <Text style={s.footer} fixed>
          Made with TeamVory
        </Text>
      </Page>
    </Document>
  );
}

export async function toPdf(data: ExportData): Promise<Buffer> {
  return renderToBuffer(<SchedulePdf data={data} />);
}

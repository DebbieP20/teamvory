"use client";

import { DownloadIcon, FileImageIcon, FileSpreadsheetIcon, FileTextIcon } from "lucide-react";
import { useId, useState } from "react";

const DOWNLOADS = [
  { format: "pdf", label: "PDF", help: "To print or send", Icon: FileTextIcon },
  { format: "png", label: "PNG image", help: "For a group chat", Icon: FileImageIcon },
  { format: "jpg", label: "JPG image", help: "Smaller image", Icon: FileImageIcon },
  { format: "docx", label: "Word", help: "To edit or print", Icon: FileTextIcon },
  { format: "xlsx", label: "Excel", help: "Schedule, hours and events sheets", Icon: FileSpreadsheetIcon },
] as const;

/**
 * The five download links. "Include hours" (on by default) can be turned off to share
 * the schedule and events without everyone's hours.
 */
export function Downloads({ monday }: { monday: string }) {
  const [withHours, setWithHours] = useState(true);
  const id = useId();
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-white px-4 py-3">
        <label htmlFor={`${id}-hours`} className="flex items-start gap-3">
          <input
            id={`${id}-hours`}
            type="checkbox"
            checked={withHours}
            onChange={(e) => setWithHours(e.target.checked)}
            className="mt-0.5 size-5 accent-teal-600"
          />
          <span>
            <span className="block font-medium">Include hours this week</span>
            <span className="block text-xs text-muted-foreground">
              {withHours ? "Each person's hours and shifts are in the file." : "Only the schedule and events. Good for sharing with the team."}
            </span>
          </span>
        </label>
      </div>
      <ul className="space-y-2">
        {DOWNLOADS.map(({ format, label, help, Icon }) => (
          <li key={format}>
            <a
              href={`/api/exports/${format}?week=${monday}${withHours ? "" : "&hours=0"}`}
              download
              className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 hover:border-teal"
            >
              <Icon className="size-5 shrink-0 text-teal-dark" aria-hidden />
              <span className="flex-1">
                <span className="block font-semibold">{label}</span>
                <span className="block text-xs text-muted-foreground">
                  {format === "xlsx" && !withHours ? "Schedule and events sheets" : help}
                </span>
              </span>
              <DownloadIcon className="size-4 text-muted-foreground" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { PinIcon, PlusIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { FormMessage } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { formatDay, formatTime, WEEKDAYS_SHORT } from "@/lib/dates";
import { idleState } from "@/lib/form-state";
import { shortName } from "@/lib/schedule";
import { assignPerson, removeAssignment, togglePin } from "@/lib/schedule-actions";
import { cn } from "@/lib/utils";

export type Candidate = {
  membershipId: string;
  name: string;
  isOwner: boolean;
  hours: number;
  status: "available" | "unavailable" | "blocked";
  reason: string | null;
};

export type GridShift = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  requiredCount: number;
  label: string;
  assigned: { id: string; membershipId: string; name: string; isOwner: boolean; pinned: boolean; override: boolean; conflict: boolean }[];
  candidates: Candidate[];
};

/** The weekly grid by shift (rows = shift times, columns = days), as in wireframe 1. */
export function ScheduleGrid({
  days,
  rows,
  shifts,
}: {
  days: string[];
  rows: { startTime: string; endTime: string }[];
  shifts: GridShift[];
}) {
  const [openShift, setOpenShift] = useState<GridShift | null>(null);

  return (
    <div className="min-w-0 space-y-2">
      {/* Phones: one list per day, so names fit. */}
      <ol className="space-y-3 md:hidden">
        {days.map((date) => {
          const dayShifts = shifts.filter((s) => s.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
          return (
            <li key={date} className="rounded-xl border bg-white p-3">
              <h3 className="text-base">{formatDay(date)}</h3>
              {dayShifts.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">No shifts</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {dayShifts.map((shift) => (
                    <li key={shift.id}>
                      <ShiftCell shift={shift} onAssign={() => setOpenShift(shift)} heading={`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      <div className="hidden overflow-x-auto rounded-xl border bg-white md:block">
        <table className="w-full min-w-[820px] table-fixed border-separate border-spacing-1.5 text-sm">
          <caption className="sr-only">Schedule by shift</caption>
          <thead>
            <tr>
              <th scope="col" className="w-24" />
              {days.map((d, i) => (
                <th key={d} scope="col" className="px-1 text-left font-semibold">
                  {WEEKDAYS_SHORT[i]} <span className="font-normal text-muted-foreground">{d.slice(8).replace(/^0/, "")}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.startTime}-${row.endTime}`}>
                <th scope="row" className="align-top text-left text-xs font-semibold">
                  {formatTime(row.startTime)} – {formatTime(row.endTime)}
                </th>
                {days.map((date) => {
                  const shift = shifts.find((s) => s.date === date && s.startTime === row.startTime && s.endTime === row.endTime);
                  if (!shift) return <td key={date} className="rounded-lg bg-slate-50" aria-label="No shift" />;
                  return (
                    <td key={date} className="h-28 p-0 align-top">
                      <ShiftCell shift={shift} onAssign={() => setOpenShift(shift)} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="rounded bg-violet-100 px-1 text-violet-800">Owner</span> · <PinIcon className="inline size-3" aria-hidden /> pinned:
        kept when the auto-scheduler regenerates · <span className="font-semibold text-amber-700">agreed</span>: added though marked not
        available
      </p>
      {openShift && (
        <AssignDialog
          key={openShift.id}
          shift={shifts.find((s) => s.id === openShift.id) ?? openShift}
          onClose={() => setOpenShift(null)}
        />
      )}
    </div>
  );
}

/** One shift: how many are on it, their chips, and the Assign button. */
function ShiftCell({ shift, onAssign, heading }: { shift: GridShift; onAssign: () => void; heading?: string }) {
  const short = shift.assigned.length < shift.requiredCount;
  // More people than the shift needs, e.g. after lowering the number in Shift setup.
  const extra = shift.assigned.length - shift.requiredCount;
  const problem = short || extra > 0;
  return (
    <div className={cn("h-full rounded-lg border p-1.5", problem ? "border-red-200 bg-red-50" : "bg-slate-50")}>
      <div className={cn("mb-1 flex justify-between gap-2 text-xs", problem ? "font-semibold text-destructive" : "text-muted-foreground")}>
        <span>
          {heading && <span className="mr-2 text-sm font-semibold text-navy">{heading}</span>}
          {shift.assigned.length}/{shift.requiredCount}
        </span>
        {short && <span>needs {shift.requiredCount - shift.assigned.length}</span>}
        {extra > 0 && <span>remove {extra}</span>}
      </div>
      <ul className="space-y-1">
        {shift.assigned.map((a) => (
          <AssignedChip key={a.id} assignment={a} shiftLabel={shift.label} />
        ))}
      </ul>
      {short && (
        <button
          type="button"
          onClick={onAssign}
          aria-label={`Assign: ${shift.label}`}
          className="mt-1 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-slate-400 py-1 text-xs text-muted-foreground hover:border-teal-dark hover:text-teal-dark"
        >
          <PlusIcon className="size-3" aria-hidden /> Assign
        </button>
      )}
    </div>
  );
}

function AssignedChip({ assignment: a, shiftLabel }: { assignment: GridShift["assigned"][number]; shiftLabel: string }) {
  return (
    <li
      className={cn(
        "flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs",
        a.isOwner ? "border-violet-200 bg-violet-100 text-violet-900" : "bg-white",
        a.conflict && "border-amber-400",
      )}
    >
      <span className="min-w-0 flex-1 truncate" title={a.isOwner ? `${a.name} (owner)` : a.name}>
        {shortName(a.name)}
      </span>
      {a.override && <span className="text-[10px] font-semibold text-amber-700 uppercase">agreed</span>}
      {a.conflict && <TriangleAlertIcon className="size-3 shrink-0 text-amber-600" aria-label="No longer available" />}
      <form action={togglePin}>
        <input type="hidden" name="assignmentId" value={a.id} />
        <IconSubmit label={`${a.pinned ? "Unpin" : "Pin"}: ${a.name}, ${shiftLabel}`} pressed={a.pinned}>
          <PinIcon className={cn("size-3", a.pinned ? "fill-current text-navy" : "text-slate-400")} />
        </IconSubmit>
      </form>
      <form action={removeAssignment}>
        <input type="hidden" name="assignmentId" value={a.id} />
        <IconSubmit label={`Remove: ${a.name}, ${shiftLabel}`}>
          <XIcon className="size-3 text-slate-500" />
        </IconSubmit>
      </form>
    </li>
  );
}

function IconSubmit({ label, pressed, children }: { label: string; pressed?: boolean; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-label={label}
      aria-pressed={pressed}
      disabled={pending}
      className="grid size-5 place-items-center rounded hover:bg-slate-100 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Pick someone for a shift. People marked not available need an explicit "we agreed" (decision 20). */
function AssignDialog({ shift, onClose }: { shift: GridShift; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [state, action, pending] = useActionState(assignPerson, idleState);

  // Close once someone is added (adjusting state during render).
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.status === "success") onClose();
  }

  return (
    <dialog
      ref={(el) => {
        ref.current = el;
        if (el && !el.open) el.showModal();
      }}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="assign-title"
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl p-0 shadow-xl backdrop:bg-navy/40"
    >
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="assign-title" className="text-lg">
              Assign · {formatDay(shift.date)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {formatTime(shift.startTime)} – {formatTime(shift.endTime)} · {shift.assigned.length}/{shift.requiredCount} assigned
            </p>
          </div>
          <Button variant="ghost" size="icon-lg" onClick={onClose} aria-label="Close">
            <XIcon />
          </Button>
        </div>
        <FormMessage state={state} />

        {shift.candidates.length === 0 ? (
          <p className="text-muted-foreground">Everyone who can be scheduled is already on this shift.</p>
        ) : (
          <ul className="max-h-[60vh] space-y-1.5 overflow-y-auto">
            {shift.candidates.map((c) => {
              const hours = `${Number.isInteger(c.hours) ? c.hours : c.hours.toFixed(2)} h this week`;
              if (confirming === c.membershipId) {
                return (
                  <li key={c.membershipId} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                    <p>
                      <strong>{c.name}</strong> isn&apos;t available ({c.reason}). Only add them if you&apos;ve talked and agreed. The
                      shift will be tagged <strong>agreed</strong>.
                    </p>
                    <form action={action} className="mt-2 flex gap-2">
                      <input type="hidden" name="shiftId" value={shift.id} />
                      <input type="hidden" name="membershipId" value={c.membershipId} />
                      <input type="hidden" name="override" value="yes" />
                      <Button type="submit" size="lg" disabled={pending} className="bg-navy font-semibold text-white hover:bg-navy/90">
                        We agreed, assign
                      </Button>
                      <Button type="button" variant="outline" size="lg" onClick={() => setConfirming(null)}>
                        Cancel
                      </Button>
                    </form>
                  </li>
                );
              }
              const content = (
                <>
                  <span className="font-medium">
                    {c.name}
                    {c.isOwner && <span className="font-normal text-muted-foreground"> (owner)</span>}
                  </span>
                  <span className={cn("text-xs", c.status === "available" ? "text-muted-foreground" : "text-amber-700")}>
                    {c.status === "available" ? hours : `${c.status === "unavailable" ? "⚠ " : ""}${c.reason}`}
                  </span>
                </>
              );
              const rowClass =
                "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm";
              if (c.status === "blocked") {
                return (
                  <li key={c.membershipId} className={cn(rowClass, "cursor-not-allowed bg-slate-50 opacity-60")}>
                    {content}
                  </li>
                );
              }
              if (c.status === "unavailable") {
                return (
                  <li key={c.membershipId}>
                    <button
                      type="button"
                      onClick={() => setConfirming(c.membershipId)}
                      className={cn(rowClass, "bg-slate-50 hover:border-amber-300")}
                      aria-label={`${c.name}: ${c.reason}`}
                    >
                      {content}
                    </button>
                  </li>
                );
              }
              return (
                <li key={c.membershipId}>
                  <form action={action}>
                    <input type="hidden" name="shiftId" value={shift.id} />
                    <input type="hidden" name="membershipId" value={c.membershipId} />
                    <button
                      type="submit"
                      disabled={pending}
                      className={cn(rowClass, "bg-white hover:border-teal-dark hover:bg-mint disabled:opacity-60")}
                      aria-label={`Assign ${c.name}`}
                    >
                      {content}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </dialog>
  );
}

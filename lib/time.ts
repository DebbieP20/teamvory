// Shift times are stored as local wall-clock "HH:mm" strings in the business's
// time zone (see docs/architecture.md, decision 3). Hours are always calculated
// from them, never stored.

/** Minutes since midnight for a "HH:mm" time, e.g. "17:30" → 1050. */
export function toMinutes(time: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) throw new Error(`Invalid time "${time}", expected HH:mm`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Length of a shift in hours. Shifts never cross midnight. */
export function shiftHours(start: string, end: string): number {
  const minutes = toMinutes(end) - toMinutes(start);
  if (minutes <= 0) throw new Error(`Shift must end after it starts (${start}–${end})`);
  return minutes / 60;
}

"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { type DaySetting, editableWeeks, isWeekLocked, validateDay } from "@/lib/availability";
import { authorizeAvailability, getBusinessSettings, today } from "@/lib/availability-data";
import { addDays, daysBetween, formatDay, formatWeek, fromDbDate, type IsoDate, toDbDate, weekStart } from "@/lib/dates";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { errorState, type FormState } from "@/lib/form-state";
import { requireManager } from "@/lib/session";

const NOT_ALLOWED = "You can't change this person's availability.";
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Reads one day's choice from a form: `${prefix}kind`, `${prefix}start`, `${prefix}end`. */
function readDay(formData: FormData, prefix = ""): DaySetting {
  const kind = String(formData.get(`${prefix}kind`) ?? "OFF");
  if (kind === "ALL_DAY") return { kind: "ALL_DAY", startTime: null, endTime: null };
  if (kind === "CUSTOM") {
    return { kind: "CUSTOM", startTime: String(formData.get(`${prefix}start`) ?? ""), endTime: String(formData.get(`${prefix}end`) ?? "") };
  }
  return { kind: "OFF", startTime: null, endTime: null };
}

function lockedMessage(monday: IsoDate) {
  return `The availability deadline for the week of ${formatWeek(monday)} has passed. Ask your manager to change it.`;
}

// --- Default week ------------------------------------------------------------

export async function saveDefaultWeek(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await authorizeAvailability(String(formData.get("membershipId")));
  if (!access) return errorState(NOT_ALLOWED);

  const days = Array.from({ length: 7 }, (_, i) => readDay(formData, `d${i + 1}-`));
  const fieldErrors: Record<string, string> = {};
  days.forEach((d, i) => {
    const error = validateDay(d);
    if (error) fieldErrors[`d${i + 1}`] = error;
  });
  if (Object.keys(fieldErrors).length) return errorState("Please fix the highlighted days.", fieldErrors);

  await db.$transaction(
    days.map((d, i) =>
      db.availabilityTemplate.upsert({
        where: { membershipId_dayOfWeek: { membershipId: access.target.id, dayOfWeek: i + 1 } },
        create: { membershipId: access.target.id, dayOfWeek: i + 1, ...d },
        update: d,
      }),
    ),
  );
  refresh();
  return { status: "success", message: "Default week saved." };
}

// --- One-week changes ----------------------------------------------------------

async function checkWeekChange(membershipId: string, date: string) {
  const access = await authorizeAvailability(membershipId);
  if (!access) return { error: NOT_ALLOWED } as const;
  if (!isoDate.safeParse(date).success) return { error: "That date isn't valid." } as const;

  const now = today(access.settings);
  const { thisWeek, nextWeek } = editableWeeks(now.date);
  const monday = weekStart(date);
  if (monday !== thisWeek && monday !== nextWeek) {
    return { error: "You can only change this week and next week. Use your default week for later weeks." } as const;
  }
  if (access.deadlineApplies && isWeekLocked(monday, access.settings.deadline, now)) {
    return { error: lockedMessage(monday) } as const;
  }
  return { access } as const;
}

export async function saveDayChange(_prev: FormState, formData: FormData): Promise<FormState> {
  const date = String(formData.get("date"));
  const check = await checkWeekChange(String(formData.get("membershipId")), date);
  if ("error" in check) return errorState(check.error);

  const day = readDay(formData);
  const error = validateDay(day);
  if (error) return errorState(error);

  const membershipId = check.access.target.id;
  await db.availabilityOverride.upsert({
    where: { membershipId_date: { membershipId, date: toDbDate(date) } },
    create: { membershipId, date: toDbDate(date), enteredById: check.access.actor.id, ...day },
    update: { enteredById: check.access.actor.id, ...day },
  });
  refresh();
  return { status: "success", message: `Saved for ${formatDay(date)}.` };
}

export async function resetDayChange(_prev: FormState, formData: FormData): Promise<FormState> {
  const date = String(formData.get("date"));
  const check = await checkWeekChange(String(formData.get("membershipId")), date);
  if ("error" in check) return errorState(check.error);

  await db.availabilityOverride.deleteMany({ where: { membershipId: check.access.target.id, date: toDbDate(date) } });
  refresh();
  return { status: "success", message: `${formatDay(date)} is back to the default.` };
}

// --- Time off ----------------------------------------------------------------

const timeOffSchema = z
  .object({
    startDate: z.string(),
    endDate: z.string(),
    note: z.string().trim().max(200, "Please keep the note under 200 characters."),
  })
  .superRefine((v, ctx) => {
    const startOk = isoDate.safeParse(v.startDate).success;
    const endOk = isoDate.safeParse(v.endDate).success;
    if (!startOk) ctx.addIssue({ code: "custom", path: ["startDate"], message: "Choose the first day." });
    if (!endOk) ctx.addIssue({ code: "custom", path: ["endDate"], message: "Choose the last day." });
    if (startOk && endOk && v.endDate < v.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "The last day can't be before the first day." });
    }
  });

export async function addTimeOff(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await authorizeAvailability(String(formData.get("membershipId")));
  if (!access) return errorState(NOT_ALLOWED);

  const values = {
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    note: String(formData.get("note") ?? ""),
  };
  const parsed = timeOffSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return errorState(undefined, fieldErrors, values);
  }
  const { startDate, endDate } = parsed.data;

  const now = today(access.settings);
  if (startDate < now.date) return errorState(undefined, { startDate: "Time off can't start in the past." }, values);
  if (daysBetween(startDate, endDate) > 90) return errorState(undefined, { endDate: "Time off can be at most 3 months at once." }, values);

  // After the deadline, employees can't add time off to that week themselves (decision 29).
  if (access.deadlineApplies) {
    for (let monday = weekStart(startDate); monday <= endDate; monday = addDays(monday, 7)) {
      if (isWeekLocked(monday, access.settings.deadline, now)) return errorState(lockedMessage(monday), undefined, values);
    }
  }

  const needsApproval = access.settings.timeOffApprovalRequired && !access.actorIsManager;
  await db.timeOff.create({
    data: {
      membershipId: access.target.id,
      startDate: toDbDate(startDate),
      endDate: toDbDate(endDate),
      note: parsed.data.note || null,
      status: needsApproval ? "PENDING" : "APPROVED",
      enteredById: access.actor.id,
    },
  });
  refresh();
  return {
    status: "success",
    message: needsApproval ? "Time off requested. Your manager will approve or decline it." : "Time off added.",
  };
}

export async function removeTimeOff(formData: FormData) {
  const timeOff = await db.timeOff.findUnique({ where: { id: String(formData.get("timeOffId")) } });
  if (!timeOff) return;
  const access = await authorizeAvailability(timeOff.membershipId);
  if (!access) return;

  // Employees can withdraw their own time off, but not change the past or a locked week.
  if (access.deadlineApplies) {
    const now = today(access.settings);
    const start = fromDbDate(timeOff.startDate);
    if (start < now.date || isWeekLocked(weekStart(start), access.settings.deadline, now)) return;
  }
  await db.timeOff.delete({ where: { id: timeOff.id } });
  refresh();
}

/** Approve or decline a pending request (only when the business requires approval). */
export async function reviewTimeOff(formData: FormData) {
  const { membership } = await requireManager();
  const decision = formData.get("decision") === "APPROVED" ? "APPROVED" : "DECLINED";
  const timeOff = await db.timeOff.findFirst({
    where: { id: String(formData.get("timeOffId")), status: "PENDING", membership: { businessId: membership.businessId } },
    include: { membership: { include: { user: { select: { name: true, email: true } } } } },
  });
  if (!timeOff) return;

  await db.timeOff.update({
    where: { id: timeOff.id },
    data: { status: decision, reviewedById: membership.id, reviewedAt: new Date() },
  });

  const start = fromDbDate(timeOff.startDate);
  const end = fromDbDate(timeOff.endDate);
  const dates = start === end ? formatDay(start) : `${formatDay(start)} to ${formatDay(end)}`;
  await sendEmail({
    to: timeOff.membership.user.email,
    subject: `Your time off was ${decision === "APPROVED" ? "approved" : "declined"}`,
    text:
      `Hi ${timeOff.membership.user.name},\n\n` +
      `Your time off for ${dates} at ${membership.businessName} was ${decision === "APPROVED" ? "approved" : "declined"}.` +
      (decision === "DECLINED" ? "\n\nIf you have questions, talk to your manager." : ""),
  });
  refresh();
}

// --- Business settings (owner only) -------------------------------------------

const settingsSchema = z.object({
  deadlineEnabled: z.boolean(),
  deadlineDay: z.coerce.number().int().min(1).max(7),
  deadlineTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timeOffApprovalRequired: z.boolean(),
});

export async function saveAvailabilitySettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const { membership } = await requireManager();
  if (membership.role !== "OWNER") return errorState("Only the owner can change these settings.");

  const parsed = settingsSchema.safeParse({
    deadlineEnabled: formData.get("deadlineEnabled") === "on",
    deadlineDay: formData.get("deadlineDay"),
    deadlineTime: formData.get("deadlineTime"),
    timeOffApprovalRequired: formData.get("timeOffApprovalRequired") === "on",
  });
  if (!parsed.success) return errorState("Please check the settings.");

  const before = await getBusinessSettings(membership.businessId);
  await db.$transaction([
    db.business.update({
      where: { id: membership.businessId },
      data: {
        availabilityDeadlineEnabled: parsed.data.deadlineEnabled,
        availabilityDeadlineDay: parsed.data.deadlineDay,
        availabilityDeadlineTime: parsed.data.deadlineTime,
        timeOffApprovalRequired: parsed.data.timeOffApprovalRequired,
      },
    }),
    // Turning approval off approves anything still waiting (decision 30).
    ...(before.timeOffApprovalRequired && !parsed.data.timeOffApprovalRequired
      ? [
          db.timeOff.updateMany({
            where: { status: "PENDING", membership: { businessId: membership.businessId } },
            data: { status: "APPROVED", reviewedById: membership.id, reviewedAt: new Date() },
          }),
        ]
      : []),
  ]);
  refresh();
  return { status: "success", message: "Settings saved." };
}

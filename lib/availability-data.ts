import "server-only";
import { type DaySetting, type DeadlineSettings, type TimeOffEntry } from "@/lib/availability";
import { addDays, fromDbDate, type IsoDate, nowInZone, toDbDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { isManagerRole } from "@/lib/permissions";
import type { ReminderSettings } from "@/lib/reminders";
import { getMembership, requireUser } from "@/lib/session";

export type BusinessSettings = {
  id: string;
  name: string;
  timezone: string;
  deadline: DeadlineSettings;
  timeOffApprovalRequired: boolean;
  reminders: ReminderSettings;
  swapApprovalMode: "AUTOMATIC" | "MANAGER_APPROVAL";
};

export async function getBusinessSettings(businessId: string): Promise<BusinessSettings> {
  const b = await db.business.findUniqueOrThrow({ where: { id: businessId } });
  return {
    id: b.id,
    name: b.name,
    timezone: b.timezone,
    deadline: { enabled: b.availabilityDeadlineEnabled, day: b.availabilityDeadlineDay, time: b.availabilityDeadlineTime },
    timeOffApprovalRequired: b.timeOffApprovalRequired,
    reminders: {
      enabled: b.reminderEnabled,
      startDay: b.reminderStartDay,
      days: b.reminderDays,
      includeDefaultOnly: b.reminderIncludeDefaultOnly,
    },
    swapApprovalMode: b.swapApprovalMode,
  };
}

export const today = (settings: BusinessSettings) => nowInZone(settings.timezone);

/**
 * Who may change `targetMembershipId`'s availability: the person themselves,
 * or an owner/manager of the same business (docs/permissions.md).
 * Returns null when not allowed, so callers can't act on another business's data.
 */
export async function authorizeAvailability(targetMembershipId: string) {
  const user = await requireUser();
  const actor = await getMembership(user.id);
  if (!actor || actor.status !== "ACTIVE") return null;

  const target = await db.membership.findFirst({
    where: { id: targetMembershipId, businessId: actor.businessId, status: "ACTIVE" },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!target) return null;

  const isSelf = target.id === actor.id;
  const actorIsManager = isManagerRole(actor.role);
  if (!isSelf && !actorIsManager) return null;

  const settings = await getBusinessSettings(actor.businessId);
  return {
    actor,
    target: { id: target.id, name: target.user.name, email: target.user.email, role: target.role },
    isSelf,
    actorIsManager,
    settings,
    /** The deadline only restricts employees changing their own availability. */
    deadlineApplies: !actorIsManager,
  };
}

export async function loadTemplate(membershipId: string): Promise<Map<number, DaySetting>> {
  const rows = await db.availabilityTemplate.findMany({ where: { membershipId } });
  return new Map(rows.map((r) => [r.dayOfWeek, { kind: r.kind, startTime: r.startTime, endTime: r.endTime }]));
}

export type PersonWeek = { template: Map<number, DaySetting>; overrides: Map<IsoDate, DaySetting>; timeOff: TimeOffEntry[] };

/** Changes and time off for several people over one week, for the overview and week pages. */
export async function loadWeek(membershipIds: string[], monday: IsoDate) {
  const sunday = addDays(monday, 6);
  const [templates, overrides, timeOff] = await Promise.all([
    db.availabilityTemplate.findMany({ where: { membershipId: { in: membershipIds } } }),
    db.availabilityOverride.findMany({
      where: { membershipId: { in: membershipIds }, date: { gte: toDbDate(monday), lte: toDbDate(sunday) } },
    }),
    db.timeOff.findMany({
      where: {
        membershipId: { in: membershipIds },
        startDate: { lte: toDbDate(sunday) },
        endDate: { gte: toDbDate(monday) },
      },
    }),
  ]);

  const byPerson = new Map<string, PersonWeek>(
    membershipIds.map((id) => [id, { template: new Map(), overrides: new Map(), timeOff: [] }]),
  );
  for (const t of templates) byPerson.get(t.membershipId)?.template.set(t.dayOfWeek, t);
  for (const o of overrides) byPerson.get(o.membershipId)?.overrides.set(fromDbDate(o.date), o);
  for (const t of timeOff) {
    byPerson.get(t.membershipId)?.timeOff.push({ startDate: fromDbDate(t.startDate), endDate: fromDbDate(t.endDate), status: t.status });
  }
  return byPerson;
}

"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorState, type FormState } from "@/lib/form-state";
import { notify, type OutgoingNotification } from "@/lib/notifications";
import { isRateLimited } from "@/lib/rate-limit";
import { describeShift } from "@/lib/schedule";
import type { SnapshotShift } from "@/lib/publish";
import { findShift, type PublishedWeek, publishedWeeks } from "@/lib/requests-data";
import { requireEmployee, requireManager } from "@/lib/session";
import { applyMoves, isUpcoming, type Move, pickUpProblem, swapProblem } from "@/lib/swaps";
import { appUrl } from "@/lib/urls";

// Swaps and open shifts (technical plan, section 6). Every action re-checks the rules
// against the published schedule as it is now, so nothing goes through on stale data.

const uuid = z.uuid();
const noteOf = (formData: FormData) => String(formData.get("note") ?? "").trim().slice(0, 200) || null;

class RequestProblem extends Error {}

const HOUR = 60 * 60 * 1000;
const TOO_MANY = "You've sent a lot of requests in the last hour. Please try again later, or talk to your manager.";

type Person = { id: string; name: string; email: string; userId: string };

async function person(membershipId: string): Promise<Person> {
  const m = await db.membership.findUniqueOrThrow({ where: { id: membershipId }, include: { user: true } });
  return { id: m.id, name: m.user.name, email: m.user.email, userId: m.user.id };
}

async function managersOf(businessId: string): Promise<Person[]> {
  const ms = await db.membership.findMany({
    where: { businessId, status: "ACTIVE", role: { in: ["OWNER", "MANAGER"] } },
    include: { user: true },
  });
  return ms.map((m) => ({ id: m.id, name: m.user.name, email: m.user.email, userId: m.user.id }));
}

function email(businessId: string, to: Person, key: string, subject: string, body: string, link: string): OutgoingNotification {
  return {
    businessId,
    userId: to.userId,
    type: "shift-request",
    dedupeKey: `${key}:${to.id}`,
    to: to.email,
    subject,
    text: `Hi ${to.name.split(" ")[0]},\n\n${body}\n\n${appUrl()}${link}\n`,
  };
}

/** The week (this or next, published) holding `shiftId`, with the shift, or null. */
async function findPublished(businessId: string, shiftId: string) {
  if (!uuid.safeParse(shiftId).success) return null;
  const { now, weeks } = await publishedWeeks(businessId);
  for (const week of weeks) {
    const shift = findShift(week, shiftId);
    if (shift) return { now, week, shift };
  }
  return null;
}

async function settingsOf(businessId: string) {
  return db.business.findUniqueOrThrow({ where: { id: businessId }, select: { name: true, swapApprovalMode: true } });
}

// --- Completing a request ---------------------------------------------------------

/**
 * Applies the moves to the published schedule (a new version, so the change is on record)
 * and to the manager's draft, in one transaction. The request is claimed first, so two
 * people can never take the same open shift.
 */
async function complete(
  requestId: string,
  expected: ("OPEN" | "PENDING_APPROVAL")[],
  week: PublishedWeek,
  actorId: string,
  buildMoves: (shifts: SnapshotShift[]) => Move[],
  extra: { pickedUpById?: string } = {},
) {
  await db.$transaction(async (tx) => {
    const claimed = await tx.shiftRequest.updateMany({
      where: { id: requestId, status: { in: expected } },
      data: { status: "COMPLETED", resolvedById: actorId, resolvedAt: new Date(), ...extra },
    });
    if (claimed.count !== 1) throw new RequestProblem("Someone got there first, or this request was cancelled.");

    const published = await tx.schedule.findFirst({ where: { weekId: week.week.id, status: "PUBLISHED" } });
    if (!published || published.id !== week.published.id) throw new RequestProblem("The schedule was just updated. Please try again.");
    const moves = buildMoves(week.snapshot.shifts);

    await tx.schedule.update({ where: { id: published.id }, data: { status: "SUPERSEDED" } });
    await tx.schedule.create({
      data: {
        weekId: week.week.id,
        status: "PUBLISHED",
        version: published.version + 1,
        snapshot: applyMoves(week.snapshot, moves),
        publishedAt: new Date(),
        publishedById: actorId,
      },
    });

    // Keep the draft in step, so the manager's next publish doesn't undo it.
    const draft = await tx.schedule.findFirst({ where: { weekId: week.week.id, status: "DRAFT" } });
    if (!draft) return;
    for (const m of moves) {
      const already = await tx.assignment.findFirst({ where: { scheduleId: draft.id, shiftId: m.shiftId, membershipId: m.to.membershipId } });
      if (already) {
        await tx.assignment.deleteMany({ where: { scheduleId: draft.id, shiftId: m.shiftId, membershipId: m.from } });
      } else {
        await tx.assignment.updateMany({
          where: { scheduleId: draft.id, shiftId: m.shiftId, membershipId: m.from },
          data: { membershipId: m.to.membershipId, pinned: true, auto: false, covering: false, override: false },
        });
      }
    }
  });
}

async function attempt(fn: () => Promise<FormState>): Promise<FormState> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof RequestProblem) return errorState(e.message);
    // Only one published version per week: another change landed at the same moment.
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") return errorState("The schedule was just updated. Please try again.");
    throw e;
  }
}

// --- Employees ------------------------------------------------------------------

/** Post one of your shifts as open: anyone eligible can pick it up (you keep it until then). */
export async function postOpenShift(_prev: FormState, formData: FormData): Promise<FormState> {
  const { membership } = await requireEmployee();
  // Each post emails coworkers, so posting and cancelling over and over is capped.
  if (await isRateLimited(`open-shift:${membership.id}`, 10, HOUR)) return errorState(TOO_MANY);
  const found = await findPublished(membership.businessId, String(formData.get("shiftId")));
  if (!found || !found.shift.people.some((p) => p.membershipId === membership.id)) return errorState("That shift isn't yours any more.");
  if (!isUpcoming(found.shift, found.now)) return errorState("That shift has already started.");

  let request;
  try {
    request = await db.shiftRequest.create({
      data: { businessId: membership.businessId, weekId: found.week.week.id, type: "COVERAGE", requesterId: membership.id, shiftId: found.shift.shiftId, note: noteOf(formData) },
    });
  } catch {
    return errorState("You already have a request open for this shift.");
  }

  const [me, business] = await Promise.all([person(membership.id), settingsOf(membership.businessId)]);
  const label = describeShift(found.shift);
  const eligible = found.week.employees.filter((e) => e.id !== membership.id && !pickUpProblem(found.week.snapshot, found.shift, e.id, found.week.canWork));
  await notify(
    await Promise.all(
      eligible.map(async (e) =>
        email(
          membership.businessId,
          await person(e.id),
          `open-shift:${request.id}`,
          `Open shift: ${label}`,
          `${me.name} can't make ${label} at ${business.name}. The first person to pick it up gets it.${request.note ? `\n\n"${request.note}"` : ""}`,
          "/employee/shifts",
        ),
      ),
    ),
  );
  refresh();
  return { status: "success", message: `Posted. ${eligible.length ? `${eligible.length} ${eligible.length === 1 ? "person" : "people"} who can work it got an email.` : "Nobody else is available for it right now."} You still work it until someone picks it up.` };
}

/** Ask a coworker to trade: they take your shift, you take theirs. */
export async function requestSwap(_prev: FormState, formData: FormData): Promise<FormState> {
  const { membership } = await requireEmployee();
  if (await isRateLimited(`swap:${membership.id}`, 10, HOUR)) return errorState(TOO_MANY);
  const found = await findPublished(membership.businessId, String(formData.get("shiftId")));
  const [targetShiftId, targetMembershipId] = String(formData.get("target") ?? "").split(":");
  if (!found) return errorState("That shift isn't on the schedule any more.");
  const targetShift = findShift(found.week, targetShiftId);
  if (!targetShift || !uuid.safeParse(targetMembershipId).success) return errorState("Choose a shift to swap for.");
  if (!found.week.employees.some((e) => e.id === targetMembershipId)) return errorState("You can only swap with a coworker.");
  if (!isUpcoming(found.shift, found.now) || !isUpcoming(targetShift, found.now)) return errorState("One of those shifts has already started.");
  const problem = swapProblem(
    found.week.snapshot,
    { membershipId: membership.id, shift: found.shift },
    { membershipId: targetMembershipId, shift: targetShift },
    found.week.canWork,
  );
  if (problem) return errorState(`That swap doesn't work: ${problem}.`);

  let request;
  try {
    request = await db.shiftRequest.create({
      data: {
        businessId: membership.businessId,
        weekId: found.week.week.id,
        type: "SWAP",
        requesterId: membership.id,
        shiftId: found.shift.shiftId,
        targetMembershipId,
        targetShiftId: targetShift.shiftId,
        note: noteOf(formData),
      },
    });
  } catch {
    return errorState("You already have a request open for this shift.");
  }

  const [me, them] = await Promise.all([person(membership.id), person(targetMembershipId)]);
  await notify([
    email(
      membership.businessId,
      them,
      `swap-asked:${request.id}`,
      `${me.name} asks to swap shifts`,
      `${me.name} would like to swap:\n• You take ${describeShift(found.shift)}\n• ${me.name.split(" ")[0]} takes your ${describeShift(targetShift)}${request.note ? `\n\n"${request.note}"` : ""}\n\nAccept or decline here:`,
      "/employee/shifts",
    ),
  ]);
  refresh();
  return { status: "success", message: `Asked ${them.name}. You keep your shift unless they accept.` };
}

async function loadRequest(businessId: string, requestId: string) {
  if (!uuid.safeParse(requestId).success) return null;
  const request = await db.shiftRequest.findFirst({ where: { id: requestId, businessId } });
  if (!request) return null;
  const found = await findPublished(businessId, request.shiftId);
  return found ? { request, ...found } : { request, now: null, week: null, shift: null };
}

/** The coworker answers a swap request. */
export async function answerSwap(_prev: FormState, formData: FormData): Promise<FormState> {
  const { membership } = await requireEmployee();
  const loaded = await loadRequest(membership.businessId, String(formData.get("requestId")));
  if (!loaded || loaded.request.type !== "SWAP" || loaded.request.targetMembershipId !== membership.id || loaded.request.status !== "OPEN") {
    return errorState("This request isn't waiting for you any more.");
  }
  const { request } = loaded;
  const [requester, me] = await Promise.all([person(request.requesterId), person(membership.id)]);

  if (formData.get("answer") !== "accept") {
    await db.shiftRequest.updateMany({ where: { id: request.id, status: "OPEN" }, data: { status: "DECLINED", resolvedById: membership.id, resolvedAt: new Date() } });
    await notify([email(membership.businessId, requester, `swap-declined:${request.id}`, `${me.name} can't swap`, `${me.name} declined your swap request. You still work your shift.`, "/employee/shifts")]);
    refresh();
    return { status: "success", message: "Declined. Nothing changed." };
  }

  return attempt(async () => {
    const { week, shift, now } = loaded;
    const targetShift = week ? findShift(week, request.targetShiftId) : undefined;
    const problem =
      !week || !shift || !targetShift || !now
        ? "the schedule changed"
        : !isUpcoming(shift, now) || !isUpcoming(targetShift, now)
          ? "one of the shifts has started"
          : swapProblem(week.snapshot, { membershipId: request.requesterId, shift }, { membershipId: membership.id, shift: targetShift }, week.canWork);
    if (problem) {
      await db.shiftRequest.update({ where: { id: request.id }, data: { status: "CANCELLED", resolvedAt: new Date() } });
      refresh();
      return errorState(`This swap can't go ahead any more: ${problem}.`);
    }

    const business = await settingsOf(membership.businessId);
    const what = `${requester.name} takes ${describeShift(targetShift!)} and ${me.name} takes ${describeShift(shift!)}`;
    if (business.swapApprovalMode === "MANAGER_APPROVAL") {
      const moved = await db.shiftRequest.updateMany({ where: { id: request.id, status: "OPEN" }, data: { status: "PENDING_APPROVAL" } });
      if (!moved.count) return errorState("This request isn't waiting for you any more.");
      await notify([
        email(membership.businessId, requester, `swap-accepted:${request.id}`, `${me.name} accepted your swap`, `${me.name} accepted. It now waits for your manager's approval. Until then you both keep your own shifts.`, "/employee/shifts"),
        ...(await managersOf(membership.businessId)).map((m) =>
          email(membership.businessId, m, `swap-approval:${request.id}`, `Swap to approve: ${requester.name} and ${me.name}`, `${what}. Both agreed. Approve or decline it on your dashboard:`, "/manager"),
        ),
      ]);
      refresh();
      return { status: "success", message: "Accepted. It now waits for your manager's approval." };
    }

    await complete(request.id, ["OPEN"], week!, membership.id, () => [
      { shiftId: shift!.shiftId, from: request.requesterId, to: { membershipId: me.id, name: me.name } },
      { shiftId: targetShift!.shiftId, from: me.id, to: { membershipId: requester.id, name: requester.name } },
    ]);
    await notify([
      email(membership.businessId, requester, `swap-done:${request.id}`, `Swap done: you now work ${describeShift(targetShift!)}`, `${me.name} accepted your swap. You now work ${describeShift(targetShift!)} instead of ${describeShift(shift!)}.`, "/employee"),
      ...(await managersOf(membership.businessId)).map((m) =>
        email(membership.businessId, m, `swap-done:${request.id}`, `Swap done: ${requester.name} and ${me.name}`, `${what}. The schedule is updated.`, "/manager/schedule"),
      ),
    ]);
    refresh();
    return { status: "success", message: `Swapped. You now work ${describeShift(shift!)}.` };
  });
}

/** Pick up an open shift: first come, first served. */
export async function pickUpShift(_prev: FormState, formData: FormData): Promise<FormState> {
  const { membership } = await requireEmployee();
  const loaded = await loadRequest(membership.businessId, String(formData.get("requestId")));
  if (!loaded || loaded.request.type !== "COVERAGE" || loaded.request.status !== "OPEN") return errorState("Someone already picked this shift up.");
  const { request, week, shift, now } = loaded;
  if (!week || !shift || !now || !shift.people.some((p) => p.membershipId === request.requesterId)) return errorState("This shift changed. It's no longer open.");
  if (!isUpcoming(shift, now)) return errorState("This shift has already started.");
  const problem = pickUpProblem(week.snapshot, shift, membership.id, week.canWork);
  if (problem) return errorState(`You can't pick this up: you're ${problem}.`);

  return attempt(async () => {
    const [requester, me, business] = await Promise.all([person(request.requesterId), person(membership.id), settingsOf(membership.businessId)]);
    const label = describeShift(shift);
    if (business.swapApprovalMode === "MANAGER_APPROVAL") {
      const claimed = await db.shiftRequest.updateMany({ where: { id: request.id, status: "OPEN" }, data: { status: "PENDING_APPROVAL", pickedUpById: me.id } });
      if (!claimed.count) return errorState("Someone already picked this shift up.");
      await notify([
        email(membership.businessId, requester, `picked:${request.id}`, `${me.name} offered to take ${label}`, `${me.name} picked up your open shift. It waits for your manager's approval. Until then you still work it.`, "/employee/shifts"),
        ...(await managersOf(membership.businessId)).map((m) =>
          email(membership.businessId, m, `pickup-approval:${request.id}`, `To approve: ${me.name} takes ${requester.name}'s shift`, `${me.name} picked up ${requester.name}'s open shift, ${label}. Approve or decline it on your dashboard:`, "/manager"),
        ),
      ]);
      refresh();
      return { status: "success", message: "Picked up. It now waits for your manager's approval." };
    }

    await complete(request.id, ["OPEN"], week, me.id, () => [{ shiftId: shift.shiftId, from: requester.id, to: { membershipId: me.id, name: me.name } }], { pickedUpById: me.id });
    await notify([
      email(membership.businessId, requester, `picked:${request.id}`, `${me.name} took your shift: ${label}`, `${me.name} picked up your open shift. You're no longer working ${label}.`, "/employee"),
      ...(await managersOf(membership.businessId)).map((m) =>
        email(membership.businessId, m, `picked:${request.id}`, `${me.name} took ${requester.name}'s shift`, `${me.name} picked up ${requester.name}'s open shift, ${label}. The schedule is updated.`, "/manager/schedule"),
      ),
    ]);
    refresh();
    return { status: "success", message: `It's yours: ${label}.` };
  });
}

export async function cancelRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const { membership } = await requireEmployee();
  const requestId = String(formData.get("requestId"));
  if (!uuid.safeParse(requestId).success) return errorState("That request doesn't exist.");
  const cancelled = await db.shiftRequest.updateMany({
    where: { id: requestId, requesterId: membership.id, status: { in: ["OPEN", "PENDING_APPROVAL"] } },
    data: { status: "CANCELLED", resolvedById: membership.id, resolvedAt: new Date() },
  });
  refresh();
  return cancelled.count ? { status: "success", message: "Request cancelled. You keep your shift." } : errorState("This request already finished.");
}

// --- Managers ---------------------------------------------------------------------

/** Approve or decline a swap or pickup (only with Settings → Swap approval: Manager approves). */
export async function reviewRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const { membership } = await requireManager();
  const loaded = await loadRequest(membership.businessId, String(formData.get("requestId")));
  if (!loaded || loaded.request.status !== "PENDING_APPROVAL") return errorState("This request was already handled.");
  const { request, week, shift, now } = loaded;
  const otherId = request.type === "SWAP" ? request.targetMembershipId! : request.pickedUpById!;
  const [requester, other] = await Promise.all([person(request.requesterId), person(otherId)]);
  const label = shift ? describeShift(shift) : "the shift";

  if (formData.get("decision") !== "approve") {
    await db.shiftRequest.updateMany({ where: { id: request.id, status: "PENDING_APPROVAL" }, data: { status: "DECLINED", resolvedById: membership.id, resolvedAt: new Date() } });
    const body = `Your manager declined the ${request.type === "SWAP" ? "swap" : "pickup"} for ${label}. The schedule stays as it was.`;
    await notify([requester, other].map((p) => email(membership.businessId, p, `declined:${request.id}`, `Not approved: ${label}`, body, "/employee/shifts")));
    refresh();
    return { status: "success", message: "Declined. The schedule stays as it was." };
  }

  return attempt(async () => {
    const targetShift = week && request.type === "SWAP" ? findShift(week, request.targetShiftId) : undefined;
    const problem =
      !week || !shift || !now
        ? "the schedule changed"
        : !isUpcoming(shift, now) || (request.type === "SWAP" && (!targetShift || !isUpcoming(targetShift, now)))
          ? "the shift has started"
          : request.type === "SWAP"
            ? swapProblem(week.snapshot, { membershipId: requester.id, shift }, { membershipId: other.id, shift: targetShift! }, week.canWork)
            : !shift.people.some((p) => p.membershipId === requester.id)
              ? "the schedule changed"
              : pickUpProblem(week.snapshot, shift, other.id, week.canWork);
    if (problem) {
      await db.shiftRequest.update({ where: { id: request.id }, data: { status: "CANCELLED", resolvedById: membership.id, resolvedAt: new Date() } });
      refresh();
      return errorState(`This can't go ahead any more: ${problem}. The request was closed.`);
    }

    const moves: Move[] = [{ shiftId: shift!.shiftId, from: requester.id, to: { membershipId: other.id, name: other.name } }];
    if (targetShift) moves.push({ shiftId: targetShift.shiftId, from: other.id, to: { membershipId: requester.id, name: requester.name } });
    await complete(request.id, ["PENDING_APPROVAL"], week!, membership.id, () => moves);

    const done =
      request.type === "SWAP"
        ? `Your manager approved the swap: ${requester.name} takes ${describeShift(targetShift!)} and ${other.name} takes ${label}.`
        : `Your manager approved it: ${other.name} now works ${label} instead of ${requester.name}.`;
    await notify([requester, other].map((p) => email(membership.businessId, p, `approved:${request.id}`, `Approved: ${label}`, done, "/employee")));
    refresh();
    return { status: "success", message: "Approved. The schedule is updated and both people were emailed." };
  });
}

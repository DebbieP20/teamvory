import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireManager } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function ManagerDashboard() {
  const { user, membership } = await requireManager();
  const [teamCount, pendingInvites, missingAvailability, pendingTimeOff] = await Promise.all([
    db.membership.count({ where: { businessId: membership.businessId, status: "ACTIVE", role: { not: "OWNER" } } }),
    db.invitation.count({
      where: { businessId: membership.businessId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    }),
    db.membership.count({
      where: {
        businessId: membership.businessId,
        status: "ACTIVE",
        schedulingMode: { not: "NOT_SCHEDULED" },
        availabilityTemplate: { none: {} },
      },
    }),
    db.timeOff.count({ where: { status: "PENDING", membership: { businessId: membership.businessId } } }),
  ]);

  const steps = [
    { done: true, label: "Create your business", href: null },
    {
      done: teamCount > 0,
      label:
        teamCount > 0
          ? `Invite your team (${teamCount} joined${pendingInvites ? `, ${pendingInvites} invited` : ""})`
          : pendingInvites
            ? `Invite your team (${pendingInvites} invited, waiting for them to join)`
            : "Invite your team",
      href: "/manager/employees",
    },
    {
      done: teamCount > 0 && missingAvailability === 0,
      label:
        teamCount > 0 && missingAvailability > 0
          ? `Collect availability (${missingAvailability} ${missingAvailability === 1 ? "person hasn't" : "people haven't"} set it yet)`
          : "Collect availability",
      href: "/manager/availability",
    },
    { done: false, label: "Set up shifts and build your first schedule (coming soon)", href: null },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl">Welcome, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-muted-foreground">{membership.businessName}</p>
      </div>

      {pendingTimeOff > 0 && (
        <Link
          href="/manager/availability#requests-heading"
          className="block rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 font-medium text-amber-900 hover:bg-amber-100"
        >
          {pendingTimeOff === 1 ? "1 time-off request is" : `${pendingTimeOff} time-off requests are`} waiting for you →
        </Link>
      )}

      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-lg">Getting started</h2>
        <ol className="mt-4 space-y-3">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-3">
              {step.done ? (
                <CheckCircle2Icon className="size-5 shrink-0 text-teal" aria-label="Done" />
              ) : (
                <CircleIcon className="size-5 shrink-0 text-slate-300" aria-label="Not done yet" />
              )}
              {step.href ? (
                <Link href={step.href} className="font-medium text-teal-dark hover:underline">
                  {step.label}
                </Link>
              ) : (
                <span className={step.done ? "text-muted-foreground line-through" : ""}>{step.label}</span>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

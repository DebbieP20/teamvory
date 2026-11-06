import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireManager } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function ManagerDashboard() {
  const { user, membership } = await requireManager();
  const [teamCount, pendingInvites] = await Promise.all([
    db.membership.count({ where: { businessId: membership.businessId, status: "ACTIVE", role: { not: "OWNER" } } }),
    db.invitation.count({
      where: { businessId: membership.businessId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    }),
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
    { done: false, label: "Collect availability (coming soon)", href: null },
    { done: false, label: "Set up shifts and build your first schedule (coming soon)", href: null },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl">Welcome, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-muted-foreground">{membership.businessName}</p>
      </div>

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

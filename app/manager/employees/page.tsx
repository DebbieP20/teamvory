import type { Metadata } from "next";
import { db } from "@/lib/db";
import { canChangeRole, canManageMember } from "@/lib/permissions";
import { requireManager } from "@/lib/session";
import { InviteForm } from "./invite-form";
import { InvitationActions, MemberActions } from "./row-actions";

export const metadata: Metadata = { title: "Employees" };

const roleLabel = { OWNER: "Owner", MANAGER: "Manager", EMPLOYEE: "Employee" } as const;
const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

export default async function EmployeesPage() {
  const { membership } = await requireManager();
  const businessId = membership.businessId;

  const [members, invitations] = await Promise.all([
    db.membership.findMany({
      where: { businessId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: [{ status: "asc" }, { role: "asc" }, { user: { name: "asc" } }],
    }),
    db.invitation.findMany({
      where: { businessId, acceptedAt: null, revokedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const now = new Date();
  const isOwner = membership.role === "OWNER";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl">Employees</h1>
        <p className="mt-1 text-muted-foreground">Invite your team and manage who can use TeamVory.</p>
      </div>

      <section className="rounded-xl border bg-white p-6" aria-labelledby="invite-heading">
        <h2 id="invite-heading" className="text-lg">Invite someone</h2>
        <p className="mt-1 text-sm text-muted-foreground">They&apos;ll get an email with a link to join. The link works for 3 days.</p>
        <InviteForm canInviteManagers={isOwner} />
      </section>

      {invitations.length > 0 && (
        <section aria-labelledby="pending-heading">
          <h2 id="pending-heading" className="text-lg">Invited</h2>
          <ul className="mt-3 divide-y rounded-xl border bg-white">
            {invitations.map((inv) => {
              const expired = inv.expiresAt < now;
              return (
                <li key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{inv.email}</div>
                    <div className="text-sm text-muted-foreground">
                      {roleLabel[inv.role]} ·{" "}
                      {expired ? (
                        <span className="text-destructive">expired</span>
                      ) : (
                        `link works until ${dateFmt.format(inv.expiresAt)}`
                      )}
                    </div>
                  </div>
                  <InvitationActions invitationId={inv.id} email={inv.email} canResend={isOwner || inv.role === "EMPLOYEE"} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="team-heading">
        <h2 id="team-heading" className="text-lg">Your team</h2>
        <ul className="mt-3 divide-y rounded-xl border bg-white">
          {members.map((m) => {
            const target = { id: m.id, role: m.role };
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{m.user.name}</span>
                    {m.id === membership.id && <span className="text-sm text-muted-foreground">(you)</span>}
                    {m.status === "INACTIVE" && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Inactive</span>
                    )}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {roleLabel[m.role]} · {m.user.email}
                  </div>
                </div>
                <MemberActions
                  membershipId={m.id}
                  name={m.user.name}
                  role={m.role}
                  status={m.status}
                  canManage={canManageMember(membership, target)}
                  canPromote={canChangeRole(membership, target, m.role === "MANAGER" ? "EMPLOYEE" : "MANAGER")}
                />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

import "server-only";
import { db } from "@/lib/db";
import { teamSenderName } from "@/lib/email-address";

export type TeamSender = { fromName: string; replyTo?: string };

/** A business's emails to its team come from "<Business> via TeamVory", and replies go to the owner. */
export async function teamSender(businessId: string): Promise<TeamSender> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: {
      name: true,
      memberships: {
        where: { role: "OWNER", status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { user: { select: { email: true } } },
      },
    },
  });
  return { fromName: teamSenderName(business?.name ?? "Your team"), replyTo: business?.memberships[0]?.user.email };
}

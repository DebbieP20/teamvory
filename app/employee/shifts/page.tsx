import type { Metadata } from "next";
import { RequestButton } from "@/components/requests/request-forms";
import { ResultBanner } from "@/components/requests/result-banner";
import { formatDay, formatTime } from "@/lib/dates";
import type { SnapshotShift } from "@/lib/publish";
import { answerSwap, cancelRequest, pickUpShift } from "@/lib/request-actions";
import { activeRequests } from "@/lib/requests-data";
import { describeShift, shortName } from "@/lib/schedule";
import { requireEmployee } from "@/lib/session";
import { pickUpProblem } from "@/lib/swaps";

export const metadata: Metadata = { title: "Shifts" };

const when = (s: SnapshotShift) => `${formatDay(s.date)}, ${formatTime(s.startTime)} – ${formatTime(s.endTime)}`;

/** Open shifts and requests (wireframe 5B). */
export default async function EmployeeShiftsPage() {
  const { membership } = await requireEmployee();
  const { requests } = await activeRequests(membership.businessId);

  // Open shifts list only the ones this person can actually work (wireframe 5 notes).
  const open = requests.filter(
    (r) =>
      r.type === "COVERAGE" &&
      r.status === "OPEN" &&
      r.requesterId !== membership.id &&
      !pickUpProblem(r.publishedWeek.snapshot, r.shift, membership.id, r.publishedWeek.canWork),
  );
  const forMe = requests.filter((r) => r.type === "SWAP" && r.status === "OPEN" && r.targetMembershipId === membership.id);
  const mine = requests.filter((r) => r.requesterId === membership.id);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl">Shifts</h1>
        <p className="mt-1 text-muted-foreground">Pick up open shifts, answer swap requests, and follow your own.</p>
      </div>

      <ResultBanner>
        <div className="space-y-8">
          <section aria-labelledby="open-heading" className="space-y-3">
            <h2 id="open-heading" className="text-xl">Open shifts</h2>
            {open.length === 0 ? (
              <p className="rounded-xl border bg-white px-4 py-3 text-muted-foreground">No open shifts you can work right now.</p>
            ) : (
              <ul className="space-y-2">
                {open.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3">
                    <div>
                      <div className="font-semibold">{when(r.shift)}</div>
                      <div className="text-sm text-muted-foreground">
                        Posted by {shortName(r.requester.user.name)}
                        {r.note && <> · &ldquo;{r.note}&rdquo;</>}
                      </div>
                    </div>
                    <RequestButton
                      action={pickUpShift}
                      fields={{ requestId: r.id }}
                      label="Pick up"
                      pendingText="Picking up…"
                      ariaLabel={`Pick up ${describeShift(r.shift)}`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="asked-heading" className="space-y-3">
            <h2 id="asked-heading" className="text-xl">Swap requests for you</h2>
            {forMe.length === 0 ? (
              <p className="rounded-xl border bg-white px-4 py-3 text-muted-foreground">None right now.</p>
            ) : (
              <ul className="space-y-2">
                {forMe.map((r) => (
                  <li key={r.id} className="space-y-3 rounded-xl border border-teal/40 bg-white px-4 py-3">
                    <div>
                      <div className="font-semibold">{r.requester.user.name} asks to swap</div>
                      <div className="text-sm">You take: {when(r.shift)}</div>
                      <div className="text-sm">They take your: {when(r.targetShift!)}</div>
                      {r.note && <div className="text-sm text-muted-foreground">&ldquo;{r.note}&rdquo;</div>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <RequestButton action={answerSwap} fields={{ requestId: r.id, answer: "accept" }} label="Accept" pendingText="Accepting…" />
                      <RequestButton
                        action={answerSwap}
                        fields={{ requestId: r.id, answer: "decline" }}
                        label="Decline"
                        pendingText="Declining…"
                        variant="secondary"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="mine-heading" className="space-y-3">
            <h2 id="mine-heading" className="text-xl">Your requests</h2>
            {mine.length === 0 ? (
              <p className="rounded-xl border bg-white px-4 py-3 text-muted-foreground">
                None. To swap or give away a shift, open it from My schedule.
              </p>
            ) : (
              <ul className="space-y-2">
                {mine.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3">
                    <div>
                      <div className="font-semibold">{when(r.shift)}</div>
                      <div className="text-sm text-muted-foreground">
                        {r.status === "PENDING_APPROVAL"
                          ? `${r.type === "SWAP" ? `${shortName(r.targetMembership!.user.name)} accepted the swap` : `${shortName(r.pickedUpBy!.user.name)} picked it up`}. Waiting for your manager.`
                          : r.type === "SWAP"
                            ? `Swap asked of ${shortName(r.targetMembership!.user.name)} for ${when(r.targetShift!)}. Waiting for them.`
                            : "Posted as an open shift. Nobody has picked it up yet."}
                      </div>
                    </div>
                    <RequestButton
                      action={cancelRequest}
                      fields={{ requestId: r.id }}
                      label="Cancel"
                      pendingText="Cancelling…"
                      variant="danger"
                      confirmText="Cancel this request? You keep the shift."
                      ariaLabel={`Cancel request: ${describeShift(r.shift)}`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </ResultBanner>
    </div>
  );
}

-- One active request per person per shift.
CREATE UNIQUE INDEX "shift_requests_one_active" ON "shift_requests" ("shift_id", "requester_id")
  WHERE "status" IN ('OPEN', 'PENDING_APPROVAL');

-- A swap names the coworker and their shift; an open shift doesn't.
ALTER TABLE "shift_requests" ADD CONSTRAINT "shift_requests_target_check" CHECK (
  ("type" = 'SWAP' AND "target_membership_id" IS NOT NULL AND "target_shift_id" IS NOT NULL AND "picked_up_by_id" IS NULL)
  OR ("type" = 'COVERAGE' AND "target_membership_id" IS NULL AND "target_shift_id" IS NULL)
);

-- Nobody swaps with or picks up from themselves.
ALTER TABLE "shift_requests" ADD CONSTRAINT "shift_requests_not_self_check" CHECK (
  "target_membership_id" IS DISTINCT FROM "requester_id" AND "picked_up_by_id" IS DISTINCT FROM "requester_id"
);

ALTER TABLE "shift_requests" ADD CONSTRAINT "shift_requests_note_check" CHECK (char_length("note") <= 200);

-- Rules the database enforces for shifts (docs/database.md).
ALTER TABLE "shifts"
  ADD CONSTRAINT "shifts_times_check" CHECK (
    "start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "start_time" < "end_time"
  ),
  ADD CONSTRAINT "shifts_required_check" CHECK ("required_count" BETWEEN 1 AND 50);

-- Only one draft schedule per week (a published one is added in M5).
CREATE UNIQUE INDEX "schedules_one_draft_per_week" ON "schedules" ("week_id") WHERE "status" = 'DRAFT';

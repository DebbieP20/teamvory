-- At most one published version per week; older ones become SUPERSEDED.
CREATE UNIQUE INDEX "schedules_one_published_per_week" ON "schedules" ("week_id") WHERE "status" = 'PUBLISHED';

-- Published versions carry their frozen snapshot.
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_published_snapshot_check"
  CHECK ("status" = 'DRAFT' OR ("snapshot" IS NOT NULL AND "published_at" IS NOT NULL));

-- Reminder days stay inside the week before the scheduled week (Mon..Sun).
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_reminder_days_check"
  CHECK ("reminder_start_day" BETWEEN 1 AND 7 AND "reminder_days" BETWEEN 1 AND 7 AND "reminder_start_day" + "reminder_days" <= 8);

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_attempts_check" CHECK ("attempts" >= 0);

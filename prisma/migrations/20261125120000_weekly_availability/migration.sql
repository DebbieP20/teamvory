-- AlterTable
ALTER TABLE "businesses" DROP COLUMN "reminder_include_default_only";

-- CreateTable
CREATE TABLE "availability_weeks" (
    "id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_by_id" UUID NOT NULL,

    CONSTRAINT "availability_weeks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "availability_weeks_membership_id_week_start_key" ON "availability_weeks"("membership_id", "week_start");

-- AddForeignKey
ALTER TABLE "availability_weeks" ADD CONSTRAINT "availability_weeks_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Data: employees and managers no longer have a usual week; they send each week.
-- Weeks that already have shifts (from last week on) keep the availability they were
-- planned with: copy each person's usual week into those dates (unless that date was
-- already changed) and count those weeks as sent. Later weeks start empty.
CREATE TEMP TABLE planned AS
SELECT t.membership_id, w.start_date AS week_start, (w.start_date + g.n) AS day,
       t.kind, t.start_time, t.end_time
FROM "availability_templates" t
JOIN "memberships" m ON m.id = t.membership_id AND m.role <> 'OWNER'
JOIN "weeks" w ON w.business_id = m.business_id AND w.start_date >= CURRENT_DATE - 14
CROSS JOIN generate_series(0, 6) AS g(n)
WHERE EXISTS (SELECT 1 FROM "shifts" s WHERE s.week_id = w.id)
  AND EXTRACT(ISODOW FROM w.start_date + g.n) = t.day_of_week;

INSERT INTO "availability_overrides" (id, membership_id, date, kind, start_time, end_time, entered_by_id, updated_at)
SELECT gen_random_uuid(), membership_id, day, kind, start_time, end_time, membership_id, CURRENT_TIMESTAMP
FROM planned
ON CONFLICT (membership_id, date) DO NOTHING;

INSERT INTO "availability_weeks" (id, membership_id, week_start, sent_by_id)
SELECT gen_random_uuid(), membership_id, week_start, membership_id
FROM planned
GROUP BY membership_id, week_start
ON CONFLICT (membership_id, week_start) DO NOTHING;

DROP TABLE planned;

DELETE FROM "availability_templates" t
USING "memberships" m
WHERE m.id = t.membership_id AND m.role <> 'OWNER';

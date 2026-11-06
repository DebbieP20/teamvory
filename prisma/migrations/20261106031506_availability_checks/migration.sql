-- Rules the database enforces (docs/database.md, "Rules the database enforces").
-- Times are "HH:mm" strings, so text comparison orders them correctly.

ALTER TABLE "availability_templates"
  ADD CONSTRAINT "availability_templates_day_check" CHECK ("day_of_week" BETWEEN 1 AND 7),
  ADD CONSTRAINT "availability_templates_times_check" CHECK (
    ("kind" = 'CUSTOM' AND "start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "start_time" < "end_time")
    OR ("kind" <> 'CUSTOM' AND "start_time" IS NULL AND "end_time" IS NULL)
  );

ALTER TABLE "availability_overrides"
  ADD CONSTRAINT "availability_overrides_times_check" CHECK (
    ("kind" = 'CUSTOM' AND "start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "start_time" < "end_time")
    OR ("kind" <> 'CUSTOM' AND "start_time" IS NULL AND "end_time" IS NULL)
  );

ALTER TABLE "time_off"
  ADD CONSTRAINT "time_off_dates_check" CHECK ("end_date" >= "start_date");

ALTER TABLE "businesses"
  ADD CONSTRAINT "businesses_deadline_day_check" CHECK ("availability_deadline_day" BETWEEN 1 AND 7),
  ADD CONSTRAINT "businesses_deadline_time_check" CHECK ("availability_deadline_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

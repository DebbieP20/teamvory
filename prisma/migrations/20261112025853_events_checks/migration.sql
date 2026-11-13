ALTER TABLE "events" ADD CONSTRAINT "events_times_check" CHECK (
  "start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "end_time" > "start_time"
);
ALTER TABLE "events" ADD CONSTRAINT "events_text_check" CHECK (
  char_length("title") BETWEEN 1 AND 80 AND char_length("location") <= 120 AND char_length("notes") <= 500
);

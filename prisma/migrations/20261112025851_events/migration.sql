-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "event_id" UUID;

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "requires_staffing" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_business_id_date_idx" ON "events"("business_id", "date");

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

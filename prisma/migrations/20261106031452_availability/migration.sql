-- CreateEnum
CREATE TYPE "AvailabilityKind" AS ENUM ('OFF', 'ALL_DAY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TimeOffStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "availability_deadline_day" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "availability_deadline_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "availability_deadline_time" TEXT NOT NULL DEFAULT '18:00',
ADD COLUMN     "time_off_approval_required" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "availability_templates" (
    "id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "kind" "AvailabilityKind" NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_overrides" (
    "id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "kind" "AvailabilityKind" NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "entered_by_id" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_off" (
    "id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "note" TEXT,
    "status" "TimeOffStatus" NOT NULL DEFAULT 'APPROVED',
    "entered_by_id" UUID NOT NULL,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_off_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "availability_templates_membership_id_day_of_week_key" ON "availability_templates"("membership_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "availability_overrides_membership_id_date_key" ON "availability_overrides"("membership_id", "date");

-- CreateIndex
CREATE INDEX "time_off_membership_id_start_date_idx" ON "time_off"("membership_id", "start_date");

-- AddForeignKey
ALTER TABLE "availability_templates" ADD CONSTRAINT "availability_templates_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_overrides" ADD CONSTRAINT "availability_overrides_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

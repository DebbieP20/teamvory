-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "auto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "covering" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "seed" INTEGER;

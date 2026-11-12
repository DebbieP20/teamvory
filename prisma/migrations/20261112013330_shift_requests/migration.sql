-- CreateEnum
CREATE TYPE "SwapApprovalMode" AS ENUM ('AUTOMATIC', 'MANAGER_APPROVAL');

-- CreateEnum
CREATE TYPE "ShiftRequestType" AS ENUM ('SWAP', 'COVERAGE');

-- CreateEnum
CREATE TYPE "ShiftRequestStatus" AS ENUM ('OPEN', 'PENDING_APPROVAL', 'COMPLETED', 'DECLINED', 'CANCELLED');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "swap_approval_mode" "SwapApprovalMode" NOT NULL DEFAULT 'AUTOMATIC';

-- CreateTable
CREATE TABLE "shift_requests" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "type" "ShiftRequestType" NOT NULL,
    "status" "ShiftRequestStatus" NOT NULL DEFAULT 'OPEN',
    "requester_id" UUID NOT NULL,
    "week_id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "target_membership_id" UUID,
    "target_shift_id" UUID,
    "picked_up_by_id" UUID,
    "note" TEXT,
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shift_requests_business_id_status_idx" ON "shift_requests"("business_id", "status");

-- AddForeignKey
ALTER TABLE "shift_requests" ADD CONSTRAINT "shift_requests_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_requests" ADD CONSTRAINT "shift_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_requests" ADD CONSTRAINT "shift_requests_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_requests" ADD CONSTRAINT "shift_requests_target_membership_id_fkey" FOREIGN KEY ("target_membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_requests" ADD CONSTRAINT "shift_requests_picked_up_by_id_fkey" FOREIGN KEY ("picked_up_by_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

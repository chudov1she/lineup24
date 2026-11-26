-- AlterEnum
ALTER TYPE "BroadcastAudience" ADD VALUE 'DIRECT_USER';

-- AlterTable
ALTER TABLE "Broadcast" ADD COLUMN "recipientUserId" TEXT;

-- CreateIndex
CREATE INDEX "Broadcast_audience_createdAt_idx" ON "Broadcast"("audience", "createdAt");

-- CreateIndex
CREATE INDEX "Broadcast_recipientUserId_idx" ON "Broadcast"("recipientUserId");

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

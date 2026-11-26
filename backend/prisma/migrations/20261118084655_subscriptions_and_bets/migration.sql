-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('BANK_BOOST', 'MONTHLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'REVOKED');

-- CreateEnum
CREATE TYPE "BetResult" AS ENUM ('PENDING', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "SubscriptionProduct" (
    "code" "SubscriptionPlan" NOT NULL,
    "title" TEXT NOT NULL,
    "priceRub" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "SubscriptionProduct_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "UserSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "priceRubAtGrant" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "bankStartRub" INTEGER,
    "bankCurrentRub" INTEGER,
    "bankTargetRub" INTEGER,
    "completedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "grantedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "forecast" TEXT NOT NULL,
    "odds" DECIMAL(10,3) NOT NULL,
    "score" TEXT,
    "result" "BetResult" NOT NULL DEFAULT 'PENDING',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSubscription_userId_status_idx" ON "UserSubscription"("userId", "status");

-- CreateIndex
CREATE INDEX "UserSubscription_status_endsAt_idx" ON "UserSubscription"("status", "endsAt");

-- CreateIndex
CREATE INDEX "UserSubscription_plan_status_idx" ON "UserSubscription"("plan", "status");

-- CreateIndex
CREATE INDEX "UserSubscription_createdAt_idx" ON "UserSubscription"("createdAt");

-- CreateIndex
CREATE INDEX "Bet_publishedAt_idx" ON "Bet"("publishedAt");

-- CreateIndex
CREATE INDEX "Bet_result_publishedAt_idx" ON "Bet"("result", "publishedAt");

-- CreateIndex
CREATE INDEX "Bet_createdById_idx" ON "Bet"("createdById");

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

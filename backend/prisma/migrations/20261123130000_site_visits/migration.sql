-- CreateTable
CREATE TABLE "SiteVisit" (
    "id" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteVisit_path_day_idx" ON "SiteVisit"("path", "day");

-- CreateIndex
CREATE UNIQUE INDEX "SiteVisit_visitorKey_path_day_key" ON "SiteVisit"("visitorKey", "path", "day");

-- CreateTable
CREATE TABLE "SavedSpot" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSpot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedSpot_userId_idx" ON "SavedSpot"("userId");

-- CreateIndex
CREATE INDEX "SavedSpot_spotId_idx" ON "SavedSpot"("spotId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedSpot_spotId_userId_key" ON "SavedSpot"("spotId", "userId");

-- AddForeignKey
ALTER TABLE "SavedSpot" ADD CONSTRAINT "SavedSpot_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSpot" ADD CONSTRAINT "SavedSpot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

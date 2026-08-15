-- Add default locker creation marker.
ALTER TABLE "User" ADD COLUMN "defaultLockersCreated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Locker" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Locker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LockerSpot" (
    "id" TEXT NOT NULL,
    "lockerId" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LockerSpot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "favoriteItem" TEXT,
    "companion" TEXT,
    "wouldReturn" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Locker_userId_idx" ON "Locker"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Locker_userId_name_key" ON "Locker"("userId", "name");

-- CreateIndex
CREATE INDEX "LockerSpot_lockerId_idx" ON "LockerSpot"("lockerId");

-- CreateIndex
CREATE INDEX "LockerSpot_spotId_idx" ON "LockerSpot"("spotId");

-- CreateIndex
CREATE UNIQUE INDEX "LockerSpot_lockerId_spotId_key" ON "LockerSpot"("lockerId", "spotId");

-- CreateIndex
CREATE INDEX "VisitEntry_userId_idx" ON "VisitEntry"("userId");

-- CreateIndex
CREATE INDEX "VisitEntry_spotId_idx" ON "VisitEntry"("spotId");

-- AddForeignKey
ALTER TABLE "Locker" ADD CONSTRAINT "Locker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockerSpot" ADD CONSTRAINT "LockerSpot_lockerId_fkey" FOREIGN KEY ("lockerId") REFERENCES "Locker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockerSpot" ADD CONSTRAINT "LockerSpot_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitEntry" ADD CONSTRAINT "VisitEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitEntry" ADD CONSTRAINT "VisitEntry_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

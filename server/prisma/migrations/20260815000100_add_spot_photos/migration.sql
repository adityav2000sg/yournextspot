-- Add a curated cover image to catalogue entries.
ALTER TABLE "Spot" ADD COLUMN "coverImageUrl" TEXT;

-- Public/private member media with a moderation state for a future admin queue.
CREATE TYPE "PhotoVisibility" AS ENUM ('public', 'private');
CREATE TYPE "PhotoStatus" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "SpotPhoto" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "userId" TEXT,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "visibility" "PhotoVisibility" NOT NULL DEFAULT 'private',
    "status" "PhotoStatus" NOT NULL DEFAULT 'approved',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpotPhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SpotPhoto_spotId_visibility_status_idx" ON "SpotPhoto"("spotId", "visibility", "status");
CREATE INDEX "SpotPhoto_userId_idx" ON "SpotPhoto"("userId");

ALTER TABLE "SpotPhoto" ADD CONSTRAINT "SpotPhoto_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpotPhoto" ADD CONSTRAINT "SpotPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Remove synthetic social proof from earlier development seeds.
DELETE FROM "Review" WHERE "isSeed" = true;
UPDATE "Spot" SET "ownerScore" = NULL, "ownerVerdict" = NULL;

-- A member has one living public verdict per place. Posting again edits it.
CREATE UNIQUE INDEX "Review_spotId_userId_key" ON "Review"("spotId", "userId");

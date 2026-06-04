-- CreateEnum
CREATE TYPE "Category" AS ENUM ('restaurant', 'coffee', 'bar');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('everyday_delight', 'thoughtful_treat', 'memorable_occasion', 'landmark_celebration', 'crown_jewel');

-- CreateTable
CREATE TABLE "Spot" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "cuisine" TEXT,
    "price" TEXT,
    "address" TEXT,
    "area" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "googleMapsUrl" TEXT,
    "ownerTier" "Tier",
    "ownerScore" DOUBLE PRECISION,
    "ownerVerdict" TEXT,
    "notes" TEXT,
    "wishlist" BOOLEAN NOT NULL DEFAULT false,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Spot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "userId" TEXT,
    "authorName" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "tier" "Tier" NOT NULL,
    "verdict" TEXT NOT NULL,
    "wouldReturn" BOOLEAN NOT NULL DEFAULT true,
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Spot_slug_key" ON "Spot"("slug");

-- CreateIndex
CREATE INDEX "Spot_category_idx" ON "Spot"("category");

-- CreateIndex
CREATE INDEX "Spot_area_idx" ON "Spot"("area");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Review_spotId_idx" ON "Review"("spotId");

-- CreateIndex
CREATE INDEX "OtpCode_email_idx" ON "OtpCode"("email");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

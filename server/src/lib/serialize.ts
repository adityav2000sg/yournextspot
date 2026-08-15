import type { Prisma, Review, Spot, SpotPhoto } from "@prisma/client";
import { scoreToTier } from "./tiers.js";

export type SpotWithReviews = Prisma.SpotGetPayload<{ include: { reviews: true } }>;
export type SpotWithReviewsAndPhotos = Prisma.SpotGetPayload<{ include: { reviews: true; photos: true } }>;

function aggregate(reviews: Review[]) {
  const publicReviews = reviews.filter((review) => !review.isSeed);
  if (publicReviews.length === 0) {
    return { reviewCount: 0, avgScore: null as number | null, communityTier: null };
  }
  const avg =
    publicReviews.reduce((sum, r) => sum + r.score, 0) / publicReviews.length;
  const rounded = Math.round(avg * 10) / 10;
  return {
    reviewCount: publicReviews.length,
    avgScore: rounded,
    communityTier: scoreToTier(rounded),
  };
}

export function serializeSpotSummary(spot: SpotWithReviews, saved = false) {
  const agg = aggregate(spot.reviews);
  return {
    id: spot.id,
    slug: spot.slug,
    name: spot.name,
    category: spot.category,
    cuisine: spot.cuisine,
    price: spot.price,
    address: spot.address,
    area: spot.area,
    lat: spot.lat,
    lng: spot.lng,
    googleMapsUrl: spot.googleMapsUrl,
    ownerTier: spot.ownerTier,
    ownerScore: spot.ownerScore,
    ownerVerdict: spot.ownerVerdict,
    notes: spot.notes,
    wishlist: spot.wishlist,
    needsReview: spot.needsReview,
    coverImageUrl: spot.coverImageUrl,
    saved,
    ...agg,
  };
}

export function serializeSpotDetail(
  spot: SpotWithReviewsAndPhotos,
  currentUserId: string | null,
  saved = false
) {
  const summary = serializeSpotSummary(spot, saved);
  const reviews = [...spot.reviews]
    .filter((review) => !review.isSeed)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((r) => serializeReview(r, currentUserId));
  const photos = spot.photos.map((photo: SpotPhoto) => ({
    id: photo.id,
    imageUrl: photo.imageUrl,
    caption: photo.caption,
    visibility: photo.visibility,
    status: photo.status,
    createdAt: photo.createdAt.toISOString(),
    mine: currentUserId != null && photo.userId === currentUserId,
    authorId: photo.userId,
  }));
  return { ...summary, reviews, photos };
}

export function serializeReview(review: Review, currentUserId: string | null) {
  return {
    id: review.id,
    authorName: review.authorName,
    score: review.score,
    tier: review.tier,
    verdict: review.verdict,
    wouldReturn: review.wouldReturn,
    isSeed: review.isSeed,
    createdAt: review.createdAt.toISOString(),
    mine: currentUserId != null && review.userId === currentUserId,
    authorId: review.userId,
  };
}

export function compactForConcierge(spot: Spot) {
  return {
    slug: spot.slug,
    name: spot.name,
    category: spot.category,
    cuisine: spot.cuisine,
    price: spot.price,
    area: spot.area,
    tier: spot.ownerTier,
    score: spot.ownerScore,
    verdict: spot.ownerVerdict,
    wishlist: spot.wishlist,
  };
}

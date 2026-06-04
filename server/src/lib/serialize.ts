import type { Prisma, Review, Spot } from "@prisma/client";
import { scoreToTier } from "./tiers.js";

export type SpotWithReviews = Prisma.SpotGetPayload<{ include: { reviews: true } }>;

function aggregate(reviews: Review[]) {
  if (reviews.length === 0) {
    return { reviewCount: 0, avgScore: null as number | null, communityTier: null };
  }
  const avg =
    reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length;
  const rounded = Math.round(avg * 10) / 10;
  return {
    reviewCount: reviews.length,
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
    saved,
    ...agg,
  };
}

export function serializeSpotDetail(
  spot: SpotWithReviews,
  currentUserId: string | null,
  saved = false
) {
  const summary = serializeSpotSummary(spot, saved);
  const reviews = [...spot.reviews]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((r) => serializeReview(r, currentUserId));
  return { ...summary, reviews };
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

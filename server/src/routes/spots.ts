import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { readToken, requireAuth, type AuthPayload } from "../lib/auth.js";
import {
  serializeReview,
  serializeSpotDetail,
  serializeSpotSummary,
  type SpotWithReviews,
} from "../lib/serialize.js";
import { getDefaultLockerId } from "../lib/lockers.js";

export const spotsRouter = Router();

const CATEGORIES = ["restaurant", "coffee", "bar"] as const;
const TIERS = [
  "everyday_delight",
  "thoughtful_treat",
  "memorable_occasion",
  "landmark_celebration",
  "crown_jewel",
] as const;

function buildWhere(q: Record<string, unknown>): Prisma.SpotWhereInput {
  const where: Prisma.SpotWhereInput = {};
  const category = String(q.category ?? "");
  const tier = String(q.tier ?? "");
  const area = String(q.area ?? "");
  const price = String(q.price ?? "");
  const search = String(q.search ?? "").trim();
  const visited = String(q.visited ?? "");

  if ((CATEGORIES as readonly string[]).includes(category))
    where.category = category as (typeof CATEGORIES)[number];
  if ((TIERS as readonly string[]).includes(tier))
    where.ownerTier = tier as (typeof TIERS)[number];
  if (area) where.area = area;
  if (price) where.price = price;
  if (visited === "reviewed") where.wishlist = false;
  if (visited === "wishlist") where.wishlist = true;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { cuisine: { contains: search, mode: "insensitive" } },
      { area: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
      { ownerVerdict: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }
  return where;
}

// GET /api/spots
spotsRouter.get("/spots", async (req, res) => {
  const auth = readToken(req);
  const where = buildWhere(req.query as Record<string, unknown>);
  const spots = await prisma.spot.findMany({
    where,
    include: { reviews: true },
    orderBy: [{ wishlist: "asc" }, { ownerScore: "desc" }, { name: "asc" }],
  });
  const savedIds = auth
    ? new Set(
        (
          await prisma.savedSpot.findMany({
            where: { userId: auth.userId },
            select: { spotId: true },
          })
        ).map((s) => s.spotId)
      )
    : new Set<string>();
  res.json(spots.map((spot) => serializeSpotSummary(spot, savedIds.has(spot.id))));
});

// GET /api/areas
spotsRouter.get("/areas", async (_req, res) => {
  const rows = await prisma.spot.findMany({
    where: { area: { not: null } },
    distinct: ["area"],
    select: { area: true },
    orderBy: { area: "asc" },
  });
  res.json(rows.map((r) => r.area).filter(Boolean));
});

// GET /api/random
spotsRouter.get("/random", async (req, res) => {
  const auth = readToken(req);
  const where = buildWhere(req.query as Record<string, unknown>);
  const matches = await prisma.spot.findMany({
    where,
    include: { reviews: true },
  });
  if (matches.length === 0) {
    return res.status(404).json({ error: "No spots match those filters." });
  }
  const savedIds = auth
    ? new Set(
        (
          await prisma.savedSpot.findMany({
            where: { userId: auth.userId },
            select: { spotId: true },
          })
        ).map((s) => s.spotId)
      )
    : new Set<string>();
  const choice = weightedRandomChoice(matches, savedIds, req.query as Record<string, unknown>);
  const saved = savedIds.has(choice.id);
  res.json(serializeSpotSummary(choice, saved));
});

// GET /api/spots/:slug
spotsRouter.get("/spots/:slug", async (req, res) => {
  const auth = readToken(req);
  const spot = await prisma.spot.findUnique({
    where: { slug: req.params.slug },
    include: {
      reviews: true,
      photos: {
        where: auth
          ? {
              OR: [
                { visibility: "public", status: "approved" },
                { userId: auth.userId },
              ],
            }
          : { visibility: "public", status: "approved" },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!spot) return res.status(404).json({ error: "Spot not found." });
  const saved = auth
    ? Boolean(
        await prisma.savedSpot.findUnique({
          where: { spotId_userId: { spotId: spot.id, userId: auth.userId } },
        })
      )
    : false;
  res.json(serializeSpotDetail(spot, auth?.userId ?? null, saved));
});

// POST /api/spots/:slug/save
spotsRouter.post("/spots/:slug/save", requireAuth, async (req, res) => {
  const auth = (req as typeof req & { auth: AuthPayload }).auth;
  const spot = await prisma.spot.findUnique({ where: { slug: req.params.slug } });
  if (!spot) return res.status(404).json({ error: "Spot not found." });

  await prisma.savedSpot.upsert({
    where: { spotId_userId: { spotId: spot.id, userId: auth.userId } },
    update: {},
    create: { spotId: spot.id, userId: auth.userId },
  });
  const lockerId = await getDefaultLockerId(auth.userId);
  await prisma.lockerSpot.upsert({
    where: { lockerId_spotId: { lockerId, spotId: spot.id } },
    update: {},
    create: { lockerId, spotId: spot.id },
  });

  res.json({ saved: true });
});

// DELETE /api/spots/:slug/save
spotsRouter.delete("/spots/:slug/save", requireAuth, async (req, res) => {
  const auth = (req as typeof req & { auth: AuthPayload }).auth;
  const spot = await prisma.spot.findUnique({ where: { slug: req.params.slug } });
  if (!spot) return res.status(404).json({ error: "Spot not found." });

  await prisma.savedSpot.deleteMany({
    where: { spotId: spot.id, userId: auth.userId },
  });
  await prisma.lockerSpot.deleteMany({
    where: { spotId: spot.id, locker: { userId: auth.userId } },
  });

  res.json({ saved: false });
});

const reviewSchema = z.object({
  score: z.number().min(1).max(10),
  tier: z.enum(TIERS),
  verdict: z.string().min(2).max(160),
  wouldReturn: z.boolean(),
});

// POST /api/spots/:slug/reviews — one editable public verdict per member/place.
spotsRouter.post("/spots/:slug/reviews", requireAuth, async (req, res) => {
  const auth = (req as typeof req & { auth: AuthPayload }).auth;
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid review." });
  }
  const spot = await prisma.spot.findUnique({ where: { slug: req.params.slug } });
  if (!spot) return res.status(404).json({ error: "Spot not found." });

  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  const authorName = user?.displayName || auth.email.split("@")[0];

  const review = await prisma.review.upsert({
    where: { spotId_userId: { spotId: spot.id, userId: auth.userId } },
    update: {
      authorName,
      score: parsed.data.score,
      tier: parsed.data.tier,
      verdict: parsed.data.verdict,
      wouldReturn: parsed.data.wouldReturn,
      isSeed: false,
    },
    create: {
      spotId: spot.id,
      userId: auth.userId,
      authorName,
      score: parsed.data.score,
      tier: parsed.data.tier,
      verdict: parsed.data.verdict,
      wouldReturn: parsed.data.wouldReturn,
      isSeed: false,
    },
  });
  res.json(serializeReview(review, auth.userId));
});

type TimeBlock =
  | "breakfast"
  | "coffee_work"
  | "lunch"
  | "dinner"
  | "late_drinks"
  | "quiet_hours";

function weightedRandomChoice(
  spots: SpotWithReviews[],
  savedIds: Set<string>,
  query: Record<string, unknown>
) {
  const block = singaporeTimeBlock();
  const ranked = spots
    .map((spot) => ({
      spot,
      score: randomScore(spot, block, savedIds.has(spot.id), query) + Math.random() * 0.65,
    }))
    .sort((a, b) => b.score - a.score);

  const shortlist = ranked.slice(0, Math.min(8, ranked.length));
  const floor = Math.min(...shortlist.map((item) => item.score));
  const weighted = shortlist.map((item) => ({
    item,
    weight: Math.max(0.8, item.score - floor + 0.8),
  }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;

  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) return item.item.spot;
  }

  return weighted[0].item.spot;
}

function randomScore(
  spot: SpotWithReviews,
  block: TimeBlock,
  saved: boolean,
  query: Record<string, unknown>
) {
  const reviewAvg =
    spot.reviews.filter((review) => !review.isSeed).length > 0
      ? spot.reviews.filter((review) => !review.isSeed).reduce((sum, review) => sum + review.score, 0) /
        spot.reviews.filter((review) => !review.isSeed).length
      : null;
  let score = spot.ownerScore ?? reviewAvg ?? 6.4;

  score += categoryTimeScore(spot.category, block) * 1.15;
  if (String(query.category ?? "") === spot.category) score += 1.5;
  if (spot.area && String(query.area ?? "") === spot.area) score += 0.9;
  if (spot.price && String(query.price ?? "") === spot.price) score += 0.7;
  if (spot.ownerTier && String(query.tier ?? "") === spot.ownerTier) score += 0.9;

  const visited = String(query.visited ?? "");
  if (visited === "wishlist") score += spot.wishlist ? 1.8 : -1.2;
  else if (visited === "reviewed") score += spot.wishlist ? -2 : 1.2;
  else score += spot.wishlist ? 0.2 : 0.8;

  if (saved) score += 0.7;
  if (spot.needsReview) score -= 0.25;
  return score;
}

function singaporeTimeBlock(): TimeBlock {
  const parts = new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0") % 24;
  if (hour >= 5 && hour < 10) return "breakfast";
  if ((hour >= 10 && hour < 12) || (hour >= 14 && hour < 17)) return "coffee_work";
  if (hour >= 12 && hour < 14) return "lunch";
  if (hour >= 17 && hour < 21) return "dinner";
  if (hour >= 21 || hour < 2) return "late_drinks";
  return "quiet_hours";
}

function categoryTimeScore(category: SpotWithReviews["category"], block: TimeBlock) {
  const table: Record<TimeBlock, Record<SpotWithReviews["category"], number>> = {
    breakfast: { restaurant: 2.5, coffee: 3.4, bar: -4 },
    coffee_work: { restaurant: -0.4, coffee: 4, bar: -3.5 },
    lunch: { restaurant: 4, coffee: 0.8, bar: -3.2 },
    dinner: { restaurant: 4, coffee: -2.4, bar: 1.4 },
    late_drinks: { restaurant: -0.8, coffee: -3.4, bar: 4 },
    quiet_hours: { restaurant: -2.2, coffee: -4, bar: 1.7 },
  };
  return table[block][category];
}

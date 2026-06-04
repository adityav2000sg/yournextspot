import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { readToken, requireAuth, type AuthPayload } from "../lib/auth.js";
import {
  serializeReview,
  serializeSpotDetail,
  serializeSpotSummary,
} from "../lib/serialize.js";

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
  const choice = matches[Math.floor(Math.random() * matches.length)];
  const saved = auth
    ? Boolean(
        await prisma.savedSpot.findUnique({
          where: { spotId_userId: { spotId: choice.id, userId: auth.userId } },
        })
      )
    : false;
  res.json(serializeSpotSummary(choice, saved));
});

// GET /api/spots/:slug
spotsRouter.get("/spots/:slug", async (req, res) => {
  const auth = readToken(req);
  const spot = await prisma.spot.findUnique({
    where: { slug: req.params.slug },
    include: { reviews: true },
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

  res.json({ saved: false });
});

const reviewSchema = z.object({
  score: z.number().min(1).max(10),
  tier: z.enum(TIERS),
  verdict: z.string().min(2).max(160),
  wouldReturn: z.boolean(),
});

// POST /api/spots/:slug/reviews
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

  const review = await prisma.review.create({
    data: {
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
  res.status(201).json(serializeReview(review, auth.userId));
});

import { Router } from "express";
import { z } from "zod";
import type { AuthPayload } from "../lib/auth.js";
import { requireAuth } from "../lib/auth.js";
import { prisma } from "../prisma.js";

export const reportsRouter = Router();

const reportSchema = z.object({
  targetType: z.enum(["review", "photo", "spot"]),
  targetId: z.string().min(1).max(100),
  reason: z.enum(["inappropriate", "spam", "misleading", "copyright", "other"]),
  details: z.string().trim().max(500).optional().nullable(),
});

reportsRouter.post("/reports", requireAuth, async (req, res) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose a valid reason for this report." });

  const auth = (req as typeof req & { auth: AuthPayload }).auth;
  const { targetType, targetId, reason, details } = parsed.data;
  const target = targetType === "review"
    ? await prisma.review.findUnique({ where: { id: targetId }, select: { id: true, userId: true } })
    : targetType === "photo"
      ? await prisma.spotPhoto.findUnique({ where: { id: targetId }, select: { id: true, userId: true } })
      : await prisma.spot.findUnique({ where: { id: targetId }, select: { id: true } });

  if (!target) return res.status(404).json({ error: "That content is no longer available." });
  if ("userId" in target && target.userId === auth.userId) {
    return res.status(400).json({ error: "You can edit or delete your own content instead." });
  }

  const targetWhere = targetType === "review"
    ? { reviewId: targetId }
    : targetType === "photo"
      ? { photoId: targetId }
      : { spotId: targetId };
  const existing = await prisma.contentReport.findFirst({
    where: { reporterId: auth.userId, ...targetWhere, status: "open" },
    select: { id: true },
  });
  if (existing) return res.json({ received: true });

  await prisma.contentReport.create({
    data: {
      reporterId: auth.userId,
      reason,
      details: details || null,
      ...targetWhere,
    },
  });
  return res.status(201).json({ received: true });
});

reportsRouter.post("/blocks/:userId", requireAuth, async (req, res) => {
  const auth = (req as typeof req & { auth: AuthPayload }).auth;
  const blockedId = req.params.userId;
  if (blockedId === auth.userId) return res.status(400).json({ error: "You cannot block your own account." });
  const blocked = await prisma.user.findUnique({ where: { id: blockedId }, select: { id: true } });
  if (!blocked) return res.status(404).json({ error: "That member is no longer available." });

  await prisma.blockedUser.upsert({
    where: { blockerId_blockedId: { blockerId: auth.userId, blockedId } },
    update: {},
    create: { blockerId: auth.userId, blockedId },
  });
  return res.json({ blocked: true });
});

reportsRouter.delete("/blocks/:userId", requireAuth, async (req, res) => {
  const auth = (req as typeof req & { auth: AuthPayload }).auth;
  await prisma.blockedUser.deleteMany({
    where: { blockerId: auth.userId, blockedId: req.params.userId },
  });
  return res.status(204).end();
});

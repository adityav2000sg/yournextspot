import { Router } from "express";
import { z } from "zod";
import type { AuthPayload } from "../lib/auth.js";
import { requireAuth } from "../lib/auth.js";
import { prisma } from "../prisma.js";
import {
  ensureDefaultLockers,
  getDefaultLockerId,
  serializeLockerDetail,
  serializeLockerSummary,
  serializeVisit,
  serializeVisitWithSpot,
} from "../lib/lockers.js";

export const lockersRouter = Router();

const lockerSchema = z.object({
  name: z.string().trim().min(1).max(48),
  description: z.string().trim().max(180).optional().nullable(),
});

const saveToLockersSchema = z.object({
  lockerIds: z.array(z.string()).optional().default([]),
  newLockerName: z.string().trim().min(1).max(48).optional(),
  newLockerDescription: z.string().trim().max(180).optional(),
});

const visitSchema = z.object({
  visitDate: z.string().min(4),
  rating: z.number().min(1).max(10),
  note: z.string().trim().max(500).optional().nullable(),
  favoriteItem: z.string().trim().max(120).optional().nullable(),
  companion: z.string().trim().max(120).optional().nullable(),
  wouldReturn: z.boolean(),
});

function auth(req: Parameters<typeof requireAuth>[0]) {
  return (req as typeof req & { auth: AuthPayload }).auth;
}

async function savedSpotIds(userId: string) {
  const rows = await prisma.savedSpot.findMany({
    where: { userId },
    select: { spotId: true },
  });
  return new Set(rows.map((row) => row.spotId));
}

async function lockerWithItems(userId: string, lockerId: string) {
  return prisma.locker.findFirst({
    where: { id: lockerId, userId },
    include: {
      items: {
        orderBy: { createdAt: "desc" },
        include: { spot: { include: { reviews: true } } },
      },
    },
  });
}

// GET /api/lockers
lockersRouter.get("/lockers", requireAuth, async (req, res) => {
  const { userId } = auth(req);
  await ensureDefaultLockers(userId);
  const [lockers, visitRows] = await Promise.all([
    prisma.locker.findMany({
      where: { userId },
      include: {
        items: {
          include: { spot: { include: { reviews: true } } },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.visitEntry.findMany({ where: { userId }, select: { spotId: true } }),
  ]);
  const visited = new Set(visitRows.map((visit) => visit.spotId));
  res.json({
    lockers: lockers.map((locker) => ({
      ...serializeLockerSummary(locker),
      visitedCount: locker.items.filter((item) => visited.has(item.spotId)).length,
    })),
  });
});

// POST /api/lockers
lockersRouter.post("/lockers", requireAuth, async (req, res) => {
  const { userId } = auth(req);
  const parsed = lockerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a locker name." });

  try {
    const locker = await prisma.locker.create({
      data: {
        userId,
        name: parsed.data.name,
        description: parsed.data.description || null,
      },
      include: { items: { include: { spot: { include: { reviews: true } } } } },
    });
    res.status(201).json({ locker: serializeLockerSummary(locker) });
  } catch {
    res.status(409).json({ error: "You already have a locker with that name." });
  }
});

// GET /api/lockers/:lockerId
lockersRouter.get("/lockers/:lockerId", requireAuth, async (req, res) => {
  const { userId } = auth(req);
  const locker = await lockerWithItems(userId, req.params.lockerId);
  if (!locker) return res.status(404).json({ error: "Locker not found." });

  const visits = await prisma.visitEntry.findMany({
    where: { userId, spotId: { in: locker.items.map((item) => item.spotId) } },
    orderBy: { visitDate: "desc" },
  });
  const visitsBySpot = new Map<string, typeof visits>();
  for (const visit of visits) {
    visitsBySpot.set(visit.spotId, [...(visitsBySpot.get(visit.spotId) ?? []), visit]);
  }

  res.json({
    locker: serializeLockerDetail(locker, await savedSpotIds(userId), visitsBySpot),
  });
});

// PATCH /api/lockers/:lockerId
lockersRouter.patch("/lockers/:lockerId", requireAuth, async (req, res) => {
  const { userId } = auth(req);
  const parsed = lockerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a locker name." });

  const existing = await prisma.locker.findFirst({
    where: { id: req.params.lockerId, userId },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: "Locker not found." });

  try {
    const locker = await prisma.locker.update({
      where: { id: req.params.lockerId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
      },
      include: { items: { include: { spot: { include: { reviews: true } } } } },
    });
    res.json({ locker: serializeLockerSummary(locker) });
  } catch {
    res.status(409).json({ error: "You already have a locker with that name." });
  }
});

// DELETE /api/lockers/:lockerId
lockersRouter.delete("/lockers/:lockerId", requireAuth, async (req, res) => {
  const { userId } = auth(req);
  const existing = await prisma.locker.findFirst({
    where: { id: req.params.lockerId, userId },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: "Locker not found." });
  await prisma.locker.delete({ where: { id: req.params.lockerId } });
  res.status(204).end();
});

// POST /api/spots/:slug/save-to-lockers
lockersRouter.post("/spots/:slug/save-to-lockers", requireAuth, async (req, res) => {
  const { userId } = auth(req);
  const parsed = saveToLockersSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose a locker." });
  await ensureDefaultLockers(userId);

  const spot = await prisma.spot.findUnique({ where: { slug: req.params.slug } });
  if (!spot) return res.status(404).json({ error: "Spot not found." });

  const lockerIds = [...new Set(parsed.data.lockerIds)];
  if (parsed.data.newLockerName) {
    const locker = await prisma.locker.upsert({
      where: { userId_name: { userId, name: parsed.data.newLockerName } },
      update: {
        description: parsed.data.newLockerDescription || undefined,
      },
      create: {
        userId,
        name: parsed.data.newLockerName,
        description: parsed.data.newLockerDescription || null,
      },
      select: { id: true },
    });
    lockerIds.push(locker.id);
  }
  if (lockerIds.length === 0) lockerIds.push(await getDefaultLockerId(userId));

  const ownedLockers = await prisma.locker.findMany({
    where: { userId, id: { in: lockerIds } },
    select: { id: true },
  });
  if (ownedLockers.length === 0) return res.status(400).json({ error: "Choose a locker." });

  await prisma.$transaction(async (tx) => {
    await tx.savedSpot.upsert({
      where: { spotId_userId: { spotId: spot.id, userId } },
      update: {},
      create: { spotId: spot.id, userId },
    });
    for (const locker of ownedLockers) {
      await tx.lockerSpot.upsert({
        where: { lockerId_spotId: { lockerId: locker.id, spotId: spot.id } },
        update: {},
        create: { lockerId: locker.id, spotId: spot.id },
      });
    }
  });

  res.json({ saved: true, lockerIds: ownedLockers.map((locker) => locker.id) });
});

// DELETE /api/lockers/:lockerId/spots/:slug
lockersRouter.delete("/lockers/:lockerId/spots/:slug", requireAuth, async (req, res) => {
  const { userId } = auth(req);
  const locker = await prisma.locker.findFirst({
    where: { id: req.params.lockerId, userId },
    select: { id: true },
  });
  if (!locker) return res.status(404).json({ error: "Locker not found." });
  const spot = await prisma.spot.findUnique({ where: { slug: req.params.slug } });
  if (!spot) return res.status(404).json({ error: "Spot not found." });

  await prisma.lockerSpot.deleteMany({
    where: { lockerId: locker.id, spotId: spot.id },
  });

  const remaining = await prisma.lockerSpot.count({
    where: { spotId: spot.id, locker: { userId } },
  });
  if (remaining === 0) {
    await prisma.savedSpot.deleteMany({ where: { spotId: spot.id, userId } });
  }

  res.status(204).end();
});

// GET /api/spots/:slug/visits
lockersRouter.get("/spots/:slug/visits", requireAuth, async (req, res) => {
  const { userId } = auth(req);
  const spot = await prisma.spot.findUnique({ where: { slug: req.params.slug } });
  if (!spot) return res.status(404).json({ error: "Spot not found." });
  const visits = await prisma.visitEntry.findMany({
    where: { userId, spotId: spot.id },
    orderBy: { visitDate: "desc" },
  });
  res.json({ visits: visits.map(serializeVisit) });
});

// GET /api/visits
lockersRouter.get("/visits", requireAuth, async (req, res) => {
  const { userId } = auth(req);
  const visits = await prisma.visitEntry.findMany({
    where: { userId },
    include: { spot: true },
    orderBy: { visitDate: "desc" },
  });
  res.json({ visits: visits.map(serializeVisitWithSpot) });
});

// POST /api/spots/:slug/visits
lockersRouter.post("/spots/:slug/visits", requireAuth, async (req, res) => {
  const { userId } = auth(req);
  const parsed = visitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Complete the visit entry." });
  const spot = await prisma.spot.findUnique({ where: { slug: req.params.slug } });
  if (!spot) return res.status(404).json({ error: "Spot not found." });

  const visitDate = new Date(parsed.data.visitDate);
  if (Number.isNaN(visitDate.getTime())) {
    return res.status(400).json({ error: "Choose a valid visit date." });
  }

  const defaultLockerId = await getDefaultLockerId(userId);
  await prisma.$transaction(async (tx) => {
    await tx.savedSpot.upsert({
      where: { spotId_userId: { spotId: spot.id, userId } },
      update: {},
      create: { spotId: spot.id, userId },
    });
    await tx.lockerSpot.upsert({
      where: { lockerId_spotId: { lockerId: defaultLockerId, spotId: spot.id } },
      update: {},
      create: { lockerId: defaultLockerId, spotId: spot.id },
    });
  });

  const visit = await prisma.visitEntry.create({
    data: {
      userId,
      spotId: spot.id,
      visitDate,
      rating: parsed.data.rating,
      note: parsed.data.note || null,
      favoriteItem: parsed.data.favoriteItem || null,
      companion: parsed.data.companion || null,
      wouldReturn: parsed.data.wouldReturn,
    },
  });
  res.status(201).json({ visit: serializeVisit(visit) });
});

// PATCH /api/visits/:visitId
lockersRouter.patch("/visits/:visitId", requireAuth, async (req, res) => {
  const { userId } = auth(req);
  const parsed = visitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Complete the visit entry." });
  const existing = await prisma.visitEntry.findFirst({
    where: { id: req.params.visitId, userId },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: "Visit entry not found." });
  const visitDate = new Date(parsed.data.visitDate);
  if (Number.isNaN(visitDate.getTime())) {
    return res.status(400).json({ error: "Choose a valid visit date." });
  }
  const visit = await prisma.visitEntry.update({
    where: { id: req.params.visitId },
    data: {
      visitDate,
      rating: parsed.data.rating,
      note: parsed.data.note || null,
      favoriteItem: parsed.data.favoriteItem || null,
      companion: parsed.data.companion || null,
      wouldReturn: parsed.data.wouldReturn,
    },
  });
  res.json({ visit: serializeVisit(visit) });
});

// DELETE /api/visits/:visitId
lockersRouter.delete("/visits/:visitId", requireAuth, async (req, res) => {
  const { userId } = auth(req);
  const existing = await prisma.visitEntry.findFirst({
    where: { id: req.params.visitId, userId },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: "Visit entry not found." });
  await prisma.visitEntry.delete({ where: { id: req.params.visitId } });
  res.status(204).end();
});

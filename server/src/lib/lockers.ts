import type { Locker, LockerSpot, Spot, VisitEntry } from "@prisma/client";
import { prisma } from "../prisma.js";
import { serializeSpotSummary, type SpotWithReviews } from "./serialize.js";

const DEFAULT_LOCKERS = [
  { name: "Want to Try", description: "Places to keep in play for a future pull." },
  { name: "Favourites", description: "The places you would confidently repeat." },
  { name: "Date Night", description: "Good rooms for two-person plans." },
  { name: "Coffee", description: "Cafes for work blocks, resets, and catch-ups." },
];

type LockerWithItems = Locker & {
  items: Array<LockerSpot & { spot: SpotWithReviews }>;
};

type VisitWithSpot = VisitEntry & { spot?: Spot };

export async function ensureDefaultLockers(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultLockersCreated: true },
  });
  if (!user || user.defaultLockersCreated) return;

  await prisma.$transaction(async (tx) => {
    for (const locker of DEFAULT_LOCKERS) {
      await tx.locker.upsert({
        where: { userId_name: { userId, name: locker.name } },
        update: {},
        create: { userId, ...locker },
      });
    }
    await tx.user.update({
      where: { id: userId },
      data: { defaultLockersCreated: true },
    });
  });
}

export async function getDefaultLockerId(userId: string) {
  await ensureDefaultLockers(userId);
  const locker = await prisma.locker.findFirst({
    where: { userId, name: "Want to Try" },
    select: { id: true },
  });
  if (locker) return locker.id;
  const created = await prisma.locker.create({
    data: { userId, name: "Want to Try", description: DEFAULT_LOCKERS[0].description },
    select: { id: true },
  });
  return created.id;
}

export function serializeVisit(entry: VisitEntry) {
  return {
    id: entry.id,
    spotId: entry.spotId,
    visitDate: entry.visitDate.toISOString(),
    rating: entry.rating,
    note: entry.note,
    favoriteItem: entry.favoriteItem,
    companion: entry.companion,
    wouldReturn: entry.wouldReturn,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export function serializeVisitWithSpot(entry: VisitWithSpot) {
  return {
    ...serializeVisit(entry),
    spot: entry.spot
      ? {
          id: entry.spot.id,
          slug: entry.spot.slug,
          name: entry.spot.name,
          area: entry.spot.area,
          cuisine: entry.spot.cuisine,
          price: entry.spot.price,
        }
      : undefined,
  };
}

export function serializeLockerSummary(locker: LockerWithItems) {
  return {
    id: locker.id,
    name: locker.name,
    description: locker.description,
    itemCount: locker.items.length,
    visitedCount: 0,
    createdAt: locker.createdAt.toISOString(),
    updatedAt: locker.updatedAt.toISOString(),
  };
}

export function serializeLockerDetail(
  locker: LockerWithItems,
  savedSpotIds: Set<string>,
  visitsBySpot: Map<string, VisitEntry[]>
) {
  const visitedCount = locker.items.filter((item) => (visitsBySpot.get(item.spotId) ?? []).length > 0).length;
  return {
    ...serializeLockerSummary(locker),
    visitedCount,
    items: locker.items.map((item) => ({
      id: item.id,
      createdAt: item.createdAt.toISOString(),
      spot: serializeSpotSummary(item.spot, savedSpotIds.has(item.spotId)),
      visits: (visitsBySpot.get(item.spotId) ?? []).map(serializeVisit),
    })),
  };
}

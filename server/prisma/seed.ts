import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient, type Tier, type Category } from "@prisma/client";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, "../../data/spots.seed.json");

interface RawSpot {
  name: string;
  category: Category;
  cuisine?: string | null;
  price?: string | null;
  tier?: Tier | null;
  address?: string | null;
  area?: string | null;
  lat?: number | null;
  lng?: number | null;
  notes?: string | null;
  wishlist?: boolean;
  needsReview?: boolean;
  coverImageUrl?: string | null;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function googleMapsUrl(name: string, address?: string | null) {
  const q = address && address.toLowerCase() !== "singapore"
    ? `${name}, ${address}`
    : `${name}, Singapore`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

async function main() {
  const db = JSON.parse(fs.readFileSync(DATA, "utf8")) as { spots: RawSpot[] };
  const raw = db.spots;

  console.log("Clearing existing data…");
  await prisma.visitEntry.deleteMany();
  await prisma.lockerSpot.deleteMany();
  await prisma.locker.deleteMany();
  await prisma.review.deleteMany();
  await prisma.savedSpot.deleteMany();
  await prisma.spot.deleteMany();
  await prisma.otpCode.deleteMany();

  const usedSlugs = new Set<string>();
  let spotCount = 0;

  for (const r of raw) {
    let slug = slugify(r.name);
    if (usedSlugs.has(slug)) slug = `${slug}-${r.category}`;
    while (usedSlugs.has(slug)) slug = `${slug}-${Math.floor(Math.random() * 90 + 10)}`;
    usedSlugs.add(slug);

    const isWishlist = Boolean(r.wishlist) || !r.tier;
    const tier = r.tier ?? null;

    const spot = await prisma.spot.create({
      data: {
        slug,
        name: r.name,
        category: r.category,
        cuisine: r.cuisine ?? null,
        price: r.price ?? null,
        address: r.address ?? null,
        area: r.area ?? null,
        lat: typeof r.lat === "number" ? r.lat : null,
        lng: typeof r.lng === "number" ? r.lng : null,
        googleMapsUrl: googleMapsUrl(r.name, r.address),
        ownerTier: tier,
        ownerScore: null,
        ownerVerdict: null,
        notes: r.notes ?? null,
        wishlist: isWishlist,
        needsReview: Boolean(r.needsReview),
        coverImageUrl: r.coverImageUrl ?? null,
      },
    });
    spotCount++;
  }

  console.log(`Seeded ${spotCount} spots. Reviews begin empty and are created by members.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

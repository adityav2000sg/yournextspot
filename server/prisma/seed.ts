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
}

const TIER_SCORE: Record<Tier, [number, number]> = {
  everyday_delight: [6.8, 7.8],
  thoughtful_treat: [7.5, 8.3],
  memorable_occasion: [8.1, 8.9],
  landmark_celebration: [8.7, 9.4],
  crown_jewel: [9.3, 9.8],
};

const TIER_ORDER: Tier[] = [
  "everyday_delight",
  "thoughtful_treat",
  "memorable_occasion",
  "landmark_celebration",
  "crown_jewel",
];

const AUTHORS = [
  "Aravind", "Mei Ling", "Priya", "Daniel Tan", "Sofia", "Marcus", "Hui Wen",
  "Rachel", "Imran", "Chloe", "Wei Jie", "Natasha", "Arjun", "Grace Lim",
  "Kenneth", "Farah", "Sam", "Jia Hui", "Olivia", "Ravi", "Bryan", "Nadia",
  "Cheryl", "Aditya", "Shaun", "Megan", "Yusuf", "Tessa", "Darren", "Lakshmi",
];

const VERDICTS_BY_TIER: Record<Tier, string[]> = {
  everyday_delight: [
    "My reliable weekday go-to.",
    "Never overthought, never disappointed.",
    "Easy, consistent, always hits.",
    "The kind of place you end up at twice a week.",
    "Unfussy and quietly excellent.",
  ],
  thoughtful_treat: [
    "Worth the little detour.",
    "A small upgrade on the usual, well spent.",
    "Lovely for a low-key catch-up.",
    "Punches above its price.",
    "The kind of treat you don't feel guilty about.",
  ],
  memorable_occasion: [
    "Perfect for a date that needs to go well.",
    "Brought friends here and looked like a hero.",
    "The room does half the work, the food does the rest.",
    "Exactly the right amount of special.",
    "We stayed three hours and didn't notice.",
  ],
  landmark_celebration: [
    "Save it for the night that matters.",
    "Worth the splurge, genuinely.",
    "Felt like an event from the first pour.",
    "The kind of meal you talk about for weeks.",
    "Big night out, fully delivered.",
  ],
  crown_jewel: [
    "One of the best in the city, full stop.",
    "A genuine once-in-a-while pilgrimage.",
    "Flawless from start to finish.",
    "If you go once a year, make it here.",
    "Still thinking about it.",
  ],
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function googleMapsUrl(name: string, address?: string | null) {
  const q = address && address.toLowerCase() !== "singapore"
    ? `${name}, ${address}`
    : `${name}, Singapore`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function nearbyTier(tier: Tier): Tier {
  const i = TIER_ORDER.indexOf(tier);
  const shift = Math.random() < 0.7 ? 0 : Math.random() < 0.5 ? -1 : 1;
  const j = Math.min(TIER_ORDER.length - 1, Math.max(0, i + shift));
  return TIER_ORDER[j];
}

async function main() {
  const db = JSON.parse(fs.readFileSync(DATA, "utf8")) as { spots: RawSpot[] };
  const raw = db.spots;

  console.log("Clearing existing data…");
  await prisma.review.deleteMany();
  await prisma.savedSpot.deleteMany();
  await prisma.spot.deleteMany();
  await prisma.otpCode.deleteMany();

  const usedSlugs = new Set<string>();
  let spotCount = 0;
  let reviewCount = 0;

  for (const r of raw) {
    let slug = slugify(r.name);
    if (usedSlugs.has(slug)) slug = `${slug}-${r.category}`;
    while (usedSlugs.has(slug)) slug = `${slug}-${Math.floor(Math.random() * 90 + 10)}`;
    usedSlugs.add(slug);

    const isWishlist = Boolean(r.wishlist) || !r.tier;
    const tier = r.tier ?? null;

    let ownerScore: number | null = null;
    let ownerVerdict: string | null = null;
    if (!isWishlist && tier) {
      const [lo, hi] = TIER_SCORE[tier];
      ownerScore = round1(rand(lo, hi));
      ownerVerdict = pick(VERDICTS_BY_TIER[tier]);
    }

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
        ownerScore,
        ownerVerdict,
        notes: r.notes ?? null,
        wishlist: isWishlist,
        needsReview: Boolean(r.needsReview),
      },
    });
    spotCount++;

    // Seed believable community reviews for rated (non-wishlist) spots.
    if (!isWishlist && tier && ownerScore != null) {
      const n = Math.floor(rand(2, 7));
      const authors = [...AUTHORS].sort(() => Math.random() - 0.5).slice(0, n);
      for (const author of authors) {
        const reviewTier = nearbyTier(tier);
        const score = round1(
          Math.min(10, Math.max(4.5, ownerScore + rand(-0.9, 0.7)))
        );
        await prisma.review.create({
          data: {
            spotId: spot.id,
            authorName: author,
            score,
            tier: reviewTier,
            verdict: pick(VERDICTS_BY_TIER[reviewTier]),
            wouldReturn: Math.random() > 0.12,
            isSeed: true,
          },
        });
        reviewCount++;
      }
    }
  }

  console.log(`Seeded ${spotCount} spots and ${reviewCount} reviews.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

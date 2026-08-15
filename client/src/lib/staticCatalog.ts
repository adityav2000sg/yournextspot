import seed from "../../../data/spots.seed.json";
import type { Category, ConciergeResponse, Spot, Tier } from "../types";
import type { SpotQuery } from "../api";
import { categoryTimeScore, getSingaporeTimeContext } from "./timeContext";

type RawSpot = {
  name: string;
  category: Category;
  cuisine?: string | null;
  price?: string | null;
  tier?: Tier | null;
  address?: string | null;
  area?: string | null;
  lat?: number | null;
  lng?: number | null;
  slug?: string;
  wishlist?: boolean;
  needsReview?: boolean;
  coverImageUrl?: string | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function googleMapsUrl(name: string, address?: string | null) {
  const query = address && address.toLowerCase() !== "singapore" ? `${name}, ${address}` : `${name}, Singapore`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function toSpot(raw: RawSpot): Spot {
  const slug = raw.slug ?? slugify(raw.name);
  const wishlist = Boolean(raw.wishlist) || !raw.tier;
  const ownerTier = raw.tier ?? null;
  const ownerScore = null;

  return {
    id: `static-${slug}`,
    slug,
    name: raw.name,
    category: raw.category,
    cuisine: raw.cuisine ?? null,
    price: raw.price ?? null,
    address: raw.address ?? null,
    area: raw.area ?? null,
    lat: typeof raw.lat === "number" ? raw.lat : null,
    lng: typeof raw.lng === "number" ? raw.lng : null,
    googleMapsUrl: googleMapsUrl(raw.name, raw.address),
    ownerTier,
    ownerScore,
    ownerVerdict: null,
    notes: null,
    wishlist,
    needsReview: Boolean(raw.needsReview),
    coverImageUrl: raw.coverImageUrl ?? null,
    saved: false,
    reviewCount: 0,
    avgScore: null,
    communityTier: null,
    reviews: [],
    photos: [],
  };
}

export const staticSpots: Spot[] = (seed.spots as RawSpot[])
  .map(toSpot)
  .sort((a, b) => {
    if (a.wishlist !== b.wishlist) return a.wishlist ? 1 : -1;
    return (b.ownerScore ?? 0) - (a.ownerScore ?? 0) || a.name.localeCompare(b.name);
  });

export function filterStaticSpots(q: SpotQuery = {}) {
  const search = q.search?.trim().toLowerCase();

  return staticSpots.filter((spot) => {
    if (q.category && q.category !== "all" && spot.category !== q.category) return false;
    if (q.tier && q.tier !== "all" && spot.ownerTier !== q.tier) return false;
    if (q.area && q.area !== "all" && spot.area !== q.area) return false;
    if (q.price && q.price !== "all" && spot.price !== q.price) return false;
    if (q.visited === "reviewed" && spot.wishlist) return false;
    if (q.visited === "wishlist" && !spot.wishlist) return false;
    if (search) {
      const haystack = [
        spot.name,
        spot.cuisine,
        spot.area,
        spot.price,
        spot.address,
        spot.category,
        spot.ownerTier,
        spot.ownerVerdict,
        spot.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export function staticAreas() {
  return [...new Set(staticSpots.map((spot) => spot.area).filter(Boolean) as string[])].sort();
}

export function staticSpot(slug: string) {
  const spot = staticSpots.find((s) => s.slug === slug);
  if (!spot) throw new Error("Spot not found.");
  return spot;
}

export function staticRandom(q: SpotQuery = {}) {
  const matches = filterStaticSpots(q);
  if (matches.length === 0) throw new Error("No spots match those filters.");
  const context = getSingaporeTimeContext();
  const ranked = matches
    .map((spot) => {
      let score = spot.ownerScore ?? 6.4;
      score += categoryTimeScore(spot.category, context.block) * 1.15;
      score += spot.wishlist ? 0.2 : 0.8;
      if (spot.saved) score += 0.7;
      return { spot, score: score + Math.random() * 0.75 };
    })
    .sort((a, b) => b.score - a.score);
  return ranked.slice(0, Math.min(8, ranked.length))[Math.floor(Math.random() * Math.min(4, ranked.length))].spot;
}

export function staticConcierge(prompt: string): ConciergeResponse {
  const text = prompt.toLowerCase();

  if (isLowIntentPrompt(text)) {
    return {
      mood: "What kind of spot do you need: coffee, dinner, drinks, date, client, budget, or area?",
      picks: [],
      spots: [],
      source: "clarification",
      suggestions: [
        "quiet coffee with my laptop",
        "first date, not too loud",
        "client lunch tomorrow",
        "late drinks around Tanjong Pagar",
        "cheap dinner under $30",
      ],
    };
  }

  const scored = staticSpots
    .map((spot) => {
      let score = spot.ownerScore ?? 6;
      if (text.includes("coffee") || text.includes("laptop") || text.includes("cafe")) score += spot.category === "coffee" ? 3 : 0;
      if (text.includes("drink") || text.includes("cocktail") || text.includes("bar")) score += spot.category === "bar" ? 3 : 0;
      if (text.includes("dinner") || text.includes("lunch") || text.includes("date")) score += spot.category === "restaurant" ? 2 : 0;
      if (text.includes("cheap") || text.includes("casual")) score += spot.price === "$" || spot.price === "$$" ? 1.5 : 0;
      if (text.includes("client") || text.includes("celebrat")) score += spot.ownerTier === "landmark_celebration" || spot.ownerTier === "crown_jewel" ? 2 : 0;
      return { spot, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    mood: buildStaticMood(text),
    picks: scored.map(({ spot }) => ({
      slug: spot.slug,
      reason: staticReason(spot, text),
    })),
    spots: scored.map(({ spot }) => spot),
    source: "local",
  };
}

function isLowIntentPrompt(text: string) {
  const words = text.replace(/[^\p{L}\p{N}$]+/gu, " ").trim().split(/\s+/).filter(Boolean);
  const lowIntent = new Set(["hi", "hello", "hey", "yo", "sup", "ok", "okay", "test", "help"]);
  return words.length === 0 || (words.length <= 2 && words.every((word) => lowIntent.has(word)));
}

function buildStaticMood(text: string) {
  if (text.includes("client")) return "For a client, I would keep it polished, calm, and high-confidence.";
  if (text.includes("date")) return "For a date, I would pick somewhere warm, memorable, and not too loud.";
  if (text.includes("coffee") || text.includes("laptop")) return "For coffee, I would bias toward calmer spots that are easy to settle into.";
  if (text.includes("drink") || text.includes("bar") || text.includes("cocktail")) return "For drinks, I would pick places with stronger evening energy.";
  if (text.includes("cheap") || text.includes("budget")) return "For budget, I would keep this easy, casual, and still worth the trip.";
  return "Here are three clean picks from your atlas for this vibe.";
}

function staticReason(spot: Spot, text: string) {
  if (text.includes("client") && (spot.ownerTier === "landmark_celebration" || spot.ownerTier === "crown_jewel")) {
    return "High-confidence room for making the plan feel considered.";
  }
  if (text.includes("date") && spot.ownerTier === "memorable_occasion") {
    return "Special enough for a date without feeling overdone.";
  }
  if ((text.includes("coffee") || text.includes("laptop")) && spot.category === "coffee") {
    return "Fits a coffee-first plan and keeps the decision simple.";
  }
  if ((text.includes("drink") || text.includes("bar") || text.includes("cocktail")) && spot.category === "bar") {
    return "Better aligned with an after-dinner drinks plan.";
  }
  if ((text.includes("cheap") || text.includes("budget")) && (spot.price === "$" || spot.price === "$$")) {
    return "Keeps the spend sensible without turning into a compromise.";
  }
  return spot.ownerVerdict ?? ([spot.cuisine, spot.area].filter(Boolean).join(" · ") || "A strong fit from the atlas.");
}

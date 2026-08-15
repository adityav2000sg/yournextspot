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

type StaticIntent = {
  coffee: boolean;
  bar: boolean;
  eat: boolean;
  date: boolean;
  cheap: boolean;
  fancy: boolean;
  novelty: boolean;
  cozy: boolean;
  work: boolean;
  openNow: boolean;
};

export function staticConcierge(
  prompt: string,
  excludeSlugs: string[] = []
): ConciergeResponse {
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

  const intent = parseStaticIntent(text);
  const excluded = new Set(excludeSlugs);
  const area =
    staticAreas().find((candidate) => text.includes(candidate.toLowerCase())) ??
    (/\b(east coast|east side)\b/.test(text) ? "Katong" : undefined);
  const categoryIntent = intent.coffee
    ? "coffee"
    : intent.bar
      ? "bar"
      : intent.eat
        ? "restaurant"
        : null;

  const scored = staticSpots
    .map((spot) => {
      let score = spot.wishlist ? 1.2 : 2;

      if (categoryIntent) {
        score += spot.category === categoryIntent ? 10 : -12;
      }
      if (intent.date) {
        score += tierWeight(spot.ownerTier, {
          memorable_occasion: 5,
          thoughtful_treat: 3.5,
          landmark_celebration: 1.5,
          crown_jewel: 0.5,
          everyday_delight: -0.5,
        });
      }
      if (intent.coffee && intent.date && spot.ownerTier === "thoughtful_treat") {
        score += 3;
      }
      if (intent.fancy) {
        score += tierWeight(spot.ownerTier, {
          crown_jewel: 5,
          landmark_celebration: 4.5,
          memorable_occasion: 2.5,
          thoughtful_treat: 0.5,
          everyday_delight: -2,
        });
      }
      if (intent.cheap) {
        score += spot.price === "$" ? 5 : spot.price === "$$" ? 3 : -3;
      }
      if (intent.novelty) score += spot.wishlist ? 6 : -0.5;
      if (intent.cozy && spot.ownerTier === "thoughtful_treat") score += 1.5;
      if (intent.work && spot.ownerTier === "everyday_delight") score += 1.5;
      if (area) score += spot.area === area ? 7 : -1;
      if (spot.cuisine && text.includes(spot.cuisine.toLowerCase())) score += 5;
      if (text.includes(spot.name.toLowerCase())) score += 8;
      if (spot.needsReview) score -= 1;
      if (excluded.has(spot.slug)) score -= 30;

      // Stable prompt-specific variation means a genuinely new request can
      // reshape the shortlist without random results jumping on every render.
      score += stableNoise(`${text}:${spot.slug}`) * 1.4;
      return { spot, score };
    })
    .sort((a, b) => b.score - a.score);

  const selected = selectDiversePicks(scored, Boolean(categoryIntent), 3);

  return {
    mood: buildStaticMood(intent, area),
    picks: selected.map(({ spot }) => ({
      slug: spot.slug,
      reason: staticReason(spot, intent, area),
    })),
    spots: selected.map(({ spot }) => spot),
    source: "offline",
  };
}

function parseStaticIntent(text: string): StaticIntent {
  return {
    coffee: /\b(coffee|cafe|café|espresso|latte|matcha)\b/.test(text),
    bar: /\b(drinks?|cocktails?|bars?|wine|beer|night ?cap|whisky)\b/.test(text),
    eat: /\b(eat|food|dinner|lunch|brunch|breakfast|hungry|meal|pasta|steak)\b/.test(text),
    date: /\b(date|girlfriend|boyfriend|partner|romantic|anniversary)\b/.test(text),
    cheap: /\b(cheap|budget|affordable|value|casual|inexpensive|under \$?\d+)\b/.test(text) || /don'?t want to spend|not spend(?:ing)? (?:too |a )?lot/.test(text),
    fancy: /\b(client|impress|fancy|splurge|celebrat\w*|birthday|promotion|special)\b/.test(text),
    novelty: /\b(new|different|else|surprise|truly new|haven'?t|never been|try|explore|adventur\w*)\b/.test(text),
    cozy: /\b(cozy|cosy|quiet|chill|relax\w*|intimate|calm|not too loud)\b/.test(text),
    work: /\b(laptop|work|study|meeting)\b/.test(text),
    openNow: /\b(open now|open at|still open|opening hours?)\b/.test(text),
  };
}

function tierWeight(tier: Tier | null, weights: Partial<Record<Tier, number>>) {
  return tier ? weights[tier] ?? 0 : 0;
}

function stableNoise(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

function selectDiversePicks(
  scored: { spot: Spot; score: number }[],
  hasCategoryIntent: boolean,
  limit: number
) {
  if (hasCategoryIntent) return scored.slice(0, limit);

  const selected: typeof scored = [];
  const categories = new Set<Category>();
  for (const candidate of scored) {
    if (categories.has(candidate.spot.category)) continue;
    selected.push(candidate);
    categories.add(candidate.spot.category);
    if (selected.length === limit) return selected;
  }
  for (const candidate of scored) {
    if (selected.includes(candidate)) continue;
    selected.push(candidate);
    if (selected.length === limit) break;
  }
  return selected;
}

function isLowIntentPrompt(text: string) {
  const words = text.replace(/[^\p{L}\p{N}$]+/gu, " ").trim().split(/\s+/).filter(Boolean);
  const lowIntent = new Set(["hi", "hello", "hey", "yo", "sup", "ok", "okay", "test", "help"]);
  return words.length === 0 || (words.length <= 2 && words.every((word) => lowIntent.has(word)));
}

function buildStaticMood(intent: StaticIntent, area?: string) {
  const where = area ? ` around ${area}` : "";
  if (intent.openNow) return `These fit the brief${where}; live opening data is not connected yet, so confirm hours before leaving.`;
  if (intent.coffee && intent.date) return `Coffee with someone you like calls for a place with a little character${where}.`;
  if (intent.fancy) return `Keep it polished, calm, and high-confidence${where}.`;
  if (intent.date) return `Choose somewhere warm and memorable, without making the plan feel overdone${where}.`;
  if (intent.coffee && intent.work) return `A calmer coffee spot where settling in for a while feels natural${where}.`;
  if (intent.coffee) return `Three coffee stops worth making the plan around${where}.`;
  if (intent.bar) return `Three places with the right energy for a proper drink${where}.`;
  if (intent.cheap) return `Keep it easy on the wallet without turning dinner into a compromise${where}.`;
  if (intent.novelty) return `Three genuinely different directions from the places you have already seen${where}.`;
  return `Three distinct ways to make the plan work${where}.`;
}

function staticReason(spot: Spot, intent: StaticIntent, area?: string) {
  if (intent.fancy && (spot.ownerTier === "landmark_celebration" || spot.ownerTier === "crown_jewel")) {
    return "High-confidence room for making the plan feel considered.";
  }
  if (intent.coffee && intent.date && spot.category === "coffee") {
    return "A more considered coffee stop for an afternoon together.";
  }
  if (intent.date && spot.ownerTier === "memorable_occasion") {
    return "Special enough for a date without feeling overdone.";
  }
  if (intent.coffee && spot.category === "coffee") {
    return intent.work
      ? "Coffee-first and better suited to staying for more than one cup."
      : "A coffee-first choice with enough character to feel intentional.";
  }
  if (intent.bar && spot.category === "bar") {
    return "Better aligned with an after-dinner drinks plan.";
  }
  if (intent.cheap && (spot.price === "$" || spot.price === "$$")) {
    return "Keeps the spend sensible without turning into a compromise.";
  }
  if (intent.novelty && spot.wishlist) {
    return `A fresh direction from the to-try list${spot.area ? ` in ${spot.area}` : ""}.`;
  }
  if (area && spot.area === area) return `A strong match without pulling you away from ${area}.`;
  return spot.ownerVerdict ?? ([spot.cuisine, spot.area].filter(Boolean).join(" · ") || "A strong fit from the atlas.");
}

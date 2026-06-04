import type { Tier, Category } from "../types";

export interface TierMeta {
  key: Tier;
  label: string;
  short: string;
  glyph: string;
  rank: number;
  blurb: string;
  from: string;
  to: string;
}

/**
 * The signature "star system": five occasion-tiers instead of flat stars.
 * Each has a crest glyph and a gradient used across cards + share images.
 */
export const TIERS: Record<Tier, TierMeta> = {
  everyday_delight: {
    key: "everyday_delight",
    label: "Everyday Delight",
    short: "Everyday",
    glyph: "✦",
    rank: 1,
    blurb: "An easy yes. Reliable, unfussy, always good.",
    from: "#52d1c7",
    to: "#3a8f9c",
  },
  thoughtful_treat: {
    key: "thoughtful_treat",
    label: "Thoughtful Treat",
    short: "Treat",
    glyph: "✧✦",
    rank: 2,
    blurb: "A small step up. Worth the little detour.",
    from: "#7fd1a8",
    to: "#e9c46a",
  },
  memorable_occasion: {
    key: "memorable_occasion",
    label: "Memorable Occasion",
    short: "Occasion",
    glyph: "✦✦✦",
    rank: 3,
    blurb: "For the dates, the catch-ups, the celebrations.",
    from: "#e9c46a",
    to: "#ef6f53",
  },
  landmark_celebration: {
    key: "landmark_celebration",
    label: "Landmark Celebration",
    short: "Landmark",
    glyph: "✦✦✦✦",
    rank: 4,
    blurb: "Mark the calendar. The big-night-out tier.",
    from: "#ef6f53",
    to: "#b48cff",
  },
  crown_jewel: {
    key: "crown_jewel",
    label: "Crown Jewel",
    short: "Crown",
    glyph: "♛",
    rank: 5,
    blurb: "The rarest tier. A genuine once-in-a-while.",
    from: "#b48cff",
    to: "#e9c46a",
  },
};

export const TIER_ORDER: Tier[] = [
  "everyday_delight",
  "thoughtful_treat",
  "memorable_occasion",
  "landmark_celebration",
  "crown_jewel",
];

export const CATEGORY_META: Record<
  Category,
  { label: string; plural: string; glyph: string; verb: string }
> = {
  restaurant: { label: "Restaurant", plural: "Restaurants", glyph: "🍽️", verb: "eat" },
  coffee: { label: "Coffee", plural: "Coffee", glyph: "☕", verb: "sip" },
  bar: { label: "Bar", plural: "Bars", glyph: "🍸", verb: "drink" },
};

export function tierMeta(tier: Tier | null | undefined): TierMeta | null {
  if (!tier) return null;
  return TIERS[tier] ?? null;
}

export function scoreToTier(score: number): Tier {
  if (score >= 9.2) return "crown_jewel";
  if (score >= 8.3) return "landmark_celebration";
  if (score >= 7.2) return "memorable_occasion";
  if (score >= 6) return "thoughtful_treat";
  return "everyday_delight";
}

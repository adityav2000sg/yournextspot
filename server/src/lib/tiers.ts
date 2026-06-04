import type { Tier } from "@prisma/client";

export const TIER_ORDER: Tier[] = [
  "everyday_delight",
  "thoughtful_treat",
  "memorable_occasion",
  "landmark_celebration",
  "crown_jewel",
];

export function scoreToTier(score: number): Tier {
  if (score >= 9.2) return "crown_jewel";
  if (score >= 8.3) return "landmark_celebration";
  if (score >= 7.2) return "memorable_occasion";
  if (score >= 6) return "thoughtful_treat";
  return "everyday_delight";
}

import type { Spot } from "../types";
import type { SpotQuery } from "../api";
import { CATEGORY_META, tierMeta } from "./tiers";
import {
  categoryModeLabel,
  evaluateTimeFit,
  getSingaporeTimeContext,
  type SingaporeTimeContext,
  type SpotTimeFit,
} from "./timeContext";

export type DecisionTone = "aqua" | "gilt" | "mist" | "orchid" | "ember";

export interface DecisionChip {
  label: string;
  tone: DecisionTone;
}

export interface RankedSpot {
  spot: Spot;
  score: number;
  reason: string;
  timeFit: SpotTimeFit;
}

export interface AlternativeDecision {
  spot: Spot;
  reason: string;
  timeFit: SpotTimeFit;
}

export function scoreOf(spot: Spot) {
  return spot.reviewCount > 0 ? spot.avgScore ?? null : null;
}

export function describeFilters(filters: SpotQuery): DecisionChip[] {
  const chips: DecisionChip[] = [];
  if (filters.category && filters.category !== "all") {
    chips.push({
      label: CATEGORY_META[filters.category].plural,
      tone: "aqua",
    });
  }
  if (filters.visited === "wishlist") chips.push({ label: "Try-list", tone: "gilt" });
  if (filters.visited === "reviewed") chips.push({ label: "Reviewed", tone: "aqua" });
  if (filters.tier && filters.tier !== "all") {
    chips.push({ label: tierMeta(filters.tier)?.short ?? "Tier", tone: "orchid" });
  }
  if (filters.price && filters.price !== "all") {
    chips.push({ label: filters.price, tone: "gilt" });
  }
  if (filters.area && filters.area !== "all") {
    chips.push({ label: filters.area, tone: "mist" });
  }
  if (filters.search?.trim()) {
    chips.push({ label: `"${filters.search.trim()}"`, tone: "mist" });
  }
  return chips;
}

export function timeContextChips(context: SingaporeTimeContext): DecisionChip[] {
  return [
    { label: context.modeLabel, tone: "aqua" },
    { label: "SGT live", tone: "mist" },
  ];
}

export function fitChips(
  spot: Spot,
  filters: SpotQuery = {},
  context: SingaporeTimeContext = getSingaporeTimeContext()
): DecisionChip[] {
  const chips: DecisionChip[] = [];
  const score = scoreOf(spot);
  const tier = tierMeta(spot.ownerTier ?? spot.communityTier);
  const timeFit = evaluateTimeFit(spot, context);

  if (filters.category && filters.category !== "all" && spot.category === filters.category) {
    chips.push({ label: `Matches ${CATEGORY_META[spot.category].verb}`, tone: "aqua" });
  } else {
    chips.push({ label: CATEGORY_META[spot.category].label, tone: "aqua" });
  }

  chips.push({ label: timeFit.label, tone: timeFit.tone });
  chips.push({ label: timeFit.hoursLabel, tone: "mist" });

  if (filters.area && filters.area !== "all" && spot.area === filters.area) {
    chips.push({ label: `In ${spot.area}`, tone: "mist" });
  } else if (spot.area) {
    chips.push({ label: spot.area, tone: "mist" });
  }

  if (filters.price && filters.price !== "all" && spot.price === filters.price) {
    chips.push({ label: `Fits ${spot.price}`, tone: "gilt" });
  } else if (spot.price) {
    chips.push({ label: spot.price, tone: "gilt" });
  }

  if (tier) chips.push({ label: tier.short, tone: "orchid" });
  if (score != null && score >= 9) chips.push({ label: "Top score", tone: "gilt" });
  else if (score != null && score >= 8.5) chips.push({ label: "Strong score", tone: "aqua" });
  if (spot.saved) chips.push({ label: "Saved", tone: "gilt" });
  else if (spot.wishlist) chips.push({ label: "On the try-list", tone: "gilt" });
  else if (spot.reviewCount > 0) chips.push({ label: "Member reviewed", tone: "mist" });
  else chips.push({ label: "In the guide", tone: "mist" });

  return uniqueChips(chips).slice(0, 8);
}

export function decisionBrief(
  spot: Spot,
  context: SingaporeTimeContext = getSingaporeTimeContext()
) {
  const score = scoreOf(spot);
  const tier = tierMeta(spot.ownerTier ?? spot.communityTier);
  const timeFit = evaluateTimeFit(spot, context);
  const scoreLabel =
    score == null
      ? "Unscored"
      : score >= 9
        ? "Exceptional"
        : score >= 8.3
          ? "Very strong"
          : score >= 7
            ? "Reliable"
            : "Easygoing";

  const bestFor =
    spot.category === "coffee"
      ? "Laptop time, low-friction catch-ups, and a quiet reset."
      : spot.category === "bar"
        ? "Drinks, decompression, and keeping the night moving."
        : tier?.rank && tier.rank >= 4
          ? "Client confidence, celebrations, and high-stakes dinner plans."
          : tier?.rank === 3
            ? "Dates, small celebrations, and catch-ups that need a little polish."
            : "Casual meals when the group needs an easy yes.";

  const baseCaveat = spot.wishlist
    ? "This is still on the try-list, so treat it as a little more exploratory."
    : spot.needsReview
      ? "It has a score, but it still needs a sharper fresh verdict."
      : "Low planning risk: there is enough signal to make the call.";

  const whyGo = spot.reviewCount > 0
    ? `People in the shared atlas have rated this ${score?.toFixed(1) ?? "place"} out of 10.`
    : ([spot.cuisine, spot.area, spot.price].filter(Boolean).join(" · ") || "A place from the shared guide.");

  const caveat = `${baseCaveat} ${timeFit.hoursDetail}`;

  return {
    scoreLabel,
    bestFor,
    caveat,
    whyGo,
    timeReason: timeFit.reason,
    timeSignal: timeFit.label,
    hoursLabel: timeFit.hoursLabel,
  };
}

export function rankSpotsForPull(
  pool: Spot[],
  filters: SpotQuery = {},
  context: SingaporeTimeContext = getSingaporeTimeContext()
): RankedSpot[] {
  return pool
    .filter((spot) => matchesFrontendFilters(spot, filters))
    .map((spot) => {
      const timeFit = evaluateTimeFit(spot, context);
      const directScore = scoreOf(spot);
      let score = directScore ?? 6.4;

      score += timeFit.score * 1.15;
      if (filters.category && filters.category !== "all" && spot.category === filters.category) score += 1.5;
      if (filters.area && filters.area !== "all" && spot.area === filters.area) score += 0.9;
      if (filters.price && filters.price !== "all" && spot.price === filters.price) score += 0.7;
      if (filters.tier && filters.tier !== "all" && spot.ownerTier === filters.tier) score += 0.9;
      if (filters.visited === "wishlist") score += spot.wishlist ? 1.8 : -1.2;
      else if (filters.visited === "reviewed") score += spot.wishlist ? -2 : 1.2;
      else score += spot.wishlist ? 0.2 : 0.8;
      if (spot.saved) score += 0.7;
      if (spot.needsReview) score -= 0.25;

      return {
        spot,
        score,
        timeFit,
        reason: pullReason(spot, filters, context, timeFit),
      };
    })
    .sort((a, b) => b.score - a.score || a.spot.name.localeCompare(b.spot.name));
}

export function chooseWeightedPull(
  pool: Spot[],
  filters: SpotQuery = {},
  context: SingaporeTimeContext = getSingaporeTimeContext()
): RankedSpot | null {
  const ranked = rankSpotsForPull(pool, filters, context);
  if (ranked.length === 0) return null;
  const shortlist = ranked.slice(0, Math.min(8, ranked.length));
  const floor = Math.min(...shortlist.map((item) => item.score));
  const weighted = shortlist.map((item) => ({
    item,
    weight: Math.max(0.8, item.score - floor + 0.8),
  }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) return item.item;
  }
  return weighted[0].item;
}

export function chooseAlternativeDetails(
  result: Spot,
  pool: Spot[],
  filters: SpotQuery = {},
  count = 3,
  context: SingaporeTimeContext = getSingaporeTimeContext()
): AlternativeDecision[] {
  return pool
    .filter((spot) => spot.id !== result.id)
    .map((spot) => {
      const timeFit = evaluateTimeFit(spot, context);
      const filterLift =
        filters.category && filters.category !== "all" && spot.category === filters.category
          ? 0.8
          : 0;
      return {
        spot,
        timeFit,
        score: similarityScore(result, spot) + timeFit.score * 0.45 + filterLift,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ spot, timeFit }) => ({
      spot,
      timeFit,
      reason: alternativeReason(result, spot, timeFit),
    }));
}

export function chooseAlternatives(result: Spot, pool: Spot[], count = 3) {
  return pool
    .filter((spot) => spot.id !== result.id)
    .map((spot) => ({ spot, score: similarityScore(result, spot) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ spot }) => spot);
}

export function queryForSimilarPull(spot: Spot) {
  const params = new URLSearchParams();
  params.set("category", spot.category);
  if (spot.area) params.set("area", spot.area);
  if (spot.price) params.set("price", spot.price);
  params.set("autoPull", "1");
  return `/?${params.toString()}`;
}

export function pullReason(
  spot: Spot,
  filters: SpotQuery = {},
  context: SingaporeTimeContext = getSingaporeTimeContext(),
  fit: SpotTimeFit = evaluateTimeFit(spot, context)
) {
  const score = scoreOf(spot);
  const parts = [fit.reason];

  if (filters.category && filters.category !== "all") {
    parts.push(`${categoryModeLabel(filters.category)} matches your active category.`);
  } else {
    parts.push(`${categoryModeLabel(spot.category)} fits the current candidate pool.`);
  }

  if (score != null && score >= 8.8) parts.push(`${score.toFixed(1)} is one of the stronger signals in view.`);
  else if (score != null) parts.push(`${score.toFixed(1)} gives it enough confidence to pull.`);
  else if (spot.wishlist) parts.push("It is exploratory because it is still on the try-list.");

  if (spot.saved) parts.push("It is already in your Locker.");
  else if (!spot.wishlist) parts.push("It has a rated-history signal, not just a wishlist guess.");

  return parts.join(" ");
}

export function chipClass(tone: DecisionTone) {
  const classes: Record<DecisionTone, string> = {
    aqua: "border-aqua/25 bg-aqua/10 text-aqua",
    gilt: "border-gilt/25 bg-gilt/10 text-gilt",
    mist: "border-white/10 bg-white/[0.055] text-mist-300",
    orchid: "border-orchid/25 bg-orchid/10 text-orchid",
    ember: "border-ember/25 bg-ember/10 text-ember",
  };
  return classes[tone];
}

function similarityScore(a: Spot, b: Spot) {
  let score = 0;
  if (a.category === b.category) score += 5;
  if (a.area && a.area === b.area) score += 3;
  if (a.price && a.price === b.price) score += 2;
  if (a.ownerTier && a.ownerTier === b.ownerTier) score += 2;
  if (a.cuisine && a.cuisine === b.cuisine) score += 2;
  score += (scoreOf(b) ?? 6) / 10;
  if (!b.wishlist) score += 0.5;
  return score;
}

function matchesFrontendFilters(spot: Spot, filters: SpotQuery) {
  if (filters.category && filters.category !== "all" && spot.category !== filters.category) return false;
  if (filters.area && filters.area !== "all" && spot.area !== filters.area) return false;
  if (filters.price && filters.price !== "all" && spot.price !== filters.price) return false;
  if (filters.tier && filters.tier !== "all" && spot.ownerTier !== filters.tier) return false;
  if (filters.visited === "reviewed" && spot.wishlist) return false;
  if (filters.visited === "wishlist" && !spot.wishlist) return false;
  const search = filters.search?.trim().toLowerCase();
  if (search) {
    const haystack = [spot.name, spot.cuisine, spot.area].filter(Boolean).join(" ").toLowerCase();
    if (!haystack.includes(search)) return false;
  }
  return true;
}

function alternativeReason(result: Spot, alt: Spot, timeFit: SpotTimeFit) {
  if (result.category === alt.category && result.area && result.area === alt.area) {
    return `${timeFit.label}: same category and area, with a different read on the mood.`;
  }
  if (result.category === alt.category) {
    return `${timeFit.label}: same decision lane, different location or spend.`;
  }
  if (timeFit.signal === "good_now") {
    return `${timeFit.label}: a stronger time-of-day fit if you want to pivot.`;
  }
  return `${timeFit.label}: useful backup, but ${timeFit.hoursLabel.toLowerCase()}.`;
}

function uniqueChips(chips: DecisionChip[]) {
  const seen = new Set<string>();
  return chips.filter((chip) => {
    const key = `${chip.tone}:${chip.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

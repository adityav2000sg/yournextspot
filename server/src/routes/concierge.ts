import { Router } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../prisma.js";
import { env, hasClaude } from "../env.js";
import { compactForConcierge, serializeSpotSummary } from "../lib/serialize.js";
import type { SpotWithReviews } from "../lib/serialize.js";

export const conciergeRouter = Router();

const promptSchema = z.object({ prompt: z.string().trim().min(1).max(400) });

const anthropic = hasClaude
  ? new Anthropic({ apiKey: env.anthropicApiKey })
  : null;

type ConciergeSource = "claude" | "local" | "clarification";

interface Pick {
  slug: string;
  reason: string;
}

const CLARIFICATION_SUGGESTIONS = [
  "cheap coffee with my laptop",
  "first date, not too loud",
  "drinks around Tanjong Pagar",
  "cosy dinner under $40",
  "somewhere new for brunch",
];

const claudeResponseSchema = z.object({
  mood: z.string().min(4).max(160),
  picks: z
    .array(
      z.object({
        slug: z.string().min(1),
        reason: z.string().min(4).max(160),
      })
    )
    .max(6),
});

conciergeRouter.post("/", async (req, res) => {
  const parsed = promptSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Tell me a little more." });
  }
  const prompt = parsed.data.prompt;

  const spots = await prisma.spot.findMany({ include: { reviews: true } });
  const bySlug = new Map(spots.map((s) => [s.slug, s]));
  const intent = analyzePromptIntent(prompt, spots);

  if (!intent.meaningful) {
    let mood = buildClarificationMood();
    let source: ConciergeSource = "clarification";

    if (anthropic) {
      try {
        const result = await askClaude(prompt, spots);
        mood = ensureClarificationMood(result.mood);
        source = "claude";
      } catch (err) {
        console.error("Concierge (Claude) clarification failed:", err);
      }
    }

    return res.json({
      mood,
      picks: [],
      spots: [],
      source,
      suggestions: CLARIFICATION_SUGGESTIONS,
    });
  }

  let mood = "";
  let picks: Pick[] = [];
  let source: ConciergeSource = "local";

  if (anthropic) {
    try {
      const result = await askClaude(prompt, spots);
      mood = result.mood;
      picks = result.picks.filter((p) => bySlug.has(p.slug));
      if (picks.length > 0) source = "claude";
    } catch (err) {
      console.error("Concierge (Claude) failed, falling back:", err);
    }
  }

  if (picks.length === 0) {
    const local = localMatch(prompt, spots);
    mood = mood || local.mood;
    picks = local.picks;
    source = "local";
  }

  const pickedSpots = picks
    .map((p) => bySlug.get(p.slug))
    .filter((s): s is SpotWithReviews => Boolean(s))
    .map((spot) => serializeSpotSummary(spot));

  res.json({ mood, picks, spots: pickedSpots, source });
});

async function askClaude(
  prompt: string,
  spots: SpotWithReviews[]
): Promise<{ mood: string; picks: Pick[] }> {
  const catalog = spots.map(compactForConcierge);
  const system = `You are YourNextSpot's private Singapore F&B concierge.

Product context:
- YourNextSpot is a curated personal repository of restaurants, bars, and coffee spots.
- The job is NOT generic search. It is to interpret the user's mood/occasion and pick from the provided catalog only.
- The tier system means:
  everyday_delight = easy casual reliable;
  thoughtful_treat = slightly special but still simple;
  memorable_occasion = date/catch-up/celebration;
  landmark_celebration = impressive, premium, big night;
  crown_jewel = rare best-of-city choice.

Decision rules:
- Pick 3 to 5 places only.
- If the request is only a greeting, punctuation, or otherwise lacks a clear category, occasion, area, budget, or vibe, ask one warm clarifying question and return no picks.
- Hard-respect category intent: coffee/cafe/laptop/study => coffee; drinks/cocktails/bar/nightcap => bar; dinner/lunch/eat/date/client => restaurant unless user says otherwise.
- Hard-respect price intent: cheap/budget/casual/value => prefer $ or $$; splurge/impress/celebrate/client => prefer memorable_occasion, landmark_celebration, or crown_jewel.
- New/haven't tried/bucket list => prefer wishlist=true.
- If the user names an area, prefer that area.
- Avoid generic praise. Reasons should say WHY the pick fits this request.

Voice:
- Calm, tasteful, direct, like a friend who knows Singapore well.
- No hype headings, no markdown, no bullet labels, no "BEST SPOTS", no hashtags.
- Do not mention that you are an AI or that you used a catalog.

Return STRICT JSON only, exactly:
{"mood":"one natural sentence, max 22 words","picks":[{"slug":"catalog slug","reason":"specific reason, max 18 words"}]}

For clarification responses, return exactly:
{"mood":"one natural question asking for occasion, category, budget, area, or vibe","picks":[]}

Use only slugs present in the catalog.`;

  const message = await anthropic!.messages.create({
    model: env.anthropicModel,
    max_tokens: 700,
    system,
    messages: [
      {
        role: "user",
        content: `User request: "${prompt}"\n\nCatalog JSON:\n${JSON.stringify(
          catalog
        )}\n\nReturn only the JSON object.`,
      },
    ],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const json = extractJson(text);
  const parsed = claudeResponseSchema.parse(JSON.parse(json));
  return {
    mood: cleanConciergeText(parsed.mood),
    picks: parsed.picks.slice(0, 5).map((pick) => ({
      slug: pick.slug,
      reason: cleanConciergeText(pick.reason),
    })),
  };
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text.trim();
}

function cleanConciergeText(text: string): string {
  return text
    .replace(/^#+\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*[-*]\s+/g, "")
    .replace(/\b(best spots?|top picks?)\b:?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function analyzePromptIntent(
  prompt: string,
  spots: SpotWithReviews[]
): { meaningful: boolean } {
  const p = prompt.toLowerCase().replace(/[^\p{L}\p{N}$]+/gu, " ").trim();
  const words = p.match(/[\p{L}\p{N}$]+/gu) ?? [];

  if (words.length === 0) return { meaningful: false };

  const lowIntentWords = new Set([
    "hi",
    "hello",
    "hey",
    "yo",
    "sup",
    "ok",
    "okay",
    "test",
    "help",
    "pls",
    "please",
  ]);
  if (words.length <= 2 && words.every((word) => lowIntentWords.has(word))) {
    return { meaningful: false };
  }

  const hasRequestSignal =
    /\b(coffee|cafe|espresso|latte|matcha|laptop|work|study|drink|drinks|cocktail|bar|wine|beer|nightcap|dinner|lunch|brunch|breakfast|eat|food|hungry|meal|date|client|team|solo|family|friend|celebrate|celebration|birthday|anniversary|promotion|cheap|budget|affordable|value|casual|fancy|splurge|impress|romantic|quiet|calm|cosy|cozy|chill|new|wishlist|try|explore|near|around|under|\$)\b/.test(
      p
    );

  const hasCatalogSignal = spots.some((spot) => {
    const signals = [spot.name, spot.area, spot.cuisine]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());
    return signals.some((signal) => p.includes(signal));
  });

  return { meaningful: hasRequestSignal || hasCatalogSignal };
}

function buildClarificationMood(): string {
  return "Tell me what you want: date, coffee, drinks, budget, area, or vibe, and I'll narrow it down.";
}

function ensureClarificationMood(mood: string): string {
  const cleaned = cleanConciergeText(mood);
  if (
    /\b(what|where|who|budget|area|vibe|coffee|drinks?|date|dinner|lunch|hungry|looking for|want)\b/i.test(
      cleaned
    )
  ) {
    return cleaned;
  }
  return buildClarificationMood();
}

// ---- Local fallback: a keyword/mood matcher so search always works ----
function localMatch(
  prompt: string,
  spots: SpotWithReviews[]
): { mood: string; picks: Pick[] } {
  const p = prompt.toLowerCase();
  const wants = {
    coffee: /(coffee|cafe|espresso|latte|laptop|work|study|matcha)/.test(p),
    bar: /(drink|cocktail|bar|wine|beer|night ?cap|booze|whisky)/.test(p),
    eat: /(eat|food|dinner|lunch|brunch|hungry|meal|pasta|dumpling|curry|steak)/.test(p),
    cheap: /(cheap|budget|affordable|value|casual)/.test(p),
    fancy: /(impress|fancy|celebrate|celebration|anniversary|birthday|promotion|special|date|romantic)/.test(p),
    nuevo: /(new|haven'?t|never been|try|explore|adventur)/.test(p),
    cozy: /(cozy|cosy|quiet|chill|relax|intimate|calm)/.test(p),
  };

  const area = spots
    .map((s) => s.area)
    .filter((a): a is string => Boolean(a))
    .find((a) => p.includes(a.toLowerCase()));

  const scored = spots
    .map((s) => {
      let score = 0;
      if (wants.coffee && s.category === "coffee") score += 5;
      if (wants.bar && s.category === "bar") score += 5;
      if (wants.eat && s.category === "restaurant") score += 4;
      if (wants.cheap && (s.price === "$" || s.price === "$$")) score += 3;
      if (
        wants.fancy &&
        (s.ownerTier === "landmark_celebration" ||
          s.ownerTier === "crown_jewel" ||
          s.ownerTier === "memorable_occasion")
      )
        score += 3;
      if (wants.nuevo && s.wishlist) score += 4;
      if (area && s.area === area) score += 4;
      if (s.cuisine && p.includes(s.cuisine.toLowerCase())) score += 4;
      if (p.includes(s.name.toLowerCase())) score += 6;
      // Gentle bias toward rated, higher-scoring places.
      score += (s.ownerScore ?? 0) / 10;
      score += Math.random() * 0.6; // a little serendipity
      return { s, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const mood = buildLocalMood(wants, area);
  const picks: Pick[] = scored.map(({ s }) => ({
    slug: s.slug,
    reason: localReason(s),
  }));
  return { mood, picks };
}

function buildLocalMood(
  wants: Record<string, boolean>,
  area: string | undefined
): string {
  const bits: string[] = [];
  if (wants.fancy) bits.push("something special");
  if (wants.cozy) bits.push("a calm, cosy table");
  if (wants.cheap) bits.push("easy on the wallet");
  if (wants.coffee) bits.push("a good cup");
  if (wants.bar) bits.push("a proper drink");
  if (wants.eat) bits.push("a satisfying bite");
  if (wants.nuevo) bits.push("somewhere new");
  const where = area ? ` around ${area}` : "";
  if (bits.length === 0) return `A few picks from your atlas${where}.`;
  return `Sounds like you're after ${bits.slice(0, 3).join(", ")}${where}.`;
}

function localReason(s: { ownerVerdict: string | null; cuisine: string | null; area: string | null; wishlist: boolean }): string {
  if (s.ownerVerdict) return s.ownerVerdict;
  if (s.wishlist) return `On the to-try list${s.area ? ` in ${s.area}` : ""}.`;
  return [s.cuisine, s.area].filter(Boolean).join(" · ") || "A solid choice.";
}

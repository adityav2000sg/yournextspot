import { useEffect, useState } from "react";
import type { Review, Tier } from "../types";
import { TIER_ORDER, TIERS } from "../lib/tiers";
import { api } from "../api";

interface Props {
  slug: string;
  existingReview?: Review;
  onAdded: (review: Review) => void;
}

export default function ReviewForm({ slug, existingReview, onAdded }: Props) {
  const [score, setScore] = useState(existingReview?.score ?? 8);
  const [tier, setTier] = useState<Tier>(existingReview?.tier ?? "thoughtful_treat");
  const [verdict, setVerdict] = useState(existingReview?.verdict ?? "");
  const [wouldReturn, setWouldReturn] = useState(existingReview?.wouldReturn ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!existingReview) return;
    setScore(existingReview.score);
    setTier(existingReview.tier);
    setVerdict(existingReview.verdict);
    setWouldReturn(existingReview.wouldReturn);
  }, [existingReview]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const review = await api.addReview(slug, {
        score,
        tier,
        verdict: verdict.trim(),
        wouldReturn,
      });
      onAdded(review);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save review.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl glass p-6">
      <div>
        <p className="eyebrow">Public</p>
        <h3 className="mt-1 font-display text-2xl text-mist-100">{existingReview ? "Edit your review" : "Share your review"}</h3>
        <p className="mt-2 text-sm leading-6 text-mist-400">Everyone can read this. Your private visit notes live separately in your food log.</p>
      </div>

      <div>
        <label className="mb-2 flex items-center justify-between text-sm text-mist-300">
          <span>Worth-It Score</span>
          <span className="font-mono text-lg text-mist-100">{score.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min={1}
          max={10}
          step={0.1}
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="w-full accent-orchid"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-mist-300">Occasion tier</label>
        <div className="flex flex-wrap gap-2">
          {TIER_ORDER.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTier(t)}
              aria-pressed={tier === t}
              className={`chip transition ${
                tier === t
                  ? "text-ink-900"
                  : "bg-ink-600 text-mist-300 hover:text-mist-100"
              }`}
              style={
                tier === t
                  ? { background: `linear-gradient(110deg, ${TIERS[t].from}, ${TIERS[t].to})` }
                  : undefined
              }
            >
              {TIERS[t].glyph} {TIERS[t].short}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm text-mist-300">
          One-line verdict
        </label>
        <input
          value={verdict}
          onChange={(e) => setVerdict(e.target.value)}
          maxLength={140}
          required
          placeholder="The cacio e pepe is worth the queue."
          className="input"
        />
      </div>

      <label className="flex items-center gap-3 text-sm text-mist-300">
        <input
          type="checkbox"
          checked={wouldReturn}
          onChange={(e) => setWouldReturn(e.target.checked)}
          className="h-4 w-4 accent-aqua"
        />
        I'd go back
      </label>

      {error && <p className="text-sm text-ember">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="btn w-full bg-mist-100 text-ink-900 hover:bg-white"
      >
        {loading ? "Saving…" : existingReview ? "Update public review" : "Post public review"}
      </button>
    </form>
  );
}

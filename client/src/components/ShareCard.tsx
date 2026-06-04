import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { Spot } from "../types";
import { CATEGORY_META, tierMeta } from "../lib/tiers";

interface Props {
  spot: Spot;
  onClose: () => void;
}

export default function ShareCard({ spot, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const tier = tierMeta(spot.ownerTier ?? spot.communityTier);
  const score = spot.ownerScore ?? spot.avgScore;
  const verdict = spot.ownerVerdict ?? spot.reviews?.find((r) => r.verdict)?.verdict;
  const cat = CATEGORY_META[spot.category];

  async function download() {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.download = `yournextspot-${spot.slug}.png`;
      a.href = dataUrl;
      a.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink-900/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col items-center gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* The exported card (1080x1350 ratio for IG portrait) */}
        <div
          ref={cardRef}
          className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl p-8 text-white"
          style={{
            background: tier
              ? `radial-gradient(120% 120% at 80% 0%, ${tier.from}33, transparent 55%), radial-gradient(120% 120% at 0% 100%, ${tier.to}33, transparent 55%), #050816`
              : "#050816",
          }}
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
            <span>YourNextSpot</span>
            <span>{cat.glyph} {cat.label}</span>
          </div>

          <div className="mt-16">
            <p className="text-sm uppercase tracking-[0.25em] text-white/50">
              {[spot.area, spot.cuisine].filter(Boolean).join(" · ")}
            </p>
            <h2
              className="mt-2 font-display text-5xl leading-[1.05]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              {spot.name}
            </h2>
          </div>

          {tier && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-ink-900"
              style={{ background: `linear-gradient(110deg, ${tier.from}, ${tier.to})` }}
            >
              <span>{tier.glyph}</span>
              <span>{tier.label}</span>
            </div>
          )}

          {verdict && (
            <p className="mt-6 font-display text-2xl leading-snug text-white/90">
              “{verdict}”
            </p>
          )}

          <div className="absolute inset-x-8 bottom-8 flex items-end justify-between">
            <div>
              <div className="text-6xl font-semibold leading-none">
                {score != null ? score.toFixed(1) : "—"}
                <span className="text-2xl text-white/50"> /10</span>
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.25em] text-white/50">
                Worth-It Score
              </div>
            </div>
            <div className="text-right text-xs uppercase tracking-[0.25em] text-white/50">
              Singapore
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={download}
            disabled={busy}
            className="btn bg-mist-100 text-ink-900 hover:bg-white"
          >
            {busy ? "Rendering…" : "Download card ↓"}
          </button>
          <button onClick={onClose} className="btn-ghost">
            close
          </button>
        </div>
        <p className="text-center text-xs text-mist-400">
          Save it, then post to your story or feed.
        </p>
      </div>
    </div>
  );
}

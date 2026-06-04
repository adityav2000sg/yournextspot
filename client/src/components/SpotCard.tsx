import { Link } from "react-router-dom";
import type { Spot } from "../types";
import { CATEGORY_META, tierMeta } from "../lib/tiers";
import TierCrest from "./TierCrest";

interface Props {
  spot: Spot;
  reason?: string;
  highlight?: boolean;
}

export default function SpotCard({ spot, reason, highlight }: Props) {
  const cat = CATEGORY_META[spot.category];
  const tier = spot.ownerTier ?? spot.communityTier;
  const meta = tierMeta(tier);
  const score = spot.ownerScore ?? spot.avgScore;

  return (
    <Link
      to={`/spot/${spot.slug}`}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
      }}
      className={`spotlight-card group relative grid min-h-[250px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-[1.5rem] glass p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/35 ${
        highlight ? "ring-2 ring-orchid/50" : ""
      }`}
    >
      <div
        className="absolute -right-16 -top-20 h-44 w-44 rounded-full opacity-[0.1] blur-2xl transition duration-500 group-hover:opacity-[0.18]"
        style={{
          background: meta
            ? `radial-gradient(circle, ${meta.to}, transparent 65%)`
            : "radial-gradient(circle, #8b8fa7, transparent 65%)",
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[11px] font-medium text-mist-300">
            <span aria-hidden>{cat.glyph}</span>
            <span>{cat.label}</span>
          </span>
          {spot.wishlist ? (
            <span className="rounded-full border border-gilt/30 bg-gilt/10 px-3 py-1.5 text-[11px] font-semibold text-gilt">
              To try
            </span>
          ) : (
            <span className="rounded-full border border-aqua/25 bg-aqua/10 px-3 py-1.5 text-[11px] font-semibold text-aqua">
              Reviewed
            </span>
          )}
        </div>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-mist-400">
              {spot.cuisine ?? cat.label}
            </p>
            <h3 className="mt-1 line-clamp-2 font-display text-[1.7rem] leading-[1.02] tracking-[-0.04em] text-mist-100 group-hover:text-white">
              {spot.name}
            </h3>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2 text-right">
            {score != null ? (
              <>
                <div className="font-mono text-2xl leading-none text-mist-100">
                  {score.toFixed(1)}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-mist-400">
                  score
                </div>
              </>
            ) : (
              <>
                <div className="font-mono text-xl leading-none text-mist-100">—</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-mist-400">
                  score
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <TierCrest tier={tier} size="sm" />
          {spot.price && (
            <span className="chip bg-white/[0.055] text-mist-300">{spot.price}</span>
          )}
          {spot.area && (
            <span className="chip bg-white/[0.055] text-mist-300">{spot.area}</span>
          )}
        </div>

        {reason && (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-relaxed text-mist-300">
            <span className="text-aqua">✦ </span>
            {reason}
          </p>
        )}
      </div>

      <div className="relative mt-5 border-t border-white/10 pt-4">
        <div className="grid grid-cols-[1fr_auto] items-end gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm text-mist-300">
              {spot.area ?? "Singapore"}
            </p>
            <p className="mt-1 text-xs text-mist-400">
              {spot.reviewCount > 0
                ? `${spot.reviewCount} review${spot.reviewCount === 1 ? "" : "s"}`
                : "No reviews yet"}
            </p>
          </div>

          <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs text-mist-300 transition group-hover:border-aqua/40 group-hover:text-aqua">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}

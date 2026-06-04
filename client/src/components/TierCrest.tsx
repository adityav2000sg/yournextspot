import type { Tier } from "../types";
import { tierMeta } from "../lib/tiers";

interface Props {
  tier: Tier | null | undefined;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const sizes = {
  sm: { box: "h-6 px-2 text-[10px]", glyph: "text-[11px]" },
  md: { box: "h-7 px-2.5 text-[11px]", glyph: "text-xs" },
  lg: { box: "h-9 px-3.5 text-sm", glyph: "text-base" },
};

export default function TierCrest({ tier, size = "md", showLabel = true }: Props) {
  const meta = tierMeta(tier);
  if (!meta) {
    return (
      <span className="chip border border-dashed border-ink-400 text-mist-400">
        Unrated
      </span>
    );
  }
  const s = sizes[size];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide text-ink-900 ${s.box}`}
      style={{
        background: `linear-gradient(110deg, ${meta.from}, ${meta.to})`,
        boxShadow: `0 6px 22px -10px ${meta.to}`,
      }}
      title={meta.blurb}
    >
      <span className={s.glyph} aria-hidden>
        {meta.glyph}
      </span>
      {showLabel && <span>{meta.label}</span>}
    </span>
  );
}

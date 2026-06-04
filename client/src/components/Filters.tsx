import type { SpotQuery } from "../api";
import type { Category, Tier } from "../types";
import { CATEGORY_META, TIER_ORDER, TIERS } from "../lib/tiers";

interface Props {
  value: SpotQuery;
  onChange: (next: SpotQuery) => void;
  areas: string[];
}

const PRICES = ["$", "$$", "$$$", "$$$$"];

function Segment<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { key: T; label: string; glyph?: string }[];
  value: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onSelect(o.key)}
          className={`chip px-4 py-2 transition ${
            value === o.key
              ? "soft-button bg-mist-100 text-ink-900"
              : "text-mist-300 hover:bg-white/[0.055] hover:text-mist-100"
          }`}
        >
          {o.glyph && <span aria-hidden>{o.glyph}</span>}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Filters({ value, onChange, areas }: Props) {
  const set = (patch: Partial<SpotQuery>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Segment<Category | "all">
          value={(value.category ?? "all") as Category | "all"}
          onSelect={(category) => set({ category })}
          options={[
            { key: "all", label: "Everything" },
            { key: "restaurant", label: "Eat", glyph: CATEGORY_META.restaurant.glyph },
            { key: "coffee", label: "Sip", glyph: CATEGORY_META.coffee.glyph },
            { key: "bar", label: "Drink", glyph: CATEGORY_META.bar.glyph },
          ]}
        />
        <Segment<"all" | "reviewed" | "wishlist">
          value={value.visited ?? "all"}
          onSelect={(visited) => set({ visited })}
          options={[
            { key: "all", label: "All" },
            { key: "reviewed", label: "Been there" },
            { key: "wishlist", label: "To try" },
          ]}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.2fr_0.7fr_1fr_auto]">
        <label className="block">
          <span className="mb-2 block text-[10px] uppercase tracking-[0.24em] text-mist-400">
            Occasion
          </span>
          <select
            value={value.tier ?? "all"}
            onChange={(e) => set({ tier: e.target.value as Tier | "all" })}
            className="input py-3 text-sm"
          >
            <option value="all">Any tier</option>
            {TIER_ORDER.map((t) => (
              <option key={t} value={t}>
                {TIERS[t].label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-[10px] uppercase tracking-[0.24em] text-mist-400">
            Spend
          </span>
          <select
            value={value.price ?? "all"}
            onChange={(e) => set({ price: e.target.value })}
            className="input py-3 text-sm"
          >
            <option value="all">Any price</option>
            {PRICES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-[10px] uppercase tracking-[0.24em] text-mist-400">
            Area
          </span>
          <select
            value={value.area ?? "all"}
            onChange={(e) => set({ area: e.target.value })}
            className="input py-3 text-sm"
          >
            <option value="all">Any area</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        {(value.tier !== undefined && value.tier !== "all") ||
        (value.price !== undefined && value.price !== "all") ||
        (value.area !== undefined && value.area !== "all") ||
        (value.visited && value.visited !== "all") ||
        (value.category && value.category !== "all") ? (
          <button
            onClick={() =>
              onChange({
                category: "all",
                tier: "all",
                area: "all",
                price: "all",
                visited: "all",
              })
            }
            className="btn-ghost self-end text-xs"
          >
            reset
          </button>
        ) : null}
      </div>
    </div>
  );
}

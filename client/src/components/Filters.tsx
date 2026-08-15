import type { SpotQuery } from "../api";
import type { Category, Tier } from "../types";
import { CATEGORY_META, TIER_ORDER, TIERS } from "../lib/tiers";

interface Props {
  value: SpotQuery;
  onChange: (next: SpotQuery) => void;
  areas: string[];
  showPersonalFilters?: boolean;
  hideSearchAndCategory?: boolean;
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
    <div className="segmented-control">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onSelect(o.key)}
          type="button"
          aria-pressed={value === o.key}
          className={`segmented-button ${value === o.key ? "is-active" : ""}`}
        >
          {o.glyph && <span aria-hidden>{o.glyph}</span>}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function Filters({ value, onChange, areas, showPersonalFilters = false, hideSearchAndCategory = false }: Props) {
  const set = (patch: Partial<SpotQuery>) => onChange({ ...value, ...patch });
  const hasFilters =
    Boolean(value.search?.trim()) ||
    (value.tier !== undefined && value.tier !== "all") ||
    (value.price !== undefined && value.price !== "all") ||
    (value.area !== undefined && value.area !== "all") ||
    (value.visited && value.visited !== "all") ||
    (value.category && value.category !== "all");

  return (
    <div className="grid gap-4">
      {!hideSearchAndCategory && <div className={`grid gap-3 lg:items-center ${showPersonalFilters ? "lg:grid-cols-[minmax(240px,1fr)_auto_auto]" : "lg:grid-cols-[minmax(240px,1fr)_auto]"}`}>
        <label className="relative block">
          <span className="sr-only">Search spots by name, cuisine, or area</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mist-400">
            ⌕
          </span>
          <input
            value={value.search ?? ""}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search spot, cuisine, or area"
            className="input min-h-[48px] rounded-full pl-11 text-sm"
          />
        </label>

        <Segment<Category | "all">
          value={(value.category ?? "all") as Category | "all"}
          onSelect={(category) => set({ category })}
          options={[
            { key: "all", label: "All" },
            { key: "restaurant", label: "Eat", glyph: CATEGORY_META.restaurant.glyph },
            { key: "coffee", label: "Sip", glyph: CATEGORY_META.coffee.glyph },
            { key: "bar", label: "Drink", glyph: CATEGORY_META.bar.glyph },
          ]}
        />

        {showPersonalFilters && (
          <Segment<"all" | "reviewed" | "wishlist">
            value={value.visited ?? "all"}
            onSelect={(visited) => set({ visited })}
            options={[
              { key: "all", label: "All spots" },
              { key: "reviewed", label: "Reviewed" },
              { key: "wishlist", label: "Try-list" },
            ]}
          />
        )}
      </div>}

      {hideSearchAndCategory && showPersonalFilters && (
        <div>
          <span className="filter-label">Your history</span>
          <Segment<"all" | "reviewed" | "wishlist">
            value={value.visited ?? "all"}
            onSelect={(visited) => set({ visited })}
            options={[
              { key: "all", label: "All spots" },
              { key: "reviewed", label: "Reviewed" },
              { key: "wishlist", label: "Try-list" },
            ]}
          />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-[1.15fr_0.75fr_1fr_auto]">
        <label className="block">
          <span className="filter-label">Occasion</span>
          <select
            value={value.tier ?? "all"}
            onChange={(e) => set({ tier: e.target.value as Tier | "all" })}
            className="input min-h-[46px] py-3 text-sm"
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
          <span className="filter-label">Spend</span>
          <select
            value={value.price ?? "all"}
            onChange={(e) => set({ price: e.target.value })}
            className="input min-h-[46px] py-3 text-sm"
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
          <span className="filter-label">Area</span>
          <select
            value={value.area ?? "all"}
            onChange={(e) => set({ area: e.target.value })}
            className="input min-h-[46px] py-3 text-sm"
          >
            <option value="all">Any area</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        {hasFilters ? (
          <button
            onClick={() =>
              onChange({
                category: "all",
                tier: "all",
                area: "all",
                price: "all",
                visited: "all",
                search: "",
              })
            }
            className="btn-ghost min-h-[46px] self-end border border-white/10 text-xs"
          >
            Reset
          </button>
        ) : (
          <div className="hidden md:block" />
        )}
      </div>
    </div>
  );
}

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api, type SpotQuery } from "../api";
import type { Category, Spot, Tier } from "../types";
import Concierge from "../components/Concierge";
import VoiceConcierge from "../components/VoiceConcierge";
import Filters from "../components/Filters";
import SpotCard from "../components/SpotCard";
import DecideOverlay from "../components/DecideOverlay";
import LiveStatus, { useSingaporeClock } from "../components/LiveStatus";
import { chipClass, describeFilters } from "../lib/decision";
import { useAuth } from "../lib/auth";
import { CATEGORY_META } from "../lib/tiers";

const SpotMap = lazy(() => import("../components/SpotMap"));

const INITIAL_FILTERS: SpotQuery = {
  category: "all",
  tier: "all",
  area: "all",
  price: "all",
  visited: "all",
  search: "",
};

const CATEGORIES: Category[] = ["restaurant", "coffee", "bar"];
const TIERS: Tier[] = [
  "everyday_delight",
  "thoughtful_treat",
  "memorable_occasion",
  "landmark_celebration",
  "crown_jewel",
];
const PAGE_SIZE = 18;

function filtersFromSearch(search: string): SpotQuery {
  const params = new URLSearchParams(search);
  const category = params.get("category");
  const tier = params.get("tier");
  const visited = params.get("visited");
  return {
    ...INITIAL_FILTERS,
    category: category && CATEGORIES.includes(category as Category) ? (category as Category) : "all",
    tier: tier && TIERS.includes(tier as Tier) ? (tier as Tier) : "all",
    area: params.get("area") || "all",
    price: params.get("price") || "all",
    visited: visited === "wishlist" || visited === "reviewed" ? visited : "all",
    search: params.get("search") || "",
  };
}

export default function Home({ onSignIn }: { onSignIn: () => void }) {
  const location = useLocation();
  const { user } = useAuth();
  const autoPulled = useRef(false);
  const [filters, setFilters] = useState<SpotQuery>(() => filtersFromSearch(location.search));
  const [spots, setSpots] = useState<Spot[]>([]);
  const [allSpots, setAllSpots] = useState<Spot[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"cards" | "map">("cards");
  const [pick, setPick] = useState<Spot | null>(null);
  const [decideOpen, setDecideOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceRequest, setVoiceRequest] = useState<{ id: number; prompt: string } | null>(null);
  const timeContext = useSingaporeClock();

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 680px)").matches;
    const sessionKey = "yns.voiceWelcomeSeen";
    if (!isMobile || window.sessionStorage.getItem(sessionKey)) return;
    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem(sessionKey, "1");
      setVoiceOpen(true);
    }, 650);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    api.areas().then(setAreas).catch(() => setAreas([]));
    api.spots().then(setAllSpots).catch(() => setAllSpots([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .spots(filters)
      .then((next) => {
        if (!cancelled) setSpots(next);
      })
      .catch(() => {
        if (!cancelled) setSpots([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    setVisibleCount(PAGE_SIZE);
    return () => {
      cancelled = true;
    };
  }, [filters]);

  useEffect(() => {
    if (!user && filters.visited && filters.visited !== "all") {
      setFilters((current) => ({ ...current, visited: "all" }));
    }
  }, [user, filters.visited]);

  useEffect(() => {
    if (autoPulled.current || loading) return;
    if (new URLSearchParams(location.search).get("autoPull") === "1") {
      autoPulled.current = true;
      setDecideOpen(true);
    }
  }, [loading, location.search]);

  const stats = useMemo(() => {
    const source = allSpots.length ? allSpots : spots;
    return {
      total: source.length,
      restaurant: source.filter((spot) => spot.category === "restaurant").length,
      coffee: source.filter((spot) => spot.category === "coffee").length,
      bar: source.filter((spot) => spot.category === "bar").length,
      mapped: spots.filter((spot) => spot.lat != null && spot.lng != null).length,
    };
  }, [allSpots, spots]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((value) => Boolean(value) && value !== "all").length,
    [filters]
  );
  const filterChips = useMemo(() => describeFilters(filters), [filters]);
  const visibleSpots = spots.slice(0, visibleCount);

  function setCategory(category: Category | "all") {
    setFilters((current) => ({ ...current, category }));
  }

  function resetFilters() {
    setFilters(INITIAL_FILTERS);
    setFiltersOpen(false);
  }

  return (
    <main className="relative pb-20">
      <div className="noise" />

      <section className="home-hero mx-auto max-w-7xl px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-9">
        <div className="hero-copy">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow text-aqua">Singapore, picked with intent</span>
            <LiveStatus mode={timeContext.modeLabel} compact className="hidden sm:inline-flex" />
          </div>
          <h1>One good place.<br /><span>No group-chat spiral.</span></h1>
          <p className="hero-lede">
            Tell us the mood, or trust a quick pull. Every result comes from one shared Singapore list—not an endless search page.
          </p>

          <div id="concierge" className="mt-6 scroll-mt-24">
            <Concierge
              onSignIn={onSignIn}
              onVoiceOpen={() => setVoiceOpen(true)}
              voiceRequest={voiceRequest}
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={() => setDecideOpen(true)} className="btn-primary min-h-[54px] sm:min-w-[220px]">
              <span aria-hidden>↯</span>
              {activeFilterCount ? "Pick from these filters" : "Pick one for me"}
            </button>
            <a href="#atlas" className="btn-secondary min-h-[54px]">Explore all places</a>
            <p className="text-xs leading-5 text-mist-400 sm:max-w-[220px]">
              {loading ? "Loading the catalogue…" : `${spots.length} places in this view`} · Live hours still need checking.
            </p>
          </div>
        </div>

        <aside className="hero-guide" aria-label="Catalogue overview">
          <div>
            <p className="eyebrow text-gilt">Your shared atlas</p>
            <h2>{loading ? "—" : stats.total}</h2>
            <p>restaurants, cafés, and bars across Singapore</p>
          </div>
          <div className="hero-guide-stats">
            {([
              ["Eat", stats.restaurant, "restaurant"],
              ["Coffee", stats.coffee, "coffee"],
              ["Drinks", stats.bar, "bar"],
            ] as const).map(([label, count, category]) => (
              <button key={category} type="button" onClick={() => { setCategory(category); document.getElementById("atlas")?.scrollIntoView({ behavior: "smooth" }); }}>
                <span>{CATEGORY_META[category].glyph}</span>
                <strong>{count}</strong>
                <small>{label}</small>
              </button>
            ))}
          </div>
          <p className="hero-guide-note">Built for the places your people actually recommend, revisit, and photograph.</p>
        </aside>
      </section>

      <section id="atlas" className="mx-auto max-w-7xl scroll-mt-24 px-4 sm:px-5">
        <div className="atlas-heading">
          <div>
            <p className="eyebrow text-orchid">The atlas</p>
            <h2>Find somewhere worth going.</h2>
          </div>
          <div className="view-switch" aria-label="Choose atlas view">
            {(["cards", "map"] as const).map((mode) => (
              <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode)} className={view === mode ? "is-active" : ""}>
                {mode === "cards" ? "List" : "Map"}
              </button>
            ))}
          </div>
        </div>

        <div className="atlas-controls">
          <label className="atlas-search">
            <span className="sr-only">Search spots by name, cuisine, or area</span>
            <span aria-hidden>⌕</span>
            <input
              value={filters.search ?? ""}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search a place, cuisine, or neighbourhood"
            />
          </label>

          <div className="category-tabs" aria-label="Filter by place type">
            {([
              ["all", "All", ""],
              ["restaurant", "Eat", CATEGORY_META.restaurant.glyph],
              ["coffee", "Coffee", CATEGORY_META.coffee.glyph],
              ["bar", "Drinks", CATEGORY_META.bar.glyph],
            ] as const).map(([category, label, glyph]) => (
              <button key={category} type="button" aria-pressed={(filters.category ?? "all") === category} onClick={() => setCategory(category)}>
                {glyph && <span aria-hidden>{glyph}</span>}{label}
              </button>
            ))}
          </div>

          <button type="button" onClick={() => setFiltersOpen((open) => !open)} className="filter-toggle" aria-expanded={filtersOpen}>
            Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
          </button>
        </div>

        <div className={`${filtersOpen ? "block" : "hidden"} advanced-filters lg:block`}>
          <Filters value={filters} onChange={setFilters} areas={areas} showPersonalFilters={Boolean(user)} hideSearchAndCategory />
        </div>

        <div className="atlas-summary">
          <div className="flex flex-wrap items-center gap-2">
            <strong>{loading ? "Loading…" : `${spots.length} ${spots.length === 1 ? "place" : "places"}`}</strong>
            {filterChips.map((chip) => <span key={`${chip.tone}-${chip.label}`} className={`decision-chip ${chipClass(chip.tone)}`}>{chip.label}</span>)}
          </div>
          {activeFilterCount > 0 && <button type="button" onClick={resetFilters}>Clear filters</button>}
        </div>

        {pick && (
          <div className="latest-pick">
            <div>
              <p className="eyebrow text-aqua">Your latest pick</p>
              <Link to={`/spot/${pick.slug}`}>{pick.name}</Link>
              <span>{[pick.area, pick.cuisine, pick.price].filter(Boolean).join(" · ")}</span>
            </div>
            <div className="flex gap-2">
              <Link to={`/spot/${pick.slug}`} className="btn-primary">See the place</Link>
              <button type="button" onClick={() => setDecideOpen(true)} className="btn-secondary">Try another</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="spot-grid">
            {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-3xl bg-white/[0.04]" />)}
          </div>
        ) : view === "map" ? (
          <div className="atlas-map-shell">
            <div className="map-label">
              <p className="eyebrow text-aqua">Map view</p>
              <strong>{stats.mapped} mapped places</strong>
              <span>Tap a marker for details.</span>
            </div>
            <Suspense fallback={<div className="grid min-h-[31rem] place-items-center text-sm text-mist-400">Loading the map…</div>}>
              <SpotMap spots={spots} immersive />
            </Suspense>
          </div>
        ) : spots.length === 0 ? (
          <div className="empty-results">
            <h3>No clean match yet.</h3>
            <p>Try a wider area, another price, or clear the filters.</p>
            <button type="button" onClick={resetFilters} className="btn-primary">Reset the atlas</button>
          </div>
        ) : (
          <>
            <div className="spot-grid">
              {visibleSpots.map((spot) => <SpotCard key={spot.id} spot={spot} highlight={pick?.id === spot.id} onSignIn={onSignIn} />)}
            </div>
            {visibleCount < spots.length && (
              <div className="mt-7 flex justify-center">
                <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="btn-secondary min-h-[48px]">
                  Show {Math.min(PAGE_SIZE, spots.length - visibleCount)} more
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {decideOpen && (
        <DecideOverlay
          filters={filters}
          pool={spots}
          timeContext={timeContext}
          onSignIn={onSignIn}
          onClose={() => setDecideOpen(false)}
          onPicked={(spot) => setPick(spot)}
          onLoosenFilters={() => {
            setFilters(INITIAL_FILTERS);
            setDecideOpen(false);
            window.setTimeout(() => setDecideOpen(true), 120);
          }}
        />
      )}

      <button
        type="button"
        className="voice-fab"
        onClick={() => setVoiceOpen(true)}
        aria-label="Open voice concierge"
      >
        <span aria-hidden>
          <svg viewBox="0 0 24 24">
            <path d="M12 15.5a3.75 3.75 0 0 0 3.75-3.75v-5a3.75 3.75 0 1 0-7.5 0v5A3.75 3.75 0 0 0 12 15.5Z" />
            <path d="M5.75 11.25v.5a6.25 6.25 0 0 0 12.5 0v-.5M12 18v3M9.25 21h5.5" />
          </svg>
        </span>
        Ask
      </button>

      <VoiceConcierge
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onSubmit={(prompt) => {
          setVoiceRequest({ id: Date.now(), prompt });
          window.setTimeout(
            () => document.getElementById("concierge")?.scrollIntoView({ behavior: "smooth", block: "start" }),
            80
          );
        }}
        onBrowse={() => document.getElementById("atlas")?.scrollIntoView({ behavior: "smooth" })}
      />
    </main>
  );
}

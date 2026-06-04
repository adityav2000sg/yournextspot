import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type SpotQuery } from "../api";
import type { Spot } from "../types";
import Concierge from "../components/Concierge";
import Filters from "../components/Filters";
import SpotCard from "../components/SpotCard";
import SpotMap from "../components/SpotMap";
import DecideOverlay from "../components/DecideOverlay";
import TierCrest from "../components/TierCrest";

export default function Home() {
  const [filters, setFilters] = useState<SpotQuery>({
    category: "all",
    tier: "all",
    area: "all",
    price: "all",
    visited: "all",
  });
  const [spots, setSpots] = useState<Spot[]>([]);
  const [allSpots, setAllSpots] = useState<Spot[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "map">("grid");
  const [pick, setPick] = useState<Spot | null>(null);
  const [decideOpen, setDecideOpen] = useState(false);
  const [rollCount, setRollCount] = useState(0);

  useEffect(() => {
    api.areas().then(setAreas).catch(() => setAreas([]));
    api.spots().then(setAllSpots).catch(() => setAllSpots([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .spots(filters)
      .then(setSpots)
      .catch(() => setSpots([]))
      .finally(() => setLoading(false));
  }, [filters]);

  const stats = useMemo(() => {
    const source = allSpots.length ? allSpots : spots;
    const reviewed = source.filter((s) => !s.wishlist).length;
    const wishlist = source.filter((s) => s.wishlist).length;
    const located = source.filter((s) => s.lat != null && s.lng != null).length;
    const top = [...source]
      .filter((s) => !s.wishlist && (s.ownerScore ?? s.avgScore) != null)
      .sort((a, b) => (b.ownerScore ?? b.avgScore ?? 0) - (a.ownerScore ?? a.avgScore ?? 0))
      .slice(0, 4);
    return { total: source.length, inView: spots.length, reviewed, wishlist, located, top };
  }, [allSpots, spots]);

  const railSpots = useMemo(() => {
    const source = (allSpots.length ? allSpots : spots)
      .filter((spot) => !spot.wishlist)
      .sort((a, b) => (b.ownerScore ?? b.avgScore ?? 0) - (a.ownerScore ?? a.avgScore ?? 0))
      .slice(0, 12);
    return [...source, ...source];
  }, [allSpots, spots]);

  const moodShortcuts = [
    {
      label: "Date insurance",
      detail: "romantic, not awkward",
      icon: "♥",
      filter: { category: "restaurant", tier: "memorable_occasion" } as SpotQuery,
    },
    {
      label: "Laptop cave",
      detail: "solo, calm, caffeinated",
      icon: "⌁",
      filter: { category: "coffee", price: "$" } as SpotQuery,
    },
    {
      label: "Client magic",
      detail: "view, polish, confidence",
      icon: "✦",
      filter: { category: "restaurant", tier: "landmark_celebration" } as SpotQuery,
    },
    {
      label: "Late drinks",
      detail: "late, fun, memorable",
      icon: "◐",
      filter: { category: "bar" } as SpotQuery,
    },
  ];

  function recordPick(spot: Spot) {
    setPick(spot);
    setRollCount((n) => n + 1);
  }

  return (
    <main className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-[-8rem] -z-10 h-[55rem] aurora-field opacity-45 blur-xl" />
      <div className="noise" />

      {/* Hero */}
      <section className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 px-5 pb-14 pt-16 lg:grid-cols-[1fr_420px] lg:pt-10">
        <div
          className="pointer-events-none absolute left-1/2 top-[8%] -z-10 h-[520px] w-[960px] max-w-[130vw] -translate-x-1/2 rounded-full blur-3xl conic-glow opacity-15 animate-aurora"
          aria-hidden
        />

        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs uppercase tracking-[0.24em] text-mist-300 backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-aqua shadow-[0_0_14px_#52d1c7]" />
            Live Singapore decision engine
          </div>

          <h1 className="max-w-4xl font-display text-[clamp(3.7rem,10vw,9rem)] leading-[0.82] tracking-[-0.07em] text-mist-100">
            Stop deciding.
            <span className="block text-shimmer">Start pulling.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-balance text-lg leading-8 text-mist-300 sm:text-xl">
            YourNextSpot turns the tiny anxiety of “where should we go?” into a
            playful ritual: tell it the vibe, pull a spot, then chase the next great night.
          </p>

          <div className="mt-8 max-w-3xl">
            <Concierge />
          </div>

          {railSpots.length > 0 && (
            <div className="mt-5 max-w-3xl overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
              <div className="animate-marquee flex w-max gap-3 pr-3">
                {railSpots.map((spot, index) => (
                  <Link
                    key={`${spot.slug}-${index}`}
                    to={`/spot/${spot.slug}`}
                    className="mini-card group flex w-[220px] shrink-0 items-center justify-between gap-3 rounded-2xl px-4 py-3 transition hover:-translate-y-0.5 hover:border-aqua/35"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-mist-100 group-hover:text-white">
                        {spot.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-mist-400">
                        {[spot.area, spot.cuisine].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-white/[0.07] px-2.5 py-1 font-mono text-xs text-gilt">
                      {(spot.ownerScore ?? spot.avgScore ?? 0).toFixed(1)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={() => setDecideOpen(true)}
              className="soft-button jackpot-pulse group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-mist-100 px-8 py-4 text-base font-semibold text-ink-900 transition-transform hover:scale-[1.025] active:scale-100"
            >
              <span className="absolute inset-0 conic-glow opacity-0 transition-opacity duration-300 group-hover:opacity-25" />
              <span className="relative grid h-7 w-7 place-items-center rounded-full bg-ink-900 text-sm text-mist-100 transition-transform duration-700 group-hover:rotate-[720deg]" aria-hidden>
                🎲
              </span>
              <span className="relative">Pull my next spot</span>
              <span className="relative text-ink-500">→</span>
            </button>
            <div className="flex items-center gap-3 text-sm text-mist-400">
              <span className="hidden h-px w-10 bg-white/15 sm:block" />
              <span>{rollCount} pulls tonight · {stats.inView} places in play</span>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            {moodShortcuts.map((mood) => (
              <button
                key={mood.label}
                onClick={() => {
                  setFilters({
                    ...filters,
                    ...mood.filter,
                    area: filters.area ?? "all",
                    visited: filters.visited ?? "all",
                  });
                  setTimeout(() => setDecideOpen(true), 120);
                }}
                className="spotlight-card wiggle-tap glass group rounded-3xl p-4 text-left transition duration-300 hover:-translate-y-1"
              >
                <span className="relative mb-3 grid h-9 w-9 place-items-center rounded-2xl bg-white/[0.07] text-gilt">
                  {mood.icon}
                </span>
                <span className="relative text-sm font-semibold text-mist-100">{mood.label}</span>
                <span className="relative mt-1 block text-xs text-mist-400">{mood.detail}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="relative mx-auto w-full max-w-[420px] lg:mx-0">
          <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-aqua/10 opacity-70 blur-3xl" />
          <div className="glass relative overflow-hidden rounded-[2.2rem] p-5">
            <div className="bento-grid absolute inset-0 opacity-20" />
            <div className="relative">
              <p className="text-[10px] uppercase tracking-[0.3em] text-aqua">
                Tonight board
              </p>
              <h2 className="mt-2 font-display text-4xl leading-none tracking-[-0.04em] text-mist-100">
                Make the call faster.
              </h2>
              <p className="mt-3 text-sm leading-6 text-mist-400">
                Use the atlas like a shortlist: filter, pull, compare, then go.
              </p>
            </div>

            <div className="relative mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <p className="font-mono text-2xl text-mist-100">{stats.total}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-mist-400">spots</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <p className="font-mono text-2xl text-mist-100">{stats.reviewed}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-mist-400">rated</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <p className="font-mono text-2xl text-mist-100">{stats.located}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-mist-400">mapped</p>
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setFilters({ category: "all", tier: "all", area: "all", price: "all", visited: "all" });
                  setTimeout(() => setDecideOpen(true), 80);
                }}
                className="rounded-2xl border border-aqua/25 bg-aqua/10 p-3 text-left transition hover:-translate-y-0.5 hover:bg-aqua/15"
              >
                <span className="block text-sm font-semibold text-aqua">Anything good</span>
                <span className="mt-1 block text-xs text-mist-400">Reset filters and pick.</span>
              </button>
              <button
                onClick={() => {
                  setFilters({ ...filters, visited: "wishlist" });
                  setTimeout(() => setDecideOpen(true), 120);
                }}
                className="rounded-2xl border border-gilt/25 bg-gilt/10 p-3 text-left transition hover:-translate-y-0.5 hover:bg-gilt/15"
              >
                <span className="block text-sm font-semibold text-gilt">Try something new</span>
                <span className="mt-1 block text-xs text-mist-400">{stats.wishlist} saved places.</span>
              </button>
            </div>

            <div className="relative mt-4 overflow-hidden rounded-3xl border border-white/10 bg-ink-900/45 p-4">
              <p className="text-[10px] uppercase tracking-[0.26em] text-mist-400">
                top of the atlas
              </p>
              <div className="mt-3 space-y-2">
                {stats.top.map((spot, index) => (
                  <Link
                    key={spot.id}
                    to={`/spot/${spot.slug}`}
                    className="group flex items-center justify-between rounded-2xl px-3 py-2 transition hover:bg-white/[0.06]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 font-mono text-xs text-mist-300">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-mist-100 group-hover:text-white">
                          {spot.name}
                        </span>
                        <span className="block truncate text-xs text-mist-400">
                          {[spot.area, spot.cuisine].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </span>
                    <span className="font-mono text-sm text-gilt">
                      {(spot.ownerScore ?? spot.avgScore ?? 0).toFixed(1)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </section>

      {decideOpen && (
        <DecideOverlay
          filters={filters}
          pool={spots}
          onClose={() => setDecideOpen(false)}
          onPicked={recordPick}
        />
      )}

      {/* Randomizer result */}
      {pick && (
        <section className="mx-auto mb-8 max-w-6xl animate-rise px-5">
          <div className="spotlight-card rounded-[2rem] glass p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-orchid">
                The dice chose
              </p>
              <button
                onClick={() => setPick(null)}
                className="btn-ghost text-xs"
              >
                dismiss
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-3xl text-mist-100">
                  {pick.name}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <TierCrest tier={pick.ownerTier ?? pick.communityTier} />
                  {pick.cuisine && (
                    <span className="chip bg-ink-600 text-mist-300">
                      {pick.cuisine}
                    </span>
                  )}
                  {pick.area && (
                    <span className="chip bg-ink-600 text-mist-300">
                      {pick.area}
                    </span>
                  )}
                  {pick.price && (
                    <span className="chip bg-ink-600 text-mist-300">
                      {pick.price}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/spot/${pick.slug}`}
                  className="btn bg-mist-100 text-ink-900 hover:bg-white"
                >
                  See details
                </Link>
                {pick.googleMapsUrl && (
                  <a
                    href={pick.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn bg-white/10 text-mist-100 hover:bg-white/15"
                  >
                    Maps ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Browse */}
      <section className="relative mx-auto max-w-6xl px-5 pb-16">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-orchid">Browse the atlas</p>
            <h2 className="mt-2 font-display text-4xl tracking-[-0.04em] text-mist-100 sm:text-5xl">
              Pick by mood, price, area.
            </h2>
          </div>
          <div className="glass inline-flex shrink-0 gap-1 rounded-full p-1">
            {(["grid", "map"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`chip px-4 py-2 capitalize ${
                  view === mode
                    ? "bg-mist-100 text-ink-900 shadow-lg shadow-white/10"
                    : "text-mist-300 hover:text-mist-100"
                }`}
              >
                {mode === "grid" ? "Cards" : "Map"}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-[2rem] glass p-4 sm:p-5">
          <Filters value={filters} onChange={setFilters} areas={areas} />
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-[1.75rem] bg-white/[0.04]"
              />
            ))}
          </div>
        ) : view === "map" ? (
          <div className="h-[620px] overflow-hidden rounded-[2rem] glass p-2">
            <SpotMap spots={spots} />
          </div>
        ) : spots.length === 0 ? (
          <p className="py-20 text-center text-mist-400">
            No spots match those filters yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spots.map((s) => (
              <SpotCard key={s.id} spot={s} highlight={pick?.id === s.id} />
            ))}
          </div>
        )}
      </section>

      <div className="fixed bottom-5 left-1/2 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 sm:bottom-6">
        <div className="glass flex items-center justify-between gap-3 rounded-full px-3 py-2 pl-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-mist-100">
              Still undecided?
            </p>
            <p className="text-xs text-mist-400">
              {rollCount === 0 ? "Make the first pull." : `${rollCount} pulls in this session.`}
            </p>
          </div>
          <button
            onClick={() => setDecideOpen(true)}
            className="soft-button btn shrink-0 bg-mist-100 px-5 py-3 text-ink-900 hover:bg-white"
          >
            Pull again
          </button>
        </div>
      </div>
    </main>
  );
}

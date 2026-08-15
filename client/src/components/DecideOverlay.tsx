import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, type SpotQuery } from "../api";
import type { Spot } from "../types";
import { CATEGORY_META } from "../lib/tiers";
import TierCrest from "./TierCrest";
import SaveSpotButton from "./SaveSpotButton";
import {
  chipClass,
  chooseAlternativeDetails,
  decisionBrief,
  describeFilters,
  fitChips,
  rankSpotsForPull,
  scoreOf,
} from "../lib/decision";
import type { SingaporeTimeContext } from "../lib/timeContext";
import { useAuth } from "../lib/auth";

interface Props {
  filters: SpotQuery;
  pool: Spot[];
  onClose: () => void;
  onPicked: (spot: Spot) => void;
  onSignIn: () => void;
  onLoosenFilters: () => void;
  timeContext: SingaporeTimeContext;
}

export default function DecideOverlay({
  filters,
  pool,
  onClose,
  onPicked,
  onSignIn,
  onLoosenFilters,
  timeContext,
}: Props) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<"rolling" | "revealed" | "error">("rolling");
  const [label, setLabel] = useState(pool[0]?.name ?? "finding...");
  const [result, setResult] = useState<Spot | null>(null);
  const [rollKey, setRollKey] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [showAlternatives, setShowAlternatives] = useState(true);
  const timer = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onPickedRef = useRef(onPicked);
  const rankedPool = useMemo(
    () => rankSpotsForPull(pool, filters, timeContext),
    [pool, filters, timeContext]
  );
  const availableRankedPool = rankedPool;
  const stages = ["Set the brief", "Score right now", "Lock the pick"];

  useEffect(() => {
    onPickedRef.current = onPicked;
  }, [onPicked]);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setPhase("rolling");
    setResult(null);
    setStageIndex(0);
    setShowAlternatives(true);
    const names = availableRankedPool.length ? availableRankedPool.map((item) => item.spot.name) : ["finding..."];

    if (availableRankedPool.length === 0) {
      setLabel("No matches");
      timer.current = window.setTimeout(() => {
        if (!cancelled) setPhase("error");
      }, 700);
      return () => {
        cancelled = true;
        if (timer.current) window.clearTimeout(timer.current);
      };
    }

    const start = Date.now();
    let resultSpot: Spot | null = null;
    let failed = false;

    api
      .random(filters)
      .then((s) => (resultSpot = s))
      .catch(() => (failed = true));

    const tick = () => {
      if (cancelled) return;
      setLabel(names[Math.floor(Math.random() * names.length)]);
      const elapsed = Date.now() - start;
      setStageIndex(elapsed > 800 ? 2 : elapsed > 400 ? 1 : 0);
      if (elapsed > 1200 && resultSpot) {
        const finalSpot = resultSpot;
        if (!finalSpot) {
          setPhase("error");
          return;
        }
        setResult(finalSpot);
        setPhase("revealed");
        onPickedRef.current(finalSpot);
        return;
      }
      if (elapsed > 3500 && failed) {
        setPhase("error");
        return;
      }
      const delay = Math.min(50 + Math.pow(elapsed / 2200, 2.1) * 245, 320);
      timer.current = window.setTimeout(tick, delay);
    };
    tick();

    return () => {
      cancelled = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [rollKey, filters, pool, availableRankedPool]);

  const filterChips = useMemo(() => describeFilters(filters), [filters]);
  const briefLabel = filterChips[0]?.label ?? "Open brief";
  const alternatives = result
    ? chooseAlternativeDetails(result, pool, filters, 3, timeContext)
    : [];
  const resultBrief = result ? decisionBrief(result, timeContext) : null;
  const cat = result ? CATEGORY_META[result.category] : null;
  const tier = result?.ownerTier ?? result?.communityTier;
  const score = result ? scoreOf(result) : null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-ink-900/88 p-4 backdrop-blur-xl sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Place recommendation"
    >
      <div className="noise" />
      <div className="mx-auto grid min-h-full w-full max-w-5xl place-items-center py-4 sm:py-6">
        <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="dialog-close"
            aria-label="Close recommendation"
          >
            ×
          </button>
          {phase === "rolling" && (
            <div className="pull-machine decision-deck glass mx-auto w-full max-w-md overflow-hidden rounded-[1.6rem] p-4 sm:rounded-[2rem] sm:p-5">
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-aqua">
                    Choosing now
                  </p>
                  <p className="mt-1 text-sm text-mist-300">
                    Matching the brief to this time of day.
                  </p>
                </div>
                <span className="rounded-full border border-aqua/20 bg-aqua/10 px-3 py-1.5 font-mono text-xs text-aqua">
                  {timeContext.timeLabel}
                </span>
              </div>

              <div className="decision-deck-stage mt-5">
                <div className="deck-stack" aria-live="polite">
                  <div className="deck-card deck-card-back deck-card-back-one" />
                  <div className="deck-card deck-card-back deck-card-back-two" />
                  <div className="deck-card deck-card-front">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-mist-400">
                        {stages[stageIndex]}
                      </span>
                      <span className="h-2 w-2 rounded-full bg-aqua shadow-[0_0_18px_rgba(54,214,197,0.9)]" />
                    </div>
                    <p className="mt-7 line-clamp-2 min-h-[4.25rem] text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] text-mist-100">
                      {label}
                    </p>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-mist-400">
                      <span>{timeContext.modeLabel}</span>
                      <span>{briefLabel}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="decision-progress">
                  {stages.map((stage, index) => (
                    <span key={stage} className={`decision-progress-step ${stageIndex >= index ? "is-active" : ""}`}>
                      <span>{index + 1}</span>
                      {stage}
                    </span>
                  ))}
                </div>
                <div className="decision-progress-bar">
                  <span style={{ width: `${((stageIndex + 1) / stages.length) * 100}%` }} />
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-sm leading-6 text-mist-300">
                  Scoring category fit, current filters, personal signal when available, and what works at this hour.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="decision-chip border-aqua/25 bg-aqua/10 text-aqua">
                    Good-now logic
                  </span>
                  <span className="decision-chip border-white/10 bg-white/[0.055] text-mist-300">
                    {briefLabel}
                  </span>
                  <span className="decision-chip border-gilt/25 bg-gilt/10 text-gilt">
                    Hours need live check
                  </span>
                </div>
              </div>
            </div>
          )}

          {phase === "revealed" && result && cat && resultBrief && (
            <div className={showAlternatives ? "grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]" : "mx-auto max-w-3xl"}>
              <section className="glass relative min-w-0 overflow-hidden rounded-[1.5rem] p-4 sm:rounded-[2rem] sm:p-7">
                <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gilt/70 to-transparent" />
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs uppercase text-aqua">
                      Your pull · {timeContext.modeLabel}
                    </p>
                    <div className="mt-3 flex min-w-0 flex-wrap items-center gap-3">
                      <span className="hidden h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] text-2xl sm:grid">
                        {cat.glyph}
                      </span>
                      <div className="min-w-0 flex-1 pr-8 sm:pr-0">
                        <h2 id="pull-dialog-title" className="break-words text-[2.05rem] font-semibold leading-[0.98] tracking-[-0.025em] text-mist-100 sm:text-5xl">
                          {result.name}
                        </h2>
                        <p className="mt-2 text-sm text-mist-400">
                          {[result.area, result.cuisine, result.price].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                  </div>
                  {score != null && (
                    <div className="score-tile w-full sm:min-w-[92px] sm:w-auto">
                      <p className="font-mono text-3xl leading-none text-gilt">{score.toFixed(1)}</p>
                      <p className="mt-1 text-[10px] uppercase text-mist-400">Worth-It</p>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <TierCrest tier={tier} />
                  {fitChips(result, filters, timeContext).map((chip) => (
                    <span key={`${chip.tone}-${chip.label}`} className={`decision-chip ${chipClass(chip.tone)}`}>
                      {chip.label}
                    </span>
                  ))}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="decision-brief-card min-w-0 sm:col-span-2">
                      <p className="text-[10px] uppercase text-aqua">Why it fits</p>
                    <p className="mt-2 text-base leading-7 text-mist-100">{resultBrief.whyGo}</p>
                  </div>
                  <div className="decision-brief-card min-w-0">
                    <p className="text-[10px] uppercase text-mist-400">Signal</p>
                    <p className="mt-2 font-display text-2xl text-mist-100">{resultBrief.scoreLabel}</p>
                  </div>
                  <div className="decision-brief-card min-w-0 sm:col-span-3">
                    <p className="text-[10px] uppercase text-aqua">Right now</p>
                    <p className="mt-2 text-sm leading-6 text-mist-300">{resultBrief.timeReason} Check live hours before leaving.</p>
                  </div>
                  <div className="decision-brief-card min-w-0 sm:col-span-2">
                    <p className="text-[10px] uppercase text-mist-400">Best for</p>
                    <p className="mt-2 text-sm leading-6 text-mist-300">{resultBrief.bestFor}</p>
                  </div>
                  <div className="decision-brief-card min-w-0">
                    <p className="text-[10px] uppercase text-mist-400">Reality check</p>
                    <p className="mt-2 text-sm leading-6 text-mist-300">{resultBrief.caveat}</p>
                  </div>
                </div>

                <div className="mt-7 flex flex-wrap gap-2">
                  <Link
                    to={`/spot/${result.slug}`}
                    onClick={onClose}
                    className="soft-button btn bg-mist-100 text-ink-900 hover:bg-white"
                  >
                    See details
                  </Link>
                  {result.googleMapsUrl && (
                    <a
                      href={result.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn border border-white/10 bg-white/10 text-mist-100 hover:bg-white/15"
                    >
                      Maps
                    </a>
                  )}
                  <SaveSpotButton
                    slug={result.slug}
                    saved={result.saved}
                    onSignIn={onSignIn}
                    onChange={(saved) => setResult((prev) => (prev ? { ...prev, saved } : prev))}
                  />
                  {user ? (
                    <Link
                      to={`/spot/${result.slug}#reviews`}
                      onClick={onClose}
                      className="btn border border-orchid/25 bg-orchid/10 text-orchid hover:bg-orchid/15"
                    >
                      Review
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={onSignIn}
                      className="btn border border-orchid/25 bg-orchid/10 text-orchid hover:bg-orchid/15"
                    >
                      Log in to review
                    </button>
                  )}
                  <button
                    onClick={() => setRollKey((k) => k + 1)}
                    className="btn-ghost border border-white/10"
                  >
                    Pull again
                  </button>
                  <button onClick={onLoosenFilters} className="btn-ghost border border-white/10">
                    Loosen filters
                  </button>
                </div>
              </section>

              {showAlternatives && (
              <aside className="glass min-w-0 rounded-[1.5rem] p-4 sm:rounded-[2rem] sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase text-mist-400">Also good</p>
                    <p className="mt-1 text-sm text-mist-300">
                      Similar choices from this pool
                    </p>
                  </div>
                  <button onClick={() => setShowAlternatives(false)} className="btn-ghost px-3 py-2 text-xs">
                    Close
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  {alternatives.length > 0 ? (
                    alternatives.map(({ spot, reason, timeFit }, index) => (
                      <Link
                        key={spot.id}
                        to={`/spot/${spot.slug}`}
                        onClick={onClose}
                        className="alternative-row"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 font-mono text-xs text-mist-300">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-mist-100">
                            {spot.name}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-mist-400">
                            {reason}
                          </span>
                        </span>
                        <span className={`decision-chip shrink-0 ${chipClass(timeFit.tone)}`}>
                          {timeFit.label}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-mist-400">
                      This filter pool is narrow. Loosen filters to compare alternatives.
                    </p>
                  )}
                </div>
              </aside>
              )}
            </div>
          )}

          {phase === "error" && (
            <div className="glass mx-auto max-w-lg rounded-3xl p-8 text-center">
              <p className="font-display text-3xl text-mist-100">No clean pull.</p>
              <p className="mt-3 text-sm leading-6 text-mist-400">
                The current constraints are too tight. Loosen the pool and try again.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button onClick={onLoosenFilters} className="btn bg-mist-100 text-ink-900 hover:bg-white">
                  Loosen filters
                </button>
                <button onClick={onClose} className="btn-ghost border border-white/10">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, type SpotQuery } from "../api";
import type { Spot } from "../types";
import { CATEGORY_META } from "../lib/tiers";
import TierCrest from "./TierCrest";

interface Props {
  filters: SpotQuery;
  pool: Spot[];
  onClose: () => void;
  onPicked: (spot: Spot) => void;
}

export default function DecideOverlay({ filters, pool, onClose, onPicked }: Props) {
  const [phase, setPhase] = useState<"rolling" | "revealed" | "error">("rolling");
  const [label, setLabel] = useState(pool[0]?.name ?? "…");
  const [result, setResult] = useState<Spot | null>(null);
  const [rollKey, setRollKey] = useState(0);
  const timer = useRef<number | null>(null);
  const onPickedRef = useRef(onPicked);

  useEffect(() => {
    onPickedRef.current = onPicked;
  }, [onPicked]);

  useEffect(() => {
    let cancelled = false;
    setPhase("rolling");
    setResult(null);
    const names = pool.length ? pool.map((s) => s.name) : ["finding…"];
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
      if (elapsed > 2300 && resultSpot) {
        setResult(resultSpot);
        setPhase("revealed");
        onPickedRef.current(resultSpot);
        return;
      }
      if (elapsed > 6000 && failed) {
        setPhase("error");
        return;
      }
      // Decelerate for suspense: delays grow as we approach the reveal.
      const delay = Math.min(60 + Math.pow(elapsed / 2300, 2.2) * 260, 340);
      timer.current = window.setTimeout(tick, delay);
    };
    tick();

    return () => {
      cancelled = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [rollKey, filters, pool]);

  const cat = result ? CATEGORY_META[result.category] : null;
  const tier = result?.ownerTier ?? result?.communityTier;
  const score = result?.ownerScore ?? result?.avgScore;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink-900/88 p-5 backdrop-blur-xl"
      onClick={onClose}
    >
      {/* spinning ambient ring */}
      <div
        className="pointer-events-none absolute h-[620px] w-[620px] max-w-[110vw] rounded-full blur-3xl conic-glow opacity-20 animate-[spin_20s_linear_infinite]"
        aria-hidden
      />
      <div className="noise" />

      <div
        className="relative w-full max-w-xl text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === "rolling" && (
          <div className="glass flex flex-col items-center gap-6 rounded-[2.25rem] px-6 py-10">
            <div className="relative grid h-24 w-24 place-items-center rounded-[2rem] border border-white/10 bg-white/[0.06]">
              <span className="absolute inset-0 rounded-[2rem] conic-glow opacity-20 blur-xl" />
              <span className="relative text-5xl animate-spin" aria-hidden>
                🎲
              </span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-aqua">
                Shuffling your atlas
              </p>
              <p className="mt-2 text-sm text-mist-400">
                Filtering out regret. Keeping the fun.
              </p>
            </div>
            <div
              className="min-h-[4rem] max-w-md font-display text-3xl leading-tight text-mist-100 sm:text-4xl"
              style={{ animation: "rollBlur 0.4s ease-in-out infinite" }}
            >
              {label}
            </div>
            <div className="h-2 w-72 overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-aqua via-leaf to-gilt animate-[shimmer_1s_linear_infinite]" />
            </div>
          </div>
        )}

        {phase === "revealed" && result && cat && (
          <div className="relative">
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full conic-glow animate-flashRing blur-xl"
              aria-hidden
            />
            <div className="pointer-events-none absolute left-8 top-6 text-2xl animate-popIn">✦</div>
            <div className="pointer-events-none absolute right-10 top-10 text-xl animate-popIn">●</div>
            <div className="pointer-events-none absolute bottom-12 left-10 text-xl animate-popIn">◐</div>
            <div className="relative animate-popIn overflow-hidden rounded-[2.25rem] glass p-8">
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gilt/70 to-transparent" />
              <p className="text-xs uppercase tracking-[0.4em] text-aqua">
                Your pull
              </p>
              <div className="mt-3 text-4xl" aria-hidden>
                {cat.glyph}
              </div>
              <h2 className="mt-2 font-display text-4xl leading-tight text-mist-100 sm:text-5xl">
                {result.name}
              </h2>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <TierCrest tier={tier} />
                {result.cuisine && (
                  <span className="chip bg-white/[0.06] text-mist-300">{result.cuisine}</span>
                )}
                {result.area && (
                  <span className="chip bg-white/[0.06] text-mist-300">{result.area}</span>
                )}
                {result.price && (
                  <span className="chip bg-white/[0.06] text-mist-300">{result.price}</span>
                )}
              </div>
              {score != null && (
                <div className="mx-auto mt-5 max-w-xs rounded-2xl border border-white/10 bg-white/[0.045] p-3">
                  <p className="font-mono text-3xl text-gilt">{score.toFixed(1)}</p>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-mist-400">
                    Worth-It Score
                  </p>
                </div>
              )}
              {result.ownerVerdict && (
                <p className="mt-3 font-display text-lg text-mist-200">
                  “{result.ownerVerdict}”
                </p>
              )}

              <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
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
                    className="btn bg-white/10 text-mist-100 hover:bg-white/15"
                  >
                    Maps ↗
                  </a>
                )}
                <button
                  onClick={() => setRollKey((k) => k + 1)}
                  className="btn-ghost border border-white/10"
                >
                  Pull again
                </button>
              </div>
            </div>
            <button onClick={onClose} className="btn-ghost mt-4 text-xs">
              close
            </button>
          </div>
        )}

        {phase === "error" && (
          <div className="rounded-3xl glass p-8">
            <p className="text-mist-200">No spots match those filters.</p>
            <button onClick={onClose} className="btn-ghost mt-4">
              close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

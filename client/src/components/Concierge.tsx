import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { ConciergeResponse } from "../types";
import SpotCard from "./SpotCard";
import { useSingaporeClock } from "./LiveStatus";

const SUGGESTIONS = [
  "solo coffee with my laptop",
  "first date, not too loud",
  "late-night cocktails with the team",
  "cheap dinner near Tanjong Pagar",
];

const ROTATING = [
  "Tell me the vibe, budget, area, or person...",
  "quiet coffee to work for two hours",
  "client lunch that feels polished",
  "romantic but not stiff",
  "cheap, fast, and actually good",
];

function isLowIntentPrompt(value: string) {
  const words = value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}$]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const lowIntent = new Set(["hi", "hello", "hey", "yo", "sup", "ok", "okay", "test", "help"]);
  return words.length === 0 || (words.length <= 2 && words.every((word) => lowIntent.has(word)));
}

export default function Concierge({ onSignIn }: { onSignIn: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConciergeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeContext = useSingaporeClock();

  useEffect(() => {
    if (focused || prompt) return;
    const t = setInterval(
      () => setPlaceholderIdx((i) => (i + 1) % ROTATING.length),
      3200
    );
    return () => clearInterval(t);
  }, [focused, prompt]);

  async function ask(q: string) {
    const query = q.trim();
    if (!query || loading) return;
    if (isLowIntentPrompt(query)) {
      setError(null);
      setResult({
        mood: "What kind of spot do you need: coffee, dinner, drinks, date, client, budget, or area?",
        picks: [],
        spots: [],
        source: "clarification",
        suggestions: [
          "quiet coffee with my laptop",
          "first date, not too loud",
          "client lunch tomorrow",
          "late drinks around Tanjong Pagar",
          "cheap dinner under $30",
        ],
      });
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.concierge(query);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const hasPicks = (result?.picks.length ?? 0) > 0;
  const resultSuggestions = result?.suggestions?.length
    ? result.suggestions
    : SUGGESTIONS;
  const sourceLabel =
    result?.source === "claude"
      ? "Matched from your atlas"
      : result?.source === "local"
        ? "Matched locally from your atlas"
        : "Needs one more constraint";
  const rankedSpots =
    result && hasPicks
      ? result.picks
          .map((pick) => ({
            pick,
            spot: result.spots.find((s) => s.slug === pick.slug),
          }))
          .filter((item): item is { pick: { slug: string; reason: string }; spot: NonNullable<typeof item.spot> } =>
            Boolean(item.spot)
          )
      : [];

  return (
    <div className="relative w-full">
      <div className="concierge-frame relative overflow-hidden rounded-[28px] p-[1px]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(prompt);
          }}
          className="concierge-surface relative grid gap-4 rounded-[27px] p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-5"
        >
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <span
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] text-xl text-aqua transition-transform ${
              loading ? "animate-breathe" : ""
            }`}
            aria-hidden
          >
            ⌕
          </span>

          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-mist-400">
              <span className="h-1.5 w-1.5 rounded-full bg-aqua shadow-[0_0_12px_#36d6c5]" />
              Tell us what you need
            </div>
            <input
              ref={inputRef}
              value={prompt}
              onChange={(e) => {
                const next = e.target.value;
                setPrompt(next);
                if (!next.trim()) {
                  setResult(null);
                  setError(null);
                }
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={ROTATING[placeholderIdx]}
              className="w-full bg-transparent text-base font-medium text-mist-100 placeholder:text-mist-400/70 outline-none sm:text-lg"
              aria-label="Describe your mood and get a recommendation"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="btn min-h-[48px] shrink-0 bg-aqua px-5 font-semibold text-ink-900 shadow-[inset_0_1px_0_rgba(255,255,255,.55),0_18px_38px_-22px_rgba(54,214,197,.8)] hover:bg-[#57eadc] disabled:opacity-40"
          >
            {loading ? "Looking" : "Find places"}
            <span aria-hidden>→</span>
          </button>
        </form>
      </div>

      {!result && !loading && (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setPrompt(s);
                void ask(s);
              }}
              className="chip mini-card px-4 py-2 text-mist-300 hover:-translate-y-0.5 hover:border-aqua/40 hover:text-mist-100"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-ember/30 bg-ember/10 p-4 text-sm text-ember">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-4 animate-rise">
          <div className="h-1.5 overflow-hidden rounded-full bg-ink-500">
            <div className="h-full w-1/2 rounded-full conic-glow animate-[shimmer_1.2s_linear_infinite]" />
          </div>
          <p className="mt-3 text-sm text-mist-400">
            Reading the room, filtering the catalog, and checking what actually fits.
          </p>
        </div>
      )}

      {result && (
        <div className="mt-6 animate-rise">
          <div className="result-panel">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.26em] text-aqua">
                  {sourceLabel}
                </p>
                <p className="mt-2 font-display text-2xl leading-tight text-mist-100">
                  "{result.mood}"
                </p>
                <p className="mt-2 text-xs text-mist-400">
                  {timeContext.timeLabel} SGT · {timeContext.modeLabel} · hours not verified
                </p>
              </div>
              <button
                onClick={() => {
                  setResult(null);
                  setPrompt("");
                  inputRef.current?.focus();
                }}
                className="btn-ghost w-max shrink-0 border border-white/10 text-xs"
              >
                Clear
              </button>
            </div>

            {hasPicks ? (
              <>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {rankedSpots.map(({ pick, spot }) => (
                    <SpotCard key={pick.slug} spot={spot} reason={pick.reason} onSignIn={onSignIn} />
                  ))}
                </div>
              </>
            ) : (
              <div className="concierge-chat-panel mt-5">
                <div className="flex gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-aqua/25 bg-aqua/10 text-aqua">
                    ⌕
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs uppercase text-aqua">Concierge</p>
                    <p className="mt-1 text-sm leading-6 text-mist-200">
                      {result.mood ||
                        "Give me one or two constraints and I will make the call: occasion, area, price, company, or energy level."}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {resultSuggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setPrompt(s);
                        void ask(s);
                      }}
                      className="chip mini-card px-4 py-2 text-mist-300 hover:-translate-y-0.5 hover:border-aqua/40 hover:text-mist-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

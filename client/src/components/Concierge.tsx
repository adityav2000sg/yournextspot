import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { ConciergeResponse } from "../types";
import SpotCard from "./SpotCard";

const SUGGESTIONS = [
  "cozy rainy-day date",
  "impress a client tomorrow",
  "cheap & cheerful, big portions",
  "solo coffee with my laptop",
  "celebrating a promotion 🍾",
  "first date, not too loud",
  "late-night cocktails with the team",
  "somewhere new I haven't tried",
];

const ROTATING = [
  "How are you feeling tonight?",
  "Tell me the vibe…",
  "Who are you going with?",
  "Hungry, thirsty, or in need of caffeine?",
  "Describe the moment. I'll find the spot.",
];

export default function Concierge() {
  const [prompt, setPrompt] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConciergeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

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
    : SUGGESTIONS.slice(0, 5);
  const sourceLabel =
    result?.source === "claude"
      ? hasPicks
        ? "curated by claude"
        : "clarifying with claude"
      : result?.source === "local"
        ? "matched from your atlas"
        : "tell me a little more";

  return (
    <div className="relative w-full">
      <div
        className={`pointer-events-none absolute -inset-4 rounded-[38px] blur-3xl conic-glow transition-opacity duration-700 ${
          focused
            ? "opacity-[0.16] animate-[spin_20s_linear_infinite]"
            : "opacity-[0.06]"
        }`}
        aria-hidden
      />

      <div className="concierge-frame relative overflow-hidden rounded-[30px] p-[1px]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(prompt);
          }}
          className="concierge-surface relative flex items-center gap-3 rounded-[29px] px-4 py-3.5 sm:px-5 sm:py-4"
        >
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] text-lg text-aqua transition-transform ${
              loading ? "animate-breathe" : "animate-floaty"
            }`}
            aria-hidden
          >
            {loading ? "✦" : "⌕"}
          </span>

          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-mist-400">
              <span className="h-1.5 w-1.5 rounded-full bg-aqua shadow-[0_0_12px_#36d6c5]" />
              Claude concierge
            </div>
            <input
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
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
            className="btn shrink-0 bg-aqua px-5 py-3 font-semibold text-ink-900 shadow-[inset_0_1px_0_rgba(255,255,255,.55),0_18px_38px_-22px_rgba(54,214,197,.8)] hover:bg-[#57eadc] disabled:opacity-40"
          >
            {loading ? (
              <span className="text-shimmer font-semibold">thinking…</span>
            ) : (
              <>
                Ask
                <span aria-hidden>→</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Suggestion chips */}
      {!result && !loading && (
        <div className="mt-4 overflow-hidden">
          <div className="flex w-max gap-2 pr-2 sm:w-auto sm:flex-wrap sm:justify-start">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setPrompt(s);
                  void ask(s);
                }}
                className="chip mini-card whitespace-nowrap px-4 py-2 text-mist-300 hover:-translate-y-0.5 hover:border-aqua/40 hover:text-mist-100"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 text-center text-sm text-ember">{error}</p>
      )}

      {loading && (
        <div className="mt-8 flex flex-col items-center gap-3 text-mist-400 animate-rise">
          <div className="h-1 w-48 overflow-hidden rounded-full bg-ink-500">
            <div className="h-full w-1/2 rounded-full conic-glow animate-[shimmer_1.4s_linear_infinite]" />
          </div>
          <p className="text-sm">Reading the room and searching your atlas…</p>
        </div>
      )}

      {result && (
        <div className="mt-8 animate-rise">
          <div className="mb-5 flex items-start justify-between gap-4 rounded-[1.75rem] glass p-5">
            <p className="font-display text-lg leading-snug text-mist-100 sm:text-xl">
              <span className="text-aqua">“</span>
              {result.mood}
              <span className="text-aqua">”</span>
            </p>
            <button
              onClick={() => {
                setResult(null);
                setPrompt("");
                inputRef.current?.focus();
              }}
              className="btn-ghost shrink-0 !px-3 !py-1.5 text-xs"
            >
              clear
            </button>
          </div>

          {hasPicks ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.picks.map((pick) => {
                const spot = result.spots.find((s) => s.slug === pick.slug);
                if (!spot) return null;
                return (
                  <SpotCard key={pick.slug} spot={spot} reason={pick.reason} />
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-white/10 bg-ink-800/85 p-5 shadow-2xl shadow-black/30">
              <p className="text-sm leading-6 text-mist-300">
                Give me one or two constraints and I’ll make the call.
              </p>
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

          <p className="mt-4 text-center text-[11px] uppercase tracking-[0.25em] text-mist-400">
            {sourceLabel}
          </p>
        </div>
      )}
    </div>
  );
}

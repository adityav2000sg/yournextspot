import { useEffect, useMemo, useState } from "react";
import { getSingaporeTimeContext } from "../lib/timeContext";

interface Props {
  mode?: string;
  candidateCount?: number;
  activeFilters?: number;
  className?: string;
  compact?: boolean;
}

export function useSingaporeClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => getSingaporeTimeContext(now), [now]);
}

export default function LiveStatus({
  mode,
  candidateCount,
  activeFilters,
  className = "",
  compact = false,
}: Props) {
  const context = useSingaporeClock();
  const details = [
    mode || context.statusLabel,
    typeof candidateCount === "number" ? `${candidateCount} candidates` : null,
    typeof activeFilters === "number" && activeFilters > 0
      ? `${activeFilters} filter${activeFilters === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);

  return (
    <div className={`live-status ${compact ? "live-status-compact" : ""} ${className}`}>
      <span className="live-status-dot" aria-hidden />
      <span className="font-mono text-[0.78rem] text-mist-100">{context.timeLabel}</span>
      <span className="hidden h-4 w-px bg-white/10 sm:block" />
      <span className="truncate text-[0.78rem] font-semibold text-mist-200">
        {context.modeLabel}
      </span>
      {!compact && details.length > 0 && (
        <>
          <span className="hidden h-4 w-px bg-white/10 md:block" />
          <span className="hidden truncate text-[0.76rem] text-mist-400 md:block">
            {details.join(" · ")}
          </span>
        </>
      )}
      <span className="sr-only">Singapore time, {context.dayLabel}</span>
    </div>
  );
}

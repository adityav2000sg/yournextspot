/**
 * A stylised, gently rotating globe for the hero.
 * Latitude lines are drawn as straight chords (clipped to the sphere), while the
 * meridians drift horizontally behind a soft moving terminator to fake rotation.
 */
export default function Globe({ size = 220 }: { size?: number }) {
  const cx = 150;
  const cy = 150;
  const r = 132;
  const latitudes = [60, 92, 120, 150, 180, 208, 240];
  const meridianXs = Array.from({ length: 16 }, (_, i) => -30 + i * 30);

  return (
    <div
      className="relative animate-floaty"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* outer glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-2xl conic-glow opacity-40 animate-[spin_22s_linear_infinite]" />
      <svg viewBox="0 0 300 300" width={size} height={size}>
        <defs>
          <radialGradient id="sphere" cx="38%" cy="32%" r="80%">
            <stop offset="0%" stopColor="#1b2c5e" />
            <stop offset="42%" stopColor="#0c1330" />
            <stop offset="100%" stopColor="#04070f" />
          </radialGradient>
          <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#36d6c5" />
            <stop offset="50%" stopColor="#f7d774" />
            <stop offset="100%" stopColor="#79b7ff" />
          </linearGradient>
          <radialGradient id="shine" cx="35%" cy="28%" r="45%">
            <stop offset="0%" stopColor="rgba(180,220,255,0.55)" />
            <stop offset="100%" stopColor="rgba(180,220,255,0)" />
          </radialGradient>
          <clipPath id="globeClip">
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
        </defs>

        {/* body */}
        <circle cx={cx} cy={cy} r={r} fill="url(#sphere)" />

        <g clipPath="url(#globeClip)">
          {/* meridians (drifting) */}
          <g className="globe-meridians" stroke="#79d9cf" strokeOpacity="0.24" strokeWidth="1">
            {meridianXs.map((x) => (
              <line key={x} x1={x} y1={10} x2={x} y2={290} />
            ))}
          </g>
          {/* latitudes (static chords) */}
          <g stroke="#f7d774" strokeOpacity="0.14" strokeWidth="1">
            {latitudes.map((y) => (
              <line key={y} x1={10} y1={y} x2={290} y2={y} />
            ))}
          </g>
          {/* drifting terminator shadow for a sense of rotation */}
          <ellipse
            className="globe-terminator"
            cx={cx}
            cy={cy}
            rx={r * 0.7}
            ry={r}
            fill="#04060d"
            opacity="0.45"
          />
          {/* specular highlight */}
          <circle cx={cx} cy={cy} r={r} fill="url(#shine)" />
        </g>

        {/* rim */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="url(#rim)"
          strokeWidth="1.5"
          strokeOpacity="0.9"
        />
      </svg>
    </div>
  );
}

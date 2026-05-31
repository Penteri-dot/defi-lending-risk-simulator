interface Props {
  value: number | null;
  size?: number;
}

const MIN = 0;
const MAX = 3;

function valueToAngle(v: number): number {
  const clamped = Math.min(Math.max(v, MIN), MAX);
  // Arc from -210° to +30° (240° total sweep), left to right
  return -210 + (clamped / MAX) * 240;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const s = polarToCartesian(cx, cy, r, startAngle);
  const e = polarToCartesian(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export function HealthFactorGauge({ value, size = 260 }: Props) {
  const cx = size / 2;
  const cy = size / 2 + 20;
  const r = size * 0.38;
  const strokeW = size * 0.055;

  const trackStart = -210;
  const trackEnd = 30;


  // Zone boundaries
  const dangerEnd = valueToAngle(1.0);
  const warningEnd = valueToAngle(2.0);

  // Needle angle
  const needleAngle = value != null ? valueToAngle(value) : trackStart;
  const needleTip = polarToCartesian(cx, cy, r - strokeW / 2 - 4, needleAngle);
  const needleBase1 = polarToCartesian(cx, cy, 10, needleAngle + 90);
  const needleBase2 = polarToCartesian(cx, cy, 10, needleAngle - 90);

  const strokeColor =
    value == null
      ? "#475569"
      : value >= 2.0
      ? "#34d399"
      : value >= 1.0
      ? "#fbbf24"
      : "#f87171";

  return (
    <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`}>
      {/* Track — full arc background */}
      <path
        d={describeArc(cx, cy, r, trackStart, trackEnd)}
        fill="none"
        stroke="#1e293b"
        strokeWidth={strokeW}
        strokeLinecap="round"
      />

      {/* Red zone 0→1 */}
      <path
        d={describeArc(cx, cy, r, trackStart, dangerEnd)}
        fill="none"
        stroke="#7f1d1d"
        strokeWidth={strokeW}
        strokeLinecap="butt"
        opacity="0.6"
      />
      {/* Amber zone 1→2 */}
      <path
        d={describeArc(cx, cy, r, dangerEnd, warningEnd)}
        fill="none"
        stroke="#78350f"
        strokeWidth={strokeW}
        strokeLinecap="butt"
        opacity="0.6"
      />
      {/* Green zone 2→3 */}
      <path
        d={describeArc(cx, cy, r, warningEnd, trackEnd)}
        fill="none"
        stroke="#14532d"
        strokeWidth={strokeW}
        strokeLinecap="butt"
        opacity="0.6"
      />

      {/* Filled progress arc */}
      {value != null && (
        <path
          d={describeArc(cx, cy, r, trackStart, needleAngle)}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeW * 0.5}
          strokeLinecap="round"
        />
      )}

      {/* Tick marks at 1.0 and 2.0 */}
      {[1.0, 2.0].map((tick) => {
        const a = valueToAngle(tick);
        const outer = polarToCartesian(cx, cy, r + strokeW / 2 + 2, a);
        const inner = polarToCartesian(cx, cy, r - strokeW / 2 - 2, a);
        return (
          <line
            key={tick}
            x1={outer.x} y1={outer.y}
            x2={inner.x} y2={inner.y}
            stroke="#475569"
            strokeWidth={1.5}
          />
        );
      })}

      {/* Needle */}
      {value != null && (
        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
          fill={strokeColor}
          opacity="0.9"
        />
      )}

      {/* Centre hub */}
      <circle cx={cx} cy={cy} r={8} fill="#0f172a" stroke="#334155" strokeWidth={2} />

      {/* Value text */}
      <text
        x={cx}
        y={cy - r * 0.28}
        textAnchor="middle"
        className="tabular-nums"
        style={{ fontFamily: "ui-monospace, monospace", fontVariantNumeric: "tabular-nums" }}
        fontSize={size * 0.12}
        fontWeight="700"
        fill={strokeColor}
      >
        {value != null ? value.toFixed(2) : "—"}
      </text>
      <text
        x={cx}
        y={cy - r * 0.28 + size * 0.08}
        textAnchor="middle"
        fontSize={size * 0.048}
        fill="#64748b"
      >
        {value == null ? "No borrowing position" : "Health Factor"}
      </text>

      {/* Scale labels */}
      {[
        { v: 0, label: "0" },
        { v: 1, label: "1.0" },
        { v: 2, label: "2.0" },
        { v: 3, label: "3.0" },
      ].map(({ v, label }) => {
        const a = valueToAngle(v);
        const p = polarToCartesian(cx, cy, r + strokeW / 2 + 16, a);
        return (
          <text
            key={v}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.042}
            fill="#475569"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

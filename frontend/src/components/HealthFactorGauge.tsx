interface Props {
  value: number | null;
  size?: number;
}

const MIN = 0;
const MAX = 3;

/**
 * Clean 180° semicircular gauge.
 *
 * Design constraints (learned the hard way): nothing may overlap the value
 * text, so there is no needle — the reading is shown by a marker dot on the
 * arc plus a coloured progress arc, and the text sits in the empty area
 * under the semicircle's crown.
 */
function valueToAngle(v: number): number {
  const clamped = Math.min(Math.max(v, MIN), MAX);
  // -90° (left) → +90° (right), measured from 12 o'clock
  return -90 + (clamped / MAX) * 180;
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
  const r = size * 0.36;
  const strokeW = size * 0.062;
  const cy = r + strokeW / 2 + size * 0.085; // room above for the 1.0/2.0 labels
  const height = cy + size * 0.06;

  const oneAngle = valueToAngle(1.0);
  const twoAngle = valueToAngle(2.0);
  const gap = 2; // degrees between zone segments

  const valueAngle = value != null ? valueToAngle(value) : null;

  const strokeColor =
    value == null
      ? "#475569"
      : value >= 2.0
      ? "#34d399"
      : value >= 1.0
      ? "#fbbf24"
      : "#f87171";

  const marker =
    valueAngle != null ? polarToCartesian(cx, cy, r, valueAngle) : null;

  return (
    <svg
      width={size}
      height={height}
      viewBox={`0 0 ${size} ${height}`}
      className="max-w-full h-auto"
    >
      {/* Zone segments: red 0→1, amber 1→2, green 2→3 */}
      <path
        d={describeArc(cx, cy, r, -90, oneAngle - gap)}
        fill="none" stroke="#ef4444" strokeWidth={strokeW}
        strokeLinecap="round" opacity="0.22"
      />
      <path
        d={describeArc(cx, cy, r, oneAngle + gap, twoAngle - gap)}
        fill="none" stroke="#f59e0b" strokeWidth={strokeW}
        strokeLinecap="round" opacity="0.22"
      />
      <path
        d={describeArc(cx, cy, r, twoAngle + gap, 90)}
        fill="none" stroke="#10b981" strokeWidth={strokeW}
        strokeLinecap="round" opacity="0.22"
      />

      {/* Progress arc up to the current value */}
      {valueAngle != null && valueAngle > -89 && (
        <path
          d={describeArc(cx, cy, r, -90, valueAngle)}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeW}
          strokeLinecap="round"
          opacity="0.9"
        />
      )}

      {/* Marker dot on the arc */}
      {marker && (
        <circle
          cx={marker.x}
          cy={marker.y}
          r={strokeW * 0.46}
          fill="#0f172a"
          stroke={strokeColor}
          strokeWidth={2.5}
        />
      )}

      {/* Scale labels — outside the arc, never under the marker text */}
      {[
        { v: 0, label: "0" },
        { v: 1, label: "1.0" },
        { v: 2, label: "2.0" },
        { v: 3, label: "3.0" },
      ].map(({ v, label }) => {
        const a = valueToAngle(v);
        const p = polarToCartesian(cx, cy, r + strokeW / 2 + size * 0.05, a);
        return (
          <text
            key={v}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.042}
            fill="#64748b"
          >
            {label}
          </text>
        );
      })}

      {/* Value + label in the open area under the crown of the arc */}
      <text
        x={cx}
        y={cy - r * 0.22}
        textAnchor="middle"
        style={{ fontVariantNumeric: "tabular-nums" }}
        fontSize={size * 0.145}
        fontWeight="700"
        fill={strokeColor}
      >
        {value != null ? value.toFixed(2) : "—"}
      </text>
      <text
        x={cx}
        y={cy - r * 0.22 + size * 0.075}
        textAnchor="middle"
        fontSize={size * 0.046}
        fill="#64748b"
      >
        {value == null ? "No borrowing position" : "Health Factor"}
      </text>
    </svg>
  );
}

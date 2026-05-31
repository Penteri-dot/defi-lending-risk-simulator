import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { StressTestResponse } from "../types";
import { formatUSD } from "../utils/formatting";

interface Props {
  result: StressTestResponse;
}

export function StressBarChart({ result }: Props) {
  const data = [
    { scenario: "Original", collateral: result.original_collateral_value },
    { scenario: "Stressed", collateral: result.stressed_collateral_value },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barSize={60} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="scenario"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#e2e8f0",
          }}
          formatter={(value) => [formatUSD(typeof value === "number" ? value : null), "Collateral Value"]}
        />
        <Bar dataKey="collateral" radius={[4, 4, 0, 0]}>
          <Cell fill="#6366f1" />
          <Cell fill={result.liquidation_triggered ? "#ef4444" : "#f59e0b"} />
        </Bar>
        {/* Borrowed value reference line */}
        <ReferenceLine
          y={result.original_collateral_value * 1}
          stroke="transparent"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}


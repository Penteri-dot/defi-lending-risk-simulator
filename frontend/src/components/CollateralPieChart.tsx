import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { CollateralBreakdownItem } from "../types";
import { formatUSD } from "../utils/formatting";

const COLORS: Record<string, string> = {
  BTC: "#f59e0b",
  ETH: "#6366f1",
  USDC: "#22d3ee",
};
const DEFAULT_COLOR = "#64748b";

interface Props {
  breakdown: CollateralBreakdownItem[];
}

export function CollateralPieChart({ breakdown }: Props) {
  if (breakdown.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No collateral positions
      </div>
    );
  }

  const data = breakdown.map((item) => ({
    name: item.asset,
    value: item.value_usd,
    share: item.share_of_collateral,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          dataKey="value"
          startAngle={90}
          endAngle={-270}
        >
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={COLORS[entry.name] ?? DEFAULT_COLOR}
              stroke="transparent"
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#e2e8f0",
          }}
          formatter={(value, name) => [
            formatUSD(typeof value === 'number' ? value : null),
            String(name),
          ]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ color: "#94a3b8", fontSize: "12px" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}


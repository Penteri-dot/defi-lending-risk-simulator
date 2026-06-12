import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { listScenarios, replayScenario } from "../api/client";
import { usePortfolio } from "../context/PortfolioContext";
import type { ScenarioInfo, ScenarioReplayResponse } from "../types";
import {
  formatHealthFactor,
  formatPercent,
  healthFactorColor,
} from "../utils/formatting";

export function Scenarios() {
  const { portfolio } = usePortfolio();
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<ScenarioReplayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listScenarios().then((res) => {
      if (res.data) {
        setScenarios(res.data.scenarios);
        if (res.data.scenarios.length > 0) setSelected(res.data.scenarios[0].id);
      } else {
        setError(res.error ?? "Could not load scenarios.");
      }
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    replayScenario(selected, {
      collateral: portfolio.collateral,
      borrows: portfolio.borrows,
      prices: portfolio.prices as Record<string, number>,
    }).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.data) setResult(res.data);
      else setError(res.error ?? "Replay failed.");
    });
    return () => {
      cancelled = true;
    };
  }, [selected, portfolio]);

  const meta = scenarios.find((s) => s.id === selected) ?? null;
  const summary = result?.summary ?? null;

  const chartData =
    result?.days.map((d) => ({
      date: d.date.slice(5), // MM-DD
      hf: d.health_factor,
      collateral: d.total_collateral_value,
    })) ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-0.5">
          Historical Scenarios
        </h2>
        <p className="text-sm text-slate-500 max-w-3xl">
          Your current position structure — same collateral mix, same leverage,
          same starting health factor — replayed through real crisis weeks using
          actual daily closes. No hypothetical shocks: this is what the market
          actually did.
        </p>
      </div>

      {/* Scenario picker */}
      <div className="flex flex-wrap gap-2">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={`px-3 py-2 rounded text-sm border transition-colors
              ${selected === s.id
                ? "bg-slate-700/80 text-slate-100 border-slate-500 font-medium"
                : "bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-slate-200"
              }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {meta && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-5">
          <div className="text-xs text-slate-500 mb-1">{meta.window}</div>
          <p className="text-sm text-slate-300 max-w-3xl">{meta.description}</p>
        </div>
      )}

      {/* Verdict */}
      {summary && !loading && (
        <div
          className={`border rounded-lg p-5 ${
            summary.was_liquidated
              ? "bg-red-900/30 border-red-700/50"
              : "bg-emerald-900/20 border-emerald-700/40"
          }`}
        >
          <div className="text-sm font-semibold mb-1 text-slate-100">
            {summary.was_liquidated
              ? `Liquidated on ${summary.first_liquidation_date}`
              : "Survived the window"}
          </div>
          <p className="text-sm text-slate-300">
            {summary.was_liquidated
              ? "The health factor crossed below 1.0 — on-chain, this position would have been (partially) liquidated automatically. No margin call, no cure period."
              : summary.min_health_factor !== null && summary.min_health_factor < 1.1
              ? `Survived — but the buffer shrank to ${(
                  ((summary.min_health_factor ?? 1) - 1) * 100
                ).toFixed(1)}% at the worst point. One more bad day would have ended it.`
              : "The position kept a buffer above the liquidation line throughout the window."}
          </p>
        </div>
      )}

      {/* Summary stats */}
      {summary && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat
            label="Starting HF"
            value={formatHealthFactor(summary.starting_health_factor)}
            color={healthFactorColor(summary.starting_health_factor)}
          />
          <Stat
            label={`Lowest HF (${summary.min_health_factor_date ?? "—"})`}
            value={formatHealthFactor(summary.min_health_factor)}
            color={healthFactorColor(summary.min_health_factor)}
          />
          <Stat
            label="Ending HF"
            value={formatHealthFactor(summary.ending_health_factor)}
            color={healthFactorColor(summary.ending_health_factor)}
          />
          <Stat
            label="Max collateral drawdown"
            value={formatPercent(summary.max_collateral_drawdown)}
            color="text-slate-200"
          />
        </div>
      )}

      {/* Health factor path */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-5">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Health factor, day by day
        </div>
        {loading ? (
          <p className="text-sm text-slate-500 py-10 text-center">Replaying…</p>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                domain={["auto", "auto"]}
                tickFormatter={(v: number) => v.toFixed(2)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#cbd5e1" }}
                formatter={(value, name) =>
                  typeof value === "number"
                    ? [value.toFixed(3), String(name)]
                    : [String(value ?? "—"), String(name)]
                }
              />
              <ReferenceLine
                y={1}
                stroke="#f87171"
                strokeDasharray="4 4"
                label={{
                  value: "Liquidation (HF = 1.0)",
                  fill: "#f87171",
                  fontSize: 11,
                  position: "insideBottomRight",
                }}
              />
              <Line
                type="monotone"
                dataKey="hf"
                name="Health factor"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={{ r: 3, fill: "#38bdf8" }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-500 py-10 text-center">
            Add borrow positions to see a health factor path.
          </p>
        )}
      </div>

      <p className="text-xs text-slate-600 max-w-3xl">
        Method: your position is value-normalised to the scenario's first day
        (preserving collateral mix, leverage and health factor), then held fixed
        — no top-ups, no rebalancing. Daily closes from Coinbase (BTC, ETH) and
        OKX (USDC); closes understate intraday stress, so results are an
        optimistic bound. Educational tool, not financial advice.
      </p>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

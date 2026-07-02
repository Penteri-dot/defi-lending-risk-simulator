import { useState } from "react";
import { getLiquidationProbability } from "../api/client";
import { usePortfolio } from "../context/usePortfolio";
import type { LiquidationProbabilityResponse } from "../types";
import {
  formatHealthFactor,
  formatPercent,
  healthFactorColor,
} from "../utils/formatting";

const HORIZONS = [7, 30, 90] as const;

export function LiquidationRisk() {
  const { portfolio } = usePortfolio();
  const [horizon, setHorizon] = useState<number>(30);
  const [result, setResult] = useState<LiquidationProbabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(h: number) {
    setHorizon(h);
    setLoading(true);
    setError(null);
    const res = await getLiquidationProbability(
      {
        collateral: portfolio.collateral,
        borrows: portfolio.borrows,
        prices: portfolio.prices as Record<string, number>,
      },
      h
    );
    setLoading(false);
    if (res.data) setResult(res.data);
    else setError(res.error ?? "Simulation failed.");
  }

  const prob = result?.probability_liquidation ?? null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-0.5">
          Liquidation Probability
        </h2>
        <p className="text-sm text-slate-500 max-w-3xl">
          A stress test answers "what if BTC drops 30%?". This answers a harder
          question: <span className="text-slate-300">how likely is liquidation
          at all?</span> The engine resamples ~300 days of actual joint daily
          returns (bootstrap) and walks your position through 5,000 simulated
          price paths.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 uppercase tracking-wider mr-2">
          Horizon
        </span>
        {HORIZONS.map((h) => (
          <button
            key={h}
            onClick={() => run(h)}
            disabled={loading}
            className={`px-3 py-2 rounded text-sm border transition-colors disabled:opacity-50
              ${horizon === h && result
                ? "bg-slate-700/80 text-slate-100 border-slate-500 font-medium"
                : "bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-slate-200"
              }`}
          >
            {h} days
          </button>
        ))}
        {!result && !loading && (
          <span className="text-xs text-slate-600 ml-2">
            Pick a horizon to run the simulation.
          </span>
        )}
        {loading && <span className="text-xs text-slate-500 ml-2">Simulating 5,000 paths…</span>}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && !loading && (
        <>
          {/* Headline probability */}
          <div
            className={`border rounded-lg p-6 ${
              prob !== null && prob >= 0.25
                ? "bg-red-900/30 border-red-700/50"
                : prob !== null && prob >= 0.05
                ? "bg-amber-900/30 border-amber-700/50"
                : "bg-emerald-900/20 border-emerald-700/40"
            }`}
          >
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">
              Probability of liquidation within {result.horizon_days} days
            </div>
            <div className="text-5xl font-bold tabular-nums text-slate-100">
              {prob !== null ? (prob * 100).toFixed(1) : "—"}%
            </div>
            <p className="text-sm text-slate-400 mt-2">
              Share of {result.n_paths.toLocaleString()} simulated paths where the
              health factor closed below 1.0 on at least one day.
              {result.starting_health_factor === null &&
                " (No borrows — liquidation is impossible.)"}
            </p>
          </div>

          {/* Distribution stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat
              label="Starting HF"
              value={formatHealthFactor(result.starting_health_factor)}
              color={healthFactorColor(result.starting_health_factor)}
            />
            <Stat
              label={`HF at day ${result.horizon_days} — bad case (p5)`}
              value={formatHealthFactor(result.ending_hf_p5)}
              color={healthFactorColor(result.ending_hf_p5)}
            />
            <Stat
              label={`HF at day ${result.horizon_days} — median`}
              value={formatHealthFactor(result.ending_hf_p50)}
              color={healthFactorColor(result.ending_hf_p50)}
            />
            <Stat
              label="Collateral 95% VaR"
              value={formatPercent(result.collateral_var_95)}
              color="text-slate-200"
            />
          </div>

          <p className="text-xs text-slate-600 max-w-3xl">
            95% VaR: in 95% of simulated paths the collateral value change over
            the horizon was better than this figure. Sample:{" "}
            {result.sample_size} most recent daily returns (Coinbase BTC/ETH,
            OKX USDC), resampled jointly to preserve cross-asset correlation.
          </p>
        </>
      )}

      {/* Model limitations — stated, not hidden */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-5">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Model limitations
        </div>
        <ul className="text-sm text-slate-400 space-y-2 max-w-3xl">
          <li>
            <span className="text-slate-300">Recent-window sample.</span>{" "}
            Bootstrap can only replay days it has seen. If the last ~300 days
            were calm, tail risk is understated — that is exactly why the
            Historical Scenarios view exists: it covers crisis weeks (2020,
            2021, 2022, 2023) that no recent sample contains.
          </li>
          <li>
            <span className="text-slate-300">Daily closes only.</span>{" "}
            Liquidations trigger on oracle prices intraday. On 12 March 2020
            BTC's intraday low was far below the close — these results are an
            optimistic bound.
          </li>
          <li>
            <span className="text-slate-300">No volatility clustering.</span>{" "}
            Days are drawn independently, but in reality turbulent days follow
            turbulent days. This also pushes the estimate toward optimism.
          </li>
          <li>
            <span className="text-slate-300">No interest accrual.</span>{" "}
            Borrow positions accrue interest on-chain, slowly eroding the
            health factor over long horizons.
          </li>
        </ul>
      </div>
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

import { useState } from "react";
import { runStressTest } from "../api/client";
import { usePortfolio } from "../context/usePortfolio";
import { StressBarChart } from "./StressBarChart";
import type { AssetSymbol, StressTestResponse } from "../types";
import {
  formatUSD,
  formatPercent,
  formatHealthFactor,
  healthFactorColor,
} from "../utils/formatting";

// All sliders share one symmetric scale so 0% sits dead centre on every row
// and equal shocks line up vertically — positions are directly comparable.
// USDC keeps a finer step for sub-percent depeg moves. Crashes beyond -50%
// live in Historical Scenarios.
const SHOCK_RANGES: Record<AssetSymbol, { min: number; max: number; step: number }> = {
  BTC: { min: -0.5, max: 0.5, step: 0.01 },
  ETH: { min: -0.5, max: 0.5, step: 0.01 },
  USDC: { min: -0.5, max: 0.5, step: 0.005 },
};

// A moderate, plausible default: BTC −8%, ETH −16% (roughly 2× beta), USDC
// unmoved. Extreme moves — including a stablecoin depeg — are available on
// the sliders and as named events in Historical Scenarios.
const DEFAULT_SHOCKS: Record<AssetSymbol, number> = {
  BTC: -0.08,
  ETH: -0.16,
  USDC: 0,
};

export function StressTest() {
  const { portfolio } = usePortfolio();
  const [shocks, setShocks] = useState<Record<string, number>>({ ...DEFAULT_SHOCKS });
  const [result, setResult] = useState<StressTestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assetsInUse = Array.from(
    new Set([
      ...portfolio.collateral.map((p) => p.asset),
      ...portfolio.borrows.map((p) => p.asset),
    ])
  ) as AssetSymbol[];

  async function handleRun() {
    setLoading(true);
    setError(null);
    const payload = {
      portfolio: {
        collateral: portfolio.collateral,
        borrows: portfolio.borrows,
        prices: portfolio.prices as Record<string, number>,
      },
      shocks,
    };
    const res = await runStressTest(payload);
    setLoading(false);
    if (res.data) {
      setResult(res.data);
    } else {
      setError(res.error ?? "Unknown error");
    }
  }

  function setShock(asset: string, value: number) {
    setShocks((prev) => ({ ...prev, [asset]: value }));
  }

  const hasPositions = portfolio.collateral.length > 0 || portfolio.borrows.length > 0;

  if (!hasPositions) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-96 gap-3 text-center">
        <div className="text-slate-400">No portfolio to stress-test.</div>
        <p className="text-sm text-slate-500">Add collateral and borrow positions in the Portfolio view first.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Simulation banner */}
      <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg px-4 py-3 flex items-center gap-3">
        <span className="text-amber-400 font-semibold text-xs uppercase tracking-wider">Simulation Mode</span>
        <span className="text-amber-300/80 text-sm">
          These shocks do not change your actual portfolio. Results are hypothetical.
        </span>
      </div>

      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-0.5">Stress Test</h2>
        <p className="text-sm text-slate-500">
          Apply hypothetical price shocks and observe the impact on health factor and liquidation risk.
        </p>
      </div>

      {/* Sliders */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-5 space-y-5">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Price Shocks</div>
        {assetsInUse.map((asset) => {
          const range = SHOCK_RANGES[asset] ?? { min: -0.5, max: 0.5, step: 0.01 };
          const shock = shocks[asset] ?? 0;
          const origPrice = portfolio.prices[asset] ?? 0;
          const stressedPrice = origPrice * (1 + shock);
          return (
            <ShockSlider
              key={asset}
              asset={asset}
              shock={shock}
              origPrice={origPrice}
              stressedPrice={stressedPrice}
              min={range.min}
              max={range.max}
              step={range.step}
              onChange={(v) => setShock(asset, v)}
            />
          );
        })}
      </div>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={loading}
        className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 font-medium text-sm rounded border border-slate-600 transition-colors"
      >
        {loading ? "Running…" : "Run Stress Test"}
      </button>

      {error && (
        <div className="bg-red-950/40 border border-red-800/50 rounded-lg p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && <StressTestResults result={result} />}
    </div>
  );
}

function ShockSlider({
  asset,
  shock,
  origPrice,
  stressedPrice,
  min,
  max,
  step,
  onChange,
}: {
  asset: string;
  shock: number;
  origPrice: number;
  stressedPrice: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const pct = (shock * 100).toFixed(1);
  const isNeg = shock < 0;
  // Ranges are asymmetric (e.g. -80%…+20%), so the 0% mark must sit at the
  // slider's actual zero position, not at the visual centre of the track.
  const zeroPos = ((0 - min) / (max - min)) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium text-slate-200">{asset}</span>
        <div className="flex items-baseline gap-4 text-sm tabular-nums">
          <span className={`font-semibold w-16 text-right ${isNeg ? "text-red-400" : shock > 0 ? "text-emerald-400" : "text-slate-400"}`}>
            {shock > 0 ? "+" : ""}{pct}%
          </span>
          <span className="text-slate-500 text-xs">
            ${origPrice.toLocaleString()} → <span className="text-slate-300">${stressedPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
          </span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={shock}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-slate-400 cursor-pointer"
      />
      <div className="relative h-4 text-xs text-slate-600">
        <span className="absolute left-0">{(min * 100).toFixed(0)}%</span>
        <span
          className="absolute"
          style={{ left: `${zeroPos}%`, transform: "translateX(-50%)" }}
        >
          0%
        </span>
        <span className="absolute right-0">+{(max * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

function StressTestResults({ result }: { result: StressTestResponse }) {
  const origHfColor = healthFactorColor(result.original_health_factor);
  const stressHfColor = healthFactorColor(result.stressed_health_factor);

  return (
    <div className="space-y-4">
      {/* Liquidation warning */}
      {result.liquidation_triggered && (
        <div className="bg-red-950/50 border border-red-700/60 rounded-lg px-5 py-4">
          <div className="text-red-400 font-semibold text-sm uppercase tracking-wide mb-1">
            Liquidation Triggered
          </div>
          <p className="text-red-300/90 text-sm">
            Under this scenario, the health factor falls below 1.0. The position would become
            eligible for liquidation. Increase collateral or reduce borrows to build a larger safety buffer.
          </p>
        </div>
      )}

      {/* Before / after comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CompareCard
          label="Health Factor"
          original={<span className={`tabular-nums font-bold text-xl ${origHfColor}`}>{formatHealthFactor(result.original_health_factor)}</span>}
          stressed={<span className={`tabular-nums font-bold text-xl ${stressHfColor}`}>{formatHealthFactor(result.stressed_health_factor)}</span>}
        />
        <CompareCard
          label="Collateral Value"
          original={<span className="tabular-nums text-slate-200 font-medium">{formatUSD(result.original_collateral_value)}</span>}
          stressed={<span className="tabular-nums text-slate-200 font-medium">{formatUSD(result.stressed_collateral_value)}</span>}
        />
        <DeltaCard
          label="Collateral Change"
          absChange={result.collateral_value_change_abs}
          pctChange={result.collateral_value_change_pct}
        />
      </div>

      {/* Bar chart */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-5">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Collateral Value: Original vs Stressed
        </div>
        <StressBarChart result={result} />
      </div>
    </div>
  );
}

function DeltaCard({
  label,
  absChange,
  pctChange,
}: {
  label: string;
  absChange: number;
  pctChange: number | null;
}) {
  const isNeg = absChange < 0;
  const color = isNeg ? "text-red-400" : "text-emerald-400";
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">{label}</div>
      <div className={`tabular-nums font-bold text-xl ${color}`}>
        {!isNeg ? "+" : ""}{formatUSD(absChange)}
      </div>
      {pctChange != null && (
        <div className={`text-xs tabular-nums mt-1 ${color}`}>
          {pctChange >= 0 ? "+" : ""}{formatPercent(pctChange)}
        </div>
      )}
    </div>
  );
}

function CompareCard({
  label,
  original,
  stressed,
}: {
  label: string;
  original: React.ReactNode;
  stressed: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">{label}</div>
      <div className="flex gap-4 items-start">
        <div>
          <div className="text-xs text-slate-600 mb-1">Before</div>
          {original}
        </div>
        <div className="text-slate-600 mt-4">→</div>
        <div>
          <div className="text-xs text-slate-600 mb-1">After</div>
          {stressed}
        </div>
      </div>
    </div>
  );
}

import { usePortfolio } from "../context/usePortfolio";
import { HealthFactorGauge } from "./HealthFactorGauge";
import { CollateralPieChart } from "./CollateralPieChart";
import { ASSET_CONFIG } from "../constants";
import {
  formatUSD,
  formatPercent,
  formatHealthFactor,
  healthFactorColor,
  healthFactorLabel,
} from "../utils/formatting";

interface SummaryCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

function SummaryCard({ label, value, sub, accent }: SummaryCardProps) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-semibold tabular-nums ${accent ?? "text-slate-100"}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

export function Dashboard() {
  const { riskData, isLoading, apiError, portfolio } = usePortfolio();

  const hasCollateral = portfolio.collateral.length > 0;

  if (!hasCollateral) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center gap-4">
        <div className="text-4xl text-slate-600">—</div>
        <div className="text-slate-400 font-medium">No collateral positions</div>
        <p className="text-slate-500 text-sm max-w-xs">
          Navigate to <span className="text-slate-300">Portfolio</span> to add collateral and borrow positions.
        </p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="p-6">
        <div className="bg-red-950/40 border border-red-800/50 rounded-lg p-4 text-red-300 text-sm">
          {apiError}
        </div>
      </div>
    );
  }

  const hf = riskData?.health_factor ?? null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-0.5">Dashboard</h2>
        <p className="text-sm text-slate-500">
          Real-time risk metrics for the current portfolio.
        </p>
      </div>

      {/* Gauge + summary cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Gauge */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-6 flex flex-col items-center">
          <div className={`text-xs font-semibold uppercase tracking-widest mb-4 ${healthFactorColor(hf)}`}>
            {healthFactorLabel(hf)}
          </div>
          <div className={isLoading ? "opacity-40 transition-opacity" : "transition-opacity"}>
            <HealthFactorGauge value={hf} size={280} />
          </div>
          {riskData?.liquidation_buffer != null && (
            <div className="mt-3 text-xs text-slate-500">
              Buffer to liquidation:{" "}
              <span className="text-slate-300 tabular-nums">
                {formatHealthFactor(riskData.liquidation_buffer)}
              </span>
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SummaryCard
            label="Total Collateral"
            value={formatUSD(riskData?.total_collateral_value ?? null)}
          />
          <SummaryCard
            label="Total Borrowed"
            value={formatUSD(riskData?.total_borrowed_value ?? null)}
          />
          <SummaryCard
            label="Available Borrow"
            value={formatUSD(riskData?.available_borrow ?? null)}
            sub="Remaining capacity"
          />
          <SummaryCard
            label="Current LTV"
            value={formatPercent(riskData?.ltv ?? null)}
            sub="Loan-to-value ratio"
          />
        </div>
      </div>

      {/* Collateral breakdown + pie chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Collateral Composition
          </div>
          <CollateralPieChart breakdown={riskData?.collateral_breakdown ?? []} />
        </div>

        {/* Breakdown table */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Asset Parameters
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[26rem]">
            <thead>
              <tr className="border-b border-slate-700/50">
                {["Asset", "Value", "Share", "Max LTV", "Liq. Threshold"].map((h) => (
                  <th key={h} className="text-left text-xs text-slate-500 font-medium pb-2 pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(riskData?.collateral_breakdown ?? []).map((item) => {
                const cfg = ASSET_CONFIG[item.asset as keyof typeof ASSET_CONFIG];
                return (
                  <tr key={item.asset} className="border-b border-slate-700/30">
                    <td className="py-2 pr-3 font-medium text-slate-200">{item.asset}</td>
                    <td className="py-2 pr-3 tabular-nums text-slate-300">{formatUSD(item.value_usd)}</td>
                    <td className="py-2 pr-3 tabular-nums text-slate-400">{formatPercent(item.share_of_collateral)}</td>
                    <td className="py-2 pr-3 tabular-nums text-slate-400">{formatPercent(cfg?.ltv ?? null)}</td>
                    <td className="py-2 tabular-nums text-slate-400">{formatPercent(cfg?.liquidation_threshold ?? null)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}

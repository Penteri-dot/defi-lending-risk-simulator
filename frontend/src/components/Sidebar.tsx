import type { View } from "../types";
import { usePortfolio } from "../context/usePortfolio";
import {
  formatUSD,
  formatPercent,
  formatHealthFactor,
  healthFactorColor,
  healthFactorLabel,
} from "../utils/formatting";

const NAV_ITEMS: { view: View; label: string }[] = [
  { view: "dashboard", label: "Dashboard" },
  { view: "portfolio", label: "Portfolio" },
  { view: "stresstest", label: "Stress Test" },
  { view: "scenarios", label: "Historical Scenarios" },
  { view: "probability", label: "Liquidation Probability" },
  { view: "explained", label: "Risk Explained" },
];

interface Props {
  currentView: View;
  onNavigate: (view: View) => void;
}

export function Sidebar({ currentView, onNavigate }: Props) {
  const { riskData, isLoading, apiError } = usePortfolio();

  const hf = riskData?.health_factor ?? null;
  const hfColor = healthFactorColor(hf);
  const hfLabel = healthFactorLabel(hf);

  return (
    <aside className="w-full lg:w-64 lg:min-h-screen bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-700/60 flex flex-col shrink-0">
      {/* Title */}
      <div className="px-5 py-6 border-b border-slate-700/60">
        <div className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-1">
          Risk Engine
        </div>
        <h1 className="text-sm font-semibold text-slate-200 leading-snug">
          DeFi Lending<br />Risk Simulator
        </h1>
      </div>

      {/* Health Factor */}
      <div className="px-5 py-5 border-b border-slate-700/60">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
          Health Factor
        </div>
        {apiError ? (
          <div className="text-xs text-red-400 leading-snug">{apiError}</div>
        ) : (
          <>
            <div className={`text-4xl font-bold tabular-nums tracking-tight ${hfColor} ${isLoading ? "opacity-50" : ""}`}>
              {formatHealthFactor(hf)}
            </div>
            <div className={`text-xs mt-1 font-medium ${hfColor}`}>
              {hfLabel}
            </div>
          </>
        )}
      </div>

      {/* Summary stats */}
      <div className="px-5 py-4 border-b border-slate-700/60 space-y-2">
        <StatRow label="Collateral" value={formatUSD(riskData?.total_collateral_value ?? null)} />
        <StatRow label="Borrowed" value={formatUSD(riskData?.total_borrowed_value ?? null)} />
        <StatRow label="LTV" value={formatPercent(riskData?.ltv ?? null)} />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        {NAV_ITEMS.map(({ view, label }) => (
          <button
            key={view}
            onClick={() => onNavigate(view)}
            className={`w-full text-left px-3 py-2 rounded text-sm mb-1 transition-colors
              ${currentView === view
                ? "bg-slate-700/80 text-slate-100 font-medium"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700/60">
        <div className="text-xs text-slate-600">Portfolio project · Not production</div>
      </div>
    </aside>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-medium text-slate-300 tabular-nums">{value}</span>
    </div>
  );
}

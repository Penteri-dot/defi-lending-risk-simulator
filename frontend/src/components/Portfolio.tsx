import { useState } from "react";
import { usePortfolio } from "../context/PortfolioContext";
import { getMarketPrices } from "../api/client";
import {
  ASSET_CONFIG,
  DEFAULT_PRICES,
  PARAMETER_SNAPSHOT,
  SUPPORTED_ASSETS,
} from "../constants";
import type { AssetSymbol, Position } from "../types";
import { formatUSD, formatPercent } from "../utils/formatting";

function AddPositionForm({
  onAdd,
  label,
}: {
  onAdd: (pos: Position) => void;
  label: string;
}) {
  const [asset, setAsset] = useState<AssetSymbol>("BTC");
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setErr("Enter a positive amount.");
      return;
    }
    onAdd({ asset, amount: parsed });
    setAmount("");
    setErr("");
  }

  return (
    <form onSubmit={submit} className="flex gap-2 items-end mt-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">Asset</label>
        <select
          value={asset}
          onChange={(e) => setAsset(e.target.value as AssetSymbol)}
          className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-slate-400"
        >
          {SUPPORTED_ASSETS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1 flex-1">
        <label className="text-xs text-slate-500">Amount</label>
        <input
          type="number"
          step="any"
          min="0"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setErr(""); }}
          placeholder="0.00"
          className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-slate-400 tabular-nums w-full"
        />
      </div>
      <button
        type="submit"
        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded border border-slate-600 transition-colors whitespace-nowrap"
      >
        + Add {label}
      </button>
      {err && <p className="text-red-400 text-xs">{err}</p>}
    </form>
  );
}

export function Portfolio() {
  const {
    portfolio,
    addCollateral,
    removeCollateral,
    addBorrow,
    removeBorrow,
    updatePrice,
    setPrices,
    resetPortfolio,
  } = usePortfolio();

  const [showResetModal, setShowResetModal] = useState(false);
  const [liveStatus, setLiveStatus] = useState<
    { kind: "idle" } | { kind: "loading" } | { kind: "ok"; asOf: string } | { kind: "error"; message: string }
  >({ kind: "idle" });
  const { collateral, borrows, prices } = portfolio;

  function handleResetConfirm() {
    resetPortfolio();
    setShowResetModal(false);
  }

  async function handleUseLivePrices() {
    setLiveStatus({ kind: "loading" });
    const result = await getMarketPrices();
    if (result.data) {
      setPrices(result.data.prices as Record<AssetSymbol, number>);
      setLiveStatus({ kind: "ok", asOf: result.data.as_of });
    } else {
      setLiveStatus({
        kind: "error",
        message: result.error ?? "Could not fetch live prices.",
      });
    }
  }

  return (
    <div className="p-6 space-y-6">
      {showResetModal && (
        <ConfirmResetModal
          onConfirm={handleResetConfirm}
          onCancel={() => setShowResetModal(false)}
        />
      )}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-200 mb-0.5">Portfolio</h2>
          <p className="text-sm text-slate-500">
            Manage collateral and borrow positions. Changes update risk metrics immediately.
          </p>
        </div>
        <button
          onClick={() => setShowResetModal(true)}
          className="shrink-0 ml-4 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 rounded transition-colors"
        >
          Reset to demo
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Collateral panel */}
        <Panel title="Collateral">
          {collateral.length === 0 ? (
            <EmptyRow>No collateral — add a position below.</EmptyRow>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {["Asset", "Amount", "Value (USD)", "Max LTV", "Liq. Thr.", ""].map((h) => (
                    <th key={h} className="text-left text-xs text-slate-500 font-medium pb-2 pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {collateral.map((pos, i) => {
                  const val = pos.amount * (prices[pos.asset] ?? 0);
                  const cfg = ASSET_CONFIG[pos.asset];
                  return (
                    <tr key={i} className="border-b border-slate-700/20 group">
                      <td className="py-2 pr-3 font-medium text-slate-200">{pos.asset}</td>
                      <td className="py-2 pr-3 tabular-nums text-slate-300">{pos.amount}</td>
                      <td className="py-2 pr-3 tabular-nums text-slate-300">{formatUSD(val)}</td>
                      <td className="py-2 pr-3 tabular-nums text-slate-400">{formatPercent(cfg.ltv)}</td>
                      <td className="py-2 pr-3 tabular-nums text-slate-400">{formatPercent(cfg.liquidation_threshold)}</td>
                      <td className="py-2">
                        <button
                          onClick={() => removeCollateral(i)}
                          className="text-slate-600 hover:text-red-400 text-xs transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <AddPositionForm onAdd={addCollateral} label="Collateral" />
        </Panel>

        {/* Borrows panel */}
        <Panel title="Borrows">
          {borrows.length === 0 ? (
            <EmptyRow>No borrow positions.</EmptyRow>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {["Asset", "Amount", "Value (USD)", ""].map((h) => (
                    <th key={h} className="text-left text-xs text-slate-500 font-medium pb-2 pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {borrows.map((pos, i) => {
                  const val = pos.amount * (prices[pos.asset] ?? 0);
                  return (
                    <tr key={i} className="border-b border-slate-700/20 group">
                      <td className="py-2 pr-3 font-medium text-slate-200">{pos.asset}</td>
                      <td className="py-2 pr-3 tabular-nums text-slate-300">{pos.amount.toLocaleString()}</td>
                      <td className="py-2 pr-3 tabular-nums text-slate-300">{formatUSD(val)}</td>
                      <td className="py-2">
                        <button
                          onClick={() => removeBorrow(i)}
                          className="text-slate-600 hover:text-red-400 text-xs transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <AddPositionForm onAdd={addBorrow} label="Borrow" />
        </Panel>
      </div>

      {/* Market prices */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Market Prices (USD)
          </div>
          <button
            onClick={handleUseLivePrices}
            disabled={liveStatus.kind === "loading"}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-slate-100 bg-slate-700/60 hover:bg-slate-600/60 border border-slate-600/60 rounded transition-colors disabled:opacity-50"
          >
            {liveStatus.kind === "loading" ? "Fetching…" : "Use live prices"}
          </button>
        </div>
        <div className="flex flex-wrap gap-4">
          {SUPPORTED_ASSETS.map((asset) => (
            <PriceInput
              key={asset}
              asset={asset}
              value={prices[asset] ?? DEFAULT_PRICES[asset]}
              onChange={(v) => updatePrice(asset, v)}
            />
          ))}
        </div>
        {liveStatus.kind === "ok" && (
          <p className="text-xs text-emerald-500/80 mt-3">
            Live prices applied (Coinbase BTC/ETH, OKX USDC) ·{" "}
            {new Date(liveStatus.asOf).toLocaleTimeString()}
          </p>
        )}
        {liveStatus.kind === "error" && (
          <p className="text-xs text-red-400 mt-3">{liveStatus.message}</p>
        )}
        <p className="text-xs text-slate-600 mt-3">
          Adjust prices manually or pull live spot prices. Changes are reflected immediately.
        </p>
      </div>

      {/* Parameter provenance */}
      <p className="text-xs text-slate-600">
        Risk parameters (Max LTV, liquidation threshold) mirror the{" "}
        {PARAMETER_SNAPSHOT.market} market (BTC→WBTC, ETH→WETH), verified{" "}
        {PARAMETER_SNAPSHOT.verified} against Aave governance sources. On-chain
        parameters change via governance — check the live protocol before
        relying on them.
      </p>
    </div>
  );
}

function ConfirmResetModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">Reset to demo portfolio?</h3>
        <p className="text-sm text-slate-400 mb-5">
          This will discard your current positions and prices and restore the default demo values.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm text-slate-400 hover:text-slate-200 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 text-sm text-slate-200 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-5">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{title}</div>
      {children}
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500 py-2">{children}</p>;
}

function PriceInput({
  asset,
  value,
  onChange,
}: {
  asset: AssetSymbol;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-500 font-medium">{asset}</label>
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate-500">$</span>
        <input
          type="number"
          step="any"
          min="0"
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v >= 0) onChange(v);
          }}
          className="bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm tabular-nums text-slate-200 focus:outline-none focus:border-slate-400 w-32"
        />
      </div>
    </div>
  );
}


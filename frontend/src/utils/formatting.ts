export function formatUSD(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "—";
  return (value * 100).toFixed(2) + "%";
}

export function formatHealthFactor(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toFixed(2);
}

export function formatNumber(value: number, decimals = 4): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function healthFactorColor(value: number | null): string {
  if (value == null) return "text-slate-400";
  if (value >= 2.0) return "text-emerald-400";
  if (value >= 1.5) return "text-amber-400";
  if (value >= 1.2) return "text-amber-400";
  if (value >= 1.0) return "text-orange-400";
  return "text-red-400";
}

export function healthFactorBgColor(value: number | null): string {
  if (value == null) return "bg-slate-700";
  if (value >= 2.0) return "bg-emerald-900/40 border-emerald-700/50";
  if (value >= 1.0) return "bg-amber-900/40 border-amber-700/50";
  return "bg-red-900/40 border-red-700/50";
}

export function healthFactorLabel(value: number | null): string {
  if (value == null) return "No borrowing";
  if (value >= 2.0) return "Safe";
  if (value >= 1.5) return "Healthy";
  if (value >= 1.2) return "Monitor position";
  if (value >= 1.0) return "At risk";
  return "Liquidatable";
}

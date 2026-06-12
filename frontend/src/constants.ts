import type { AssetSymbol } from "./types";

export interface AssetConfig {
  ltv: number;
  liquidation_threshold: number;
  label: string;
  aaveReserve: string;
}

// Risk parameters mirror the Aave V3 Ethereum Core market (dated snapshot —
// see PARAMETER_SNAPSHOT). Must stay in sync with backend/core/config.py.
export const ASSET_CONFIG: Record<AssetSymbol, AssetConfig> = {
  BTC: { ltv: 0.70, liquidation_threshold: 0.77, label: "Bitcoin", aaveReserve: "WBTC" },
  ETH: { ltv: 0.805, liquidation_threshold: 0.83, label: "Ethereum", aaveReserve: "WETH" },
  USDC: { ltv: 0.75, liquidation_threshold: 0.78, label: "USD Coin", aaveReserve: "USDC" },
};

export const PARAMETER_SNAPSHOT = {
  market: "Aave V3 Ethereum Core",
  verified: "2026-06-11",
  source: "https://governance.aave.com",
};

export const SUPPORTED_ASSETS: AssetSymbol[] = ["BTC", "ETH", "USDC"];

export const DEFAULT_PRICES: Record<AssetSymbol, number> = {
  BTC: 100000,
  ETH: 4000,
  USDC: 1,
};

export const HEALTH_FACTOR_THRESHOLDS = {
  safe: 2.0,
  warning: 1.0,
} as const;

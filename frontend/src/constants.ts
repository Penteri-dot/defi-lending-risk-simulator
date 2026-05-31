import type { AssetSymbol } from "./types";

export interface AssetConfig {
  ltv: number;
  liquidation_threshold: number;
  label: string;
}

export const ASSET_CONFIG: Record<AssetSymbol, AssetConfig> = {
  BTC: { ltv: 0.70, liquidation_threshold: 0.75, label: "Bitcoin" },
  ETH: { ltv: 0.80, liquidation_threshold: 0.825, label: "Ethereum" },
  USDC: { ltv: 0.85, liquidation_threshold: 0.875, label: "USD Coin" },
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

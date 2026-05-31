export type AssetSymbol = "BTC" | "ETH" | "USDC";

export interface Position {
  asset: AssetSymbol;
  amount: number;
}

export interface PortfolioPayload {
  collateral: Position[];
  borrows: Position[];
  prices: Record<string, number>;
}

export interface CollateralBreakdownItem {
  asset: string;
  amount: number;
  value_usd: number;
  share_of_collateral: number;
}

export interface RiskCalculationResponse {
  total_collateral_value: number;
  total_borrowed_value: number;
  ltv: number | null;
  health_factor: number | null;
  max_borrow: number;
  available_borrow: number;
  is_liquidatable: boolean;
  liquidation_buffer: number | null;
  collateral_breakdown: CollateralBreakdownItem[];
}

export interface StressTestPayload {
  portfolio: PortfolioPayload;
  shocks: Record<string, number>;
}

export interface StressTestResponse {
  original_health_factor: number | null;
  stressed_health_factor: number | null;
  original_collateral_value: number;
  stressed_collateral_value: number;
  collateral_value_change_abs: number;
  collateral_value_change_pct: number | null;
  original_is_liquidatable: boolean;
  stressed_is_liquidatable: boolean;
  liquidation_triggered: boolean;
  applied_shocks: Record<string, number>;
}

export interface ApiError {
  error: string;
  code: string;
}

export type View = "dashboard" | "portfolio" | "stresstest" | "explained";

export interface Portfolio {
  collateral: Position[];
  borrows: Position[];
  prices: Record<AssetSymbol, number>;
}

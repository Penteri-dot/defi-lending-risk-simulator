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

// ── V2 types ──────────────────────────────────────────────────────────────────

export interface MarketPricesResponse {
  prices: Record<string, number>;
  as_of: string;
  sources: Record<string, string>;
}

export interface ScenarioInfo {
  id: string;
  name: string;
  window: string;
  description: string;
}

export interface ScenarioDay {
  date: string;
  prices: Record<string, number>;
  health_factor: number | null;
  total_collateral_value: number;
  total_borrowed_value: number;
  is_liquidatable: boolean;
}

export interface ScenarioSummary {
  starting_health_factor: number | null;
  ending_health_factor: number | null;
  min_health_factor: number | null;
  min_health_factor_date: string | null;
  first_liquidation_date: string | null;
  was_liquidated: boolean;
  max_collateral_drawdown: number;
}

export interface ScenarioReplayResponse {
  scenario_id: string;
  days: ScenarioDay[];
  summary: ScenarioSummary;
}

export interface LiquidationProbabilityResponse {
  starting_health_factor: number | null;
  probability_liquidation: number;
  probability_liquidation_at_horizon: number;
  ending_hf_p5: number | null;
  ending_hf_p50: number | null;
  ending_hf_p95: number | null;
  collateral_var_95: number;
  horizon_days: number;
  n_paths: number;
  sample_size: number;
}

export type View =
  | "dashboard"
  | "portfolio"
  | "stresstest"
  | "scenarios"
  | "probability"
  | "explained";

export interface Portfolio {
  collateral: Position[];
  borrows: Position[];
  prices: Record<AssetSymbol, number>;
}

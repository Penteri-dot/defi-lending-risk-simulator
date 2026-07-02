import { createContext, useContext } from "react";
import type {
  AssetSymbol,
  Portfolio,
  Position,
  RiskCalculationResponse,
} from "../types";

// ── Context types ─────────────────────────────────────────────────────────────

export interface PortfolioContextValue {
  portfolio: Portfolio;
  riskData: RiskCalculationResponse | null;
  isLoading: boolean;
  apiError: string | null;

  addCollateral: (pos: Position) => void;
  removeCollateral: (index: number) => void;
  addBorrow: (pos: Position) => void;
  removeBorrow: (index: number) => void;
  updatePrice: (asset: AssetSymbol, price: number) => void;
  setPrices: (prices: Record<AssetSymbol, number>) => void;
  resetPortfolio: () => void;
}

export const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used inside PortfolioProvider");
  return ctx;
}

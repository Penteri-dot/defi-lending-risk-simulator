import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { calculateRisk } from "../api/client";
import { DEFAULT_PRICES } from "../constants";
import type {
  AssetSymbol,
  Portfolio,
  Position,
  RiskCalculationResponse,
} from "../types";

// ── Default demo portfolio ────────────────────────────────────────────────────

const DEFAULT_PORTFOLIO: Portfolio = {
  collateral: [
    { asset: "BTC", amount: 0.5 },
    { asset: "ETH", amount: 10 },
  ],
  borrows: [{ asset: "USDC", amount: 50000 }],
  prices: { ...DEFAULT_PRICES },
};

const STORAGE_KEY = "defi-risk-portfolio";

function loadFromStorage(): Portfolio {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Portfolio;
  } catch {
    // corrupt storage — fall through to default
  }
  return DEFAULT_PORTFOLIO;
}

function saveToStorage(p: Portfolio) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // storage unavailable — ignore
  }
}

// ── Context types ─────────────────────────────────────────────────────────────

interface PortfolioContextValue {
  portfolio: Portfolio;
  riskData: RiskCalculationResponse | null;
  isLoading: boolean;
  apiError: string | null;

  addCollateral: (pos: Position) => void;
  removeCollateral: (index: number) => void;
  addBorrow: (pos: Position) => void;
  removeBorrow: (index: number) => void;
  updatePrice: (asset: AssetSymbol, price: number) => void;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used inside PortfolioProvider");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [portfolio, setPortfolio] = useState<Portfolio>(loadFromStorage);
  const [riskData, setRiskData] = useState<RiskCalculationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recalculate = useCallback((p: Portfolio) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setApiError(null);
      const payload = {
        collateral: p.collateral,
        borrows: p.borrows,
        prices: p.prices as Record<string, number>,
      };
      const result = await calculateRisk(payload);
      setIsLoading(false);
      if (result.data) {
        setRiskData(result.data);
        setApiError(null);
      } else {
        setApiError(result.error ?? "Unknown error");
      }
    }, 150);
  }, []);

  // Recalculate whenever portfolio changes
  useEffect(() => {
    saveToStorage(portfolio);
    recalculate(portfolio);
  }, [portfolio, recalculate]);

  const addCollateral = useCallback((pos: Position) => {
    setPortfolio((prev) => ({
      ...prev,
      collateral: [...prev.collateral, pos],
    }));
  }, []);

  const removeCollateral = useCallback((index: number) => {
    setPortfolio((prev) => ({
      ...prev,
      collateral: prev.collateral.filter((_, i) => i !== index),
    }));
  }, []);

  const addBorrow = useCallback((pos: Position) => {
    setPortfolio((prev) => ({
      ...prev,
      borrows: [...prev.borrows, pos],
    }));
  }, []);

  const removeBorrow = useCallback((index: number) => {
    setPortfolio((prev) => ({
      ...prev,
      borrows: prev.borrows.filter((_, i) => i !== index),
    }));
  }, []);

  const updatePrice = useCallback((asset: AssetSymbol, price: number) => {
    setPortfolio((prev) => ({
      ...prev,
      prices: { ...prev.prices, [asset]: price },
    }));
  }, []);

  return (
    <PortfolioContext.Provider
      value={{
        portfolio,
        riskData,
        isLoading,
        apiError,
        addCollateral,
        removeCollateral,
        addBorrow,
        removeBorrow,
        updatePrice,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

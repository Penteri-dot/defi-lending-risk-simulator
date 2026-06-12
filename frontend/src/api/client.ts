import axios from "axios";
import type {
  LiquidationProbabilityResponse,
  MarketPricesResponse,
  PortfolioPayload,
  RiskCalculationResponse,
  ScenarioInfo,
  ScenarioReplayResponse,
  StressTestPayload,
  StressTestResponse,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const http = axios.create({ baseURL: BASE_URL, timeout: 10000 });

export interface ApiCallResult<T> {
  data?: T;
  error?: string;
  code?: string;
}

export async function calculateRisk(
  payload: PortfolioPayload
): Promise<ApiCallResult<RiskCalculationResponse>> {
  try {
    const res = await http.post<RiskCalculationResponse>(
      "/risk/calculate",
      payload
    );
    return { data: res.data };
  } catch (err) {
    return extractError(err);
  }
}

export async function runStressTest(
  payload: StressTestPayload
): Promise<ApiCallResult<StressTestResponse>> {
  try {
    const res = await http.post<StressTestResponse>("/risk/stress-test", payload);
    return { data: res.data };
  } catch (err) {
    return extractError(err);
  }
}

export async function getMarketPrices(): Promise<ApiCallResult<MarketPricesResponse>> {
  try {
    const res = await http.get<MarketPricesResponse>("/market/prices");
    return { data: res.data };
  } catch (err) {
    return extractError(err);
  }
}

export async function listScenarios(): Promise<ApiCallResult<{ scenarios: ScenarioInfo[] }>> {
  try {
    const res = await http.get<{ scenarios: ScenarioInfo[] }>("/scenarios");
    return { data: res.data };
  } catch (err) {
    return extractError(err);
  }
}

export async function replayScenario(
  scenarioId: string,
  payload: PortfolioPayload
): Promise<ApiCallResult<ScenarioReplayResponse>> {
  try {
    const res = await http.post<ScenarioReplayResponse>(
      `/scenarios/${scenarioId}/replay`,
      payload
    );
    return { data: res.data };
  } catch (err) {
    return extractError(err);
  }
}

export async function getLiquidationProbability(
  payload: PortfolioPayload,
  horizonDays: number
): Promise<ApiCallResult<LiquidationProbabilityResponse>> {
  try {
    const res = await http.post<LiquidationProbabilityResponse>(
      "/risk/liquidation-probability",
      { portfolio: payload, horizon_days: horizonDays },
      { timeout: 30000 }
    );
    return { data: res.data };
  } catch (err) {
    return extractError(err);
  }
}

function extractError(err: unknown): ApiCallResult<never> {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return {
        error:
          "Cannot reach the risk engine — is the backend running on port 8000?",
        code: "NETWORK_ERROR",
      };
    }
    const body = err.response.data as { error?: string; code?: string } | undefined;
    return {
      error: body?.error ?? `HTTP ${err.response.status}`,
      code: body?.code ?? "API_ERROR",
    };
  }
  return { error: "An unexpected error occurred.", code: "UNKNOWN_ERROR" };
}

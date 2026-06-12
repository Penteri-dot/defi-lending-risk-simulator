"""
Pydantic v2 request and response schemas for the DeFi Lending Risk Simulator API.
"""

from pydantic import BaseModel, Field


class CollateralPosition(BaseModel):
    asset: str
    amount: float


class BorrowPosition(BaseModel):
    asset: str
    amount: float


class PortfolioRequest(BaseModel):
    collateral: list[CollateralPosition] = Field(max_length=50)
    borrows: list[BorrowPosition] = Field(max_length=50)
    prices: dict[str, float] = Field(max_length=50)


class StressTestRequest(BaseModel):
    portfolio: PortfolioRequest
    shocks: dict[str, float] = Field(max_length=50)


# ── Response schemas ──────────────────────────────────────────────────────────

class CollateralBreakdownItem(BaseModel):
    asset: str
    amount: float
    value_usd: float
    share_of_collateral: float


class RiskCalculationResponse(BaseModel):
    total_collateral_value: float
    total_borrowed_value: float
    ltv: float | None
    health_factor: float | None
    max_borrow: float
    available_borrow: float
    is_liquidatable: bool
    liquidation_buffer: float | None
    collateral_breakdown: list[CollateralBreakdownItem]


class StressTestResponse(BaseModel):
    original_health_factor: float | None
    stressed_health_factor: float | None
    original_collateral_value: float
    stressed_collateral_value: float
    collateral_value_change_abs: float
    collateral_value_change_pct: float | None
    original_is_liquidatable: bool
    stressed_is_liquidatable: bool
    liquidation_triggered: bool
    applied_shocks: dict[str, float]


class ErrorResponse(BaseModel):
    error: str
    code: str


# ── V2: market data ───────────────────────────────────────────────────────────

class MarketPricesResponse(BaseModel):
    prices: dict[str, float]
    as_of: str
    sources: dict[str, str]


# ── V2: scenario replay ───────────────────────────────────────────────────────

class ScenarioInfo(BaseModel):
    id: str
    name: str
    window: str
    description: str


class ScenarioListResponse(BaseModel):
    scenarios: list[ScenarioInfo]


class ScenarioDay(BaseModel):
    date: str
    prices: dict[str, float]
    health_factor: float | None
    total_collateral_value: float
    total_borrowed_value: float
    is_liquidatable: bool


class ScenarioSummary(BaseModel):
    starting_health_factor: float | None
    ending_health_factor: float | None
    min_health_factor: float | None
    min_health_factor_date: str | None
    first_liquidation_date: str | None
    was_liquidated: bool
    max_collateral_drawdown: float


class ScenarioReplayResponse(BaseModel):
    scenario_id: str
    days: list[ScenarioDay]
    summary: ScenarioSummary


# ── V2: liquidation probability ───────────────────────────────────────────────

class LiquidationProbabilityRequest(BaseModel):
    portfolio: PortfolioRequest
    horizon_days: int = Field(default=30, ge=1, le=365)
    n_paths: int = Field(default=5000, ge=100, le=20000)


class LiquidationProbabilityResponse(BaseModel):
    starting_health_factor: float | None
    probability_liquidation: float
    probability_liquidation_at_horizon: float
    ending_hf_p5: float | None
    ending_hf_p50: float | None
    ending_hf_p95: float | None
    collateral_var_95: float
    horizon_days: int
    n_paths: int
    sample_size: int

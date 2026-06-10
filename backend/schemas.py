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

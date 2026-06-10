"""
API route definitions for the DeFi Lending Risk Simulator.

Two risk endpoints:
  POST /risk/calculate   — compute risk metrics for a portfolio
  POST /risk/stress-test — apply price shocks and compare metrics

Plus a health check endpoint.
"""

from fastapi import APIRouter

from backend.core.config import is_supported
from backend.core.risk_engine import calculate_risk, run_stress_test
from backend.exceptions import RiskEngineError
from backend.schemas import (
    PortfolioRequest,
    RiskCalculationResponse,
    StressTestRequest,
    StressTestResponse,
)

router = APIRouter()


def _validate_portfolio(portfolio: PortfolioRequest) -> None:
    """
    Run all structural validations on a portfolio request.

    Raises RiskEngineError with an appropriate code on the first problem found.
    """
    all_assets = (
        [p.asset for p in portfolio.collateral]
        + [p.asset for p in portfolio.borrows]
    )

    # Unknown assets
    for asset in all_assets:
        if not is_supported(asset):
            raise RiskEngineError(
                f"Asset '{asset}' is not supported.",
                code="UNKNOWN_ASSET",
            )

    # Negative amounts
    for pos in portfolio.collateral:
        if pos.amount < 0:
            raise RiskEngineError(
                f"Collateral amount for '{pos.asset}' must not be negative.",
                code="INVALID_AMOUNT",
            )
    for pos in portfolio.borrows:
        if pos.amount < 0:
            raise RiskEngineError(
                f"Borrow amount for '{pos.asset}' must not be negative.",
                code="INVALID_AMOUNT",
            )

    # Missing prices
    for asset in all_assets:
        if asset not in portfolio.prices:
            raise RiskEngineError(
                f"Price missing for asset '{asset}'.",
                code="MISSING_PRICE",
            )

    # Non-positive prices
    for asset, price in portfolio.prices.items():
        if price <= 0:
            raise RiskEngineError(
                f"Price for '{asset}' must be positive.",
                code="INVALID_PRICE",
            )

    # Borrows without any collateral
    if portfolio.borrows and not portfolio.collateral:
        raise RiskEngineError(
            "Cannot have borrows without collateral.",
            code="NO_COLLATERAL",
        )


def _portfolio_to_dicts(portfolio: PortfolioRequest) -> tuple[list[dict], list[dict], dict]:
    """Convert Pydantic models to plain dicts for the pure calculation functions."""
    collateral = [{"asset": p.asset, "amount": p.amount} for p in portfolio.collateral]
    borrows = [{"asset": p.asset, "amount": p.amount} for p in portfolio.borrows]
    prices = dict(portfolio.prices)
    return collateral, borrows, prices


@router.get("/health")
def health_check() -> dict:
    """Deployment health check."""
    return {"status": "ok"}


@router.post("/risk/calculate", response_model=RiskCalculationResponse)
def calculate(portfolio: PortfolioRequest) -> RiskCalculationResponse:
    """
    Calculate risk metrics for a given portfolio and price set.

    Returns LTV, health factor, max borrow, liquidation status, and a
    per-asset collateral breakdown.
    """
    _validate_portfolio(portfolio)
    collateral, borrows, prices = _portfolio_to_dicts(portfolio)
    result = calculate_risk(collateral, borrows, prices)
    return RiskCalculationResponse(**result)


@router.post("/risk/stress-test", response_model=StressTestResponse)
def stress_test(request: StressTestRequest) -> StressTestResponse:
    """
    Apply price shocks to a portfolio and return a comparison of risk metrics.

    Shocks are fractional: -0.3 means a 30% price drop. Assets not mentioned
    in the shocks dict keep their original prices. The original portfolio is
    never mutated.
    """
    # Validate shocks before portfolio — fail fast on obviously bad input
    for asset, shock in request.shocks.items():
        if shock < -1.0:
            raise RiskEngineError(
                f"Shock for '{asset}' cannot be less than -1.0 (a 100% drop).",
                code="INVALID_SHOCK",
            )

    _validate_portfolio(request.portfolio)
    collateral, borrows, prices = _portfolio_to_dicts(request.portfolio)
    result = run_stress_test(collateral, borrows, prices, dict(request.shocks))
    return StressTestResponse(**result)

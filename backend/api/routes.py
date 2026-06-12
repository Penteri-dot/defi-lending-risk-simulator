"""
API route definitions for the DeFi Lending Risk Simulator.

Risk endpoints:
  POST /risk/calculate                — compute risk metrics for a portfolio
  POST /risk/stress-test              — apply price shocks and compare metrics
  POST /risk/liquidation-probability  — bootstrap Monte Carlo over a horizon

Market data and scenarios:
  GET  /market/prices                 — live spot prices (cached upstream fetch)
  GET  /scenarios                     — list historical scenarios
  POST /scenarios/{scenario_id}/replay — replay a portfolio through a scenario

Plus a health check endpoint.
"""

from fastapi import APIRouter

from backend.core.config import ASSET_CONFIG, PARAMETER_SNAPSHOT, is_supported
from backend.core.monte_carlo import simulate_liquidation_probability
from backend.core.risk_engine import calculate_risk, run_stress_test
from backend.core.scenarios import SCENARIOS, replay_scenario
from backend.exceptions import RiskEngineError
from backend.schemas import (
    LiquidationProbabilityRequest,
    LiquidationProbabilityResponse,
    MarketPricesResponse,
    PortfolioRequest,
    RiskCalculationResponse,
    ScenarioInfo,
    ScenarioListResponse,
    ScenarioReplayResponse,
    StressTestRequest,
    StressTestResponse,
)
from backend.services import market_data

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


# ── V2 endpoints ──────────────────────────────────────────────────────────────


@router.get("/market/prices", response_model=MarketPricesResponse)
def market_prices() -> MarketPricesResponse:
    """
    Live spot prices for all supported assets.

    Fetched from public exchange APIs (Coinbase, OKX) with a short
    server-side cache. No API keys involved.
    """
    return MarketPricesResponse(**market_data.fetch_spot_prices())


@router.get("/parameters")
def parameters() -> dict:
    """Risk parameter snapshot and its provenance."""
    return {
        "assets": {
            symbol: {
                "ltv": cfg.ltv,
                "liquidation_threshold": cfg.liquidation_threshold,
                "aave_reserve": cfg.aave_reserve,
            }
            for symbol, cfg in ASSET_CONFIG.items()
        },
        "snapshot": PARAMETER_SNAPSHOT,
    }


@router.get("/scenarios", response_model=ScenarioListResponse)
def list_scenarios() -> ScenarioListResponse:
    """List the available historical scenarios."""
    return ScenarioListResponse(
        scenarios=[
            ScenarioInfo(id=m.id, name=m.name, window=m.window, description=m.description)
            for m in SCENARIOS.values()
        ]
    )


@router.post("/scenarios/{scenario_id}/replay", response_model=ScenarioReplayResponse)
def replay(scenario_id: str, portfolio: PortfolioRequest) -> ScenarioReplayResponse:
    """
    Replay the portfolio's risk structure through a historical price path.

    The position is value-normalised to the scenario's first day (preserving
    collateral mix, leverage and health factor) and then held constant while
    prices follow the actual daily closes of the chosen scenario.
    """
    if scenario_id not in SCENARIOS:
        raise RiskEngineError(
            f"Unknown scenario '{scenario_id}'.",
            code="UNKNOWN_SCENARIO",
        )
    _validate_portfolio(portfolio)
    collateral, borrows, prices = _portfolio_to_dicts(portfolio)
    result = replay_scenario(collateral, borrows, prices, scenario_id)
    return ScenarioReplayResponse(**result)


@router.post("/risk/liquidation-probability", response_model=LiquidationProbabilityResponse)
def liquidation_probability(
    request: LiquidationProbabilityRequest,
) -> LiquidationProbabilityResponse:
    """
    Estimate liquidation probability over a horizon via historical bootstrap.

    Resamples ~300 days of actual joint daily returns (fetched from public
    exchange APIs, cached server-side) and walks the portfolio through
    thousands of simulated price paths.
    """
    _validate_portfolio(request.portfolio)
    collateral, borrows, prices = _portfolio_to_dicts(request.portfolio)
    sample = market_data.fetch_daily_returns_sample()
    result = simulate_liquidation_probability(
        collateral,
        borrows,
        prices,
        returns_sample=sample,
        horizon_days=request.horizon_days,
        n_paths=request.n_paths,
    )
    return LiquidationProbabilityResponse(**result)

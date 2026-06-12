"""Tests for the bootstrap liquidation-probability simulation (core/monte_carlo.py)."""

import pytest

from backend.core.monte_carlo import simulate_liquidation_probability

COLLATERAL = [
    {"asset": "BTC", "amount": 0.5},
    {"asset": "ETH", "amount": 10},
]
BORROWS = [{"asset": "USDC", "amount": 50_000}]
PRICES = {"BTC": 100_000, "ETH": 4_000, "USDC": 1}

FLAT_SAMPLE = [{"BTC": 0.0, "ETH": 0.0, "USDC": 0.0}] * 50
CRASH_SAMPLE = [{"BTC": -0.20, "ETH": -0.20, "USDC": 0.0}] * 50


def test_deterministic_given_seed():
    a = simulate_liquidation_probability(
        COLLATERAL, BORROWS, PRICES, CRASH_SAMPLE, horizon_days=5, n_paths=200, seed=7
    )
    b = simulate_liquidation_probability(
        COLLATERAL, BORROWS, PRICES, CRASH_SAMPLE, horizon_days=5, n_paths=200, seed=7
    )
    assert a == b


def test_no_borrows_probability_zero():
    result = simulate_liquidation_probability(
        COLLATERAL, [], PRICES, FLAT_SAMPLE, horizon_days=10, n_paths=100
    )
    assert result["starting_health_factor"] is None
    assert result["probability_liquidation"] == 0.0


def test_flat_market_safe_position_never_liquidates():
    result = simulate_liquidation_probability(
        COLLATERAL, BORROWS, PRICES, FLAT_SAMPLE, horizon_days=30, n_paths=100
    )
    assert result["starting_health_factor"] == pytest.approx(1.434)
    assert result["probability_liquidation"] == 0.0
    # With zero volatility the ending HF equals the starting HF on every path
    assert result["ending_hf_p5"] == pytest.approx(1.434)
    assert result["ending_hf_p95"] == pytest.approx(1.434)
    assert result["collateral_var_95"] == pytest.approx(0.0)


def test_crash_market_always_liquidates():
    # BTC/ETH −20% every day: HF 1.434 breaches 1.0 by day 2 on every path
    result = simulate_liquidation_probability(
        COLLATERAL, BORROWS, PRICES, CRASH_SAMPLE, horizon_days=5, n_paths=100
    )
    assert result["probability_liquidation"] == 1.0
    assert result["probability_liquidation_at_horizon"] == 1.0
    assert result["collateral_var_95"] < -0.5


def test_already_liquidatable_position_counts_immediately():
    heavy_borrows = [{"asset": "USDC", "amount": 80_000}]  # HF = 71700/80000 < 1
    result = simulate_liquidation_probability(
        COLLATERAL, heavy_borrows, PRICES, FLAT_SAMPLE, horizon_days=5, n_paths=50
    )
    assert result["starting_health_factor"] < 1.0
    assert result["probability_liquidation"] == 1.0


def test_percentiles_are_ordered():
    mixed_sample = [
        {"BTC": 0.05, "ETH": 0.06, "USDC": 0.0},
        {"BTC": -0.05, "ETH": -0.06, "USDC": 0.0},
        {"BTC": 0.01, "ETH": 0.00, "USDC": 0.0001},
        {"BTC": -0.03, "ETH": -0.04, "USDC": -0.0001},
    ]
    result = simulate_liquidation_probability(
        COLLATERAL, BORROWS, PRICES, mixed_sample, horizon_days=20, n_paths=500
    )
    assert result["ending_hf_p5"] <= result["ending_hf_p50"] <= result["ending_hf_p95"]
    assert 0.0 <= result["probability_liquidation"] <= 1.0
    # Liquidation-at-any-point is at least as likely as liquidated-at-horizon
    assert (
        result["probability_liquidation"]
        >= result["probability_liquidation_at_horizon"]
    )


def test_inputs_not_mutated():
    import copy

    prices_before = copy.deepcopy(PRICES)
    sample_before = copy.deepcopy(CRASH_SAMPLE)
    simulate_liquidation_probability(
        COLLATERAL, BORROWS, PRICES, CRASH_SAMPLE, horizon_days=5, n_paths=50
    )
    assert PRICES == prices_before
    assert CRASH_SAMPLE == sample_before

"""Tests for the stress testing logic in core/risk_engine.py"""

import copy

import pytest

from backend.core.risk_engine import run_stress_test

# ── Shared fixture data ───────────────────────────────────────────────────────

COLLATERAL = [
    {"asset": "BTC", "amount": 0.5},
    {"asset": "ETH", "amount": 10},
]
BORROWS = [{"asset": "USDC", "amount": 50_000}]
PRICES = {"BTC": 100_000, "ETH": 4_000, "USDC": 1}


# ── Immutability ──────────────────────────────────────────────────────────────

def test_stress_test_does_not_mutate_portfolio():
    """The original portfolio and prices must be unchanged after a stress test."""
    original_collateral = copy.deepcopy(COLLATERAL)
    original_borrows = copy.deepcopy(BORROWS)
    original_prices = copy.deepcopy(PRICES)

    run_stress_test(COLLATERAL, BORROWS, PRICES, {"BTC": -0.3, "ETH": -0.4})

    assert COLLATERAL == original_collateral
    assert BORROWS == original_borrows
    assert PRICES == original_prices


# ── Canonical stress scenario ─────────────────────────────────────────────────

def test_stress_test_btc_minus30_eth_minus40():
    """
    Spec-defined verification:
        BTC -30%: stressed price = 70000
        ETH -40%: stressed price = 2400
        Stressed collateral = 0.5*70000 + 10*2400 = 35000 + 24000 = 59000
        Stressed HF = (0.5*70000*0.75 + 10*2400*0.825) / 50000
                    = (26250 + 19800) / 50000
                    = 46050 / 50000
                    = 0.921
        Original HF = 1.41 → not liquidatable
        Stressed HF = 0.921 → liquidatable → liquidation_triggered = True
    """
    result = run_stress_test(COLLATERAL, BORROWS, PRICES, {"BTC": -0.3, "ETH": -0.4})

    assert result["original_health_factor"] == pytest.approx(1.41)
    assert result["stressed_health_factor"] == pytest.approx(0.921)
    assert result["original_is_liquidatable"] is False
    assert result["stressed_is_liquidatable"] is True
    assert result["liquidation_triggered"] is True


def test_stress_test_collateral_value_change():
    result = run_stress_test(COLLATERAL, BORROWS, PRICES, {"BTC": -0.3, "ETH": -0.4})

    # Original: 0.5*100000 + 10*4000 = 50000 + 40000 = 90000
    # Stressed: 0.5*70000  + 10*2400 = 35000 + 24000 = 59000
    assert result["original_collateral_value"] == pytest.approx(90_000)
    assert result["stressed_collateral_value"] == pytest.approx(59_000)
    assert result["collateral_value_change_abs"] == pytest.approx(-31_000)
    assert result["collateral_value_change_pct"] == pytest.approx(-31_000 / 90_000)


# ── Positive shocks ───────────────────────────────────────────────────────────

def test_stress_test_positive_shocks_improve_health():
    result = run_stress_test(COLLATERAL, BORROWS, PRICES, {"BTC": 0.2, "ETH": 0.2})

    # Positive shocks raise collateral value → health factor goes up
    assert result["stressed_health_factor"] > result["original_health_factor"]
    assert result["liquidation_triggered"] is False
    assert result["stressed_is_liquidatable"] is False


# ── Unmentioned assets keep original prices ───────────────────────────────────

def test_stress_test_unshocked_asset_unchanged():
    """An asset not in the shocks dict must use its original price."""
    # Shock only ETH; BTC price should remain 100000
    result = run_stress_test(
        [{"asset": "BTC", "amount": 1}],
        [{"asset": "USDC", "amount": 40_000}],
        {"BTC": 100_000, "USDC": 1},
        shocks={"USDC": 0.0},   # explicit no-op shock on USDC, BTC untouched
    )
    # BTC keeps 100000; HF = (1*100000*0.75)/40000 = 1.875
    assert result["stressed_health_factor"] == pytest.approx(1.875)
    assert result["original_health_factor"] == pytest.approx(1.875)


def test_stress_test_only_eth_shocked_btc_stable():
    """Shock ETH only; BTC value contribution must stay the same."""
    result = run_stress_test(
        COLLATERAL,
        BORROWS,
        PRICES,
        shocks={"ETH": -0.5},
    )
    # BTC contribution to stressed HF: 0.5 * 100000 * 0.75 = 37500 (unchanged)
    # ETH contribution: 10 * 2000 * 0.825 = 16500
    # Stressed HF = (37500 + 16500) / 50000 = 54000/50000 = 1.08
    assert result["stressed_health_factor"] == pytest.approx(1.08)


# ── Applied shocks echoed back ────────────────────────────────────────────────

def test_stress_test_echoes_applied_shocks():
    shocks = {"BTC": -0.1, "ETH": -0.2}
    result = run_stress_test(COLLATERAL, BORROWS, PRICES, shocks)
    assert result["applied_shocks"] == shocks


# ── No liquidation when already liquidatable ──────────────────────────────────

def test_liquidation_triggered_false_when_already_liquidatable():
    """
    liquidation_triggered should be False when the position was already
    liquidatable before the shock — the shock did not cause a new liquidation.
    """
    # Extremely high borrow to ensure original HF < 1
    high_borrows = [{"asset": "USDC", "amount": 200_000}]
    result = run_stress_test(COLLATERAL, high_borrows, PRICES, {"BTC": -0.1})

    assert result["original_is_liquidatable"] is True
    assert result["liquidation_triggered"] is False

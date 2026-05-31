"""Tests for core/lending_engine.py"""

import pytest

from backend.core.lending_engine import (
    available_borrow,
    current_ltv,
    max_borrow_capacity,
    total_borrowed_value,
    total_collateral_value,
)


# ── total_collateral_value ────────────────────────────────────────────────────

def test_total_collateral_single_asset():
    collateral = [{"asset": "BTC", "amount": 0.5}]
    prices = {"BTC": 100_000}
    assert total_collateral_value(collateral, prices) == 50_000.0


def test_total_collateral_multiple_assets():
    collateral = [
        {"asset": "BTC", "amount": 0.5},
        {"asset": "ETH", "amount": 10},
    ]
    prices = {"BTC": 100_000, "ETH": 4_000}
    assert total_collateral_value(collateral, prices) == 90_000.0


def test_total_collateral_empty():
    assert total_collateral_value([], {}) == 0.0


# ── total_borrowed_value ──────────────────────────────────────────────────────

def test_total_borrowed_single():
    borrows = [{"asset": "USDC", "amount": 50_000}]
    prices = {"USDC": 1}
    assert total_borrowed_value(borrows, prices) == 50_000.0


def test_total_borrowed_multiple():
    borrows = [
        {"asset": "USDC", "amount": 30_000},
        {"asset": "ETH", "amount": 5},
    ]
    prices = {"USDC": 1, "ETH": 4_000}
    assert total_borrowed_value(borrows, prices) == 50_000.0


# ── current_ltv ───────────────────────────────────────────────────────────────

def test_ltv_single_collateral_single_borrow():
    # 50000 borrowed / 90000 collateral ≈ 0.5556
    ltv = current_ltv(collateral_value=90_000, borrowed_value=50_000)
    assert ltv == pytest.approx(50_000 / 90_000)


def test_ltv_multiple_collaterals_and_borrows():
    # Use pre-computed values
    ltv = current_ltv(collateral_value=100_000, borrowed_value=60_000)
    assert ltv == pytest.approx(0.6)


def test_ltv_zero_collateral_returns_none():
    assert current_ltv(collateral_value=0, borrowed_value=0) is None
    assert current_ltv(collateral_value=0, borrowed_value=10_000) is None


# ── max_borrow_capacity ───────────────────────────────────────────────────────

def test_max_borrow_single_asset():
    # 0.5 BTC * 100000 * 0.70 = 35000
    collateral = [{"asset": "BTC", "amount": 0.5}]
    prices = {"BTC": 100_000}
    assert max_borrow_capacity(collateral, prices) == pytest.approx(35_000.0)


def test_max_borrow_mixed_assets():
    # BTC: 0.5 * 100000 * 0.70 = 35000
    # ETH: 10  *   4000 * 0.80 = 32000
    # Total = 67000
    collateral = [
        {"asset": "BTC", "amount": 0.5},
        {"asset": "ETH", "amount": 10},
    ]
    prices = {"BTC": 100_000, "ETH": 4_000}
    assert max_borrow_capacity(collateral, prices) == pytest.approx(67_000.0)


# ── available_borrow ──────────────────────────────────────────────────────────

def test_available_borrow():
    collateral = [
        {"asset": "BTC", "amount": 0.5},
        {"asset": "ETH", "amount": 10},
    ]
    prices = {"BTC": 100_000, "ETH": 4_000}
    # max_borrow = 67000, borrowed = 50000 → available = 17000
    result = available_borrow(collateral, prices, borrowed_value=50_000)
    assert result == pytest.approx(17_000.0)


def test_available_borrow_negative_when_over_limit():
    collateral = [{"asset": "ETH", "amount": 1}]
    prices = {"ETH": 4_000}
    # max = 4000 * 0.80 = 3200; borrowed = 3500 → available = -300
    result = available_borrow(collateral, prices, borrowed_value=3_500)
    assert result == pytest.approx(-300.0)

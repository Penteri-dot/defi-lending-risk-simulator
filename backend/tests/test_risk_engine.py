"""Tests for core/risk_engine.py and core/liquidation.py"""

import pytest

from backend.core.liquidation import is_liquidatable, liquidation_buffer
from backend.core.risk_engine import health_factor


# ── health_factor ─────────────────────────────────────────────────────────────

def test_health_factor_single_btc():
    # 1 BTC at 100000, borrow 60000 USDC
    # (1 * 100000 * 0.75) / 60000 = 75000 / 60000 = 1.25
    collateral = [{"asset": "BTC", "amount": 1}]
    prices = {"BTC": 100_000}
    hf = health_factor(collateral, prices, borrowed_value=60_000)
    assert hf == pytest.approx(1.25)


def test_health_factor_mixed_btc_eth():
    """
    Manual verification of the canonical example from the spec:
        Collateral: 0.5 BTC at 100000, 10 ETH at 4000
        Borrow: 50000 USDC
        Expected: (0.5 * 100000 * 0.75 + 10 * 4000 * 0.825) / 50000
                = (37500 + 33000) / 50000
                = 70500 / 50000
                = 1.41
    """
    collateral = [
        {"asset": "BTC", "amount": 0.5},
        {"asset": "ETH", "amount": 10},
    ]
    prices = {"BTC": 100_000, "ETH": 4_000}
    hf = health_factor(collateral, prices, borrowed_value=50_000)
    assert hf == pytest.approx(1.41)


def test_health_factor_no_borrows_returns_none():
    collateral = [{"asset": "BTC", "amount": 1}]
    prices = {"BTC": 100_000}
    assert health_factor(collateral, prices, borrowed_value=0) is None


def test_health_factor_no_borrows_no_collateral_returns_none():
    assert health_factor([], {}, borrowed_value=0) is None


# ── liquidation checks ────────────────────────────────────────────────────────

def test_is_liquidatable_below_threshold():
    assert is_liquidatable(0.99) is True


def test_is_liquidatable_exactly_one():
    # Health factor of exactly 1.0 is NOT yet liquidatable
    assert is_liquidatable(1.0) is False


def test_is_liquidatable_above_threshold():
    assert is_liquidatable(1.01) is False


def test_is_liquidatable_none():
    # No borrows → not liquidatable
    assert is_liquidatable(None) is False


# ── liquidation_buffer ────────────────────────────────────────────────────────

def test_liquidation_buffer_safe_position():
    assert liquidation_buffer(1.41) == pytest.approx(0.41)


def test_liquidation_buffer_underwater():
    assert liquidation_buffer(0.95) == pytest.approx(-0.05)


def test_liquidation_buffer_none_when_no_borrows():
    assert liquidation_buffer(None) is None

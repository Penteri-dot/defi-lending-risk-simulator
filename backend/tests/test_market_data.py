"""
Tests for the market data parsers (services/market_data.py).

Only the pure parsing functions are tested — no network. The fetchers are
thin compositions of these parsers over httpx calls.
"""

import pytest

from backend.exceptions import MarketDataError
from backend.services.market_data import (
    build_joint_returns,
    normalize_stablecoin_peg,
    parse_coinbase_daily_closes,
    parse_coinbase_ticker,
    parse_okx_daily_closes,
    parse_okx_ticker,
)


# ── Stablecoin peg normalisation ─────────────────────────────────────────────

def test_peg_noise_snaps_to_one():
    assert normalize_stablecoin_peg(1.0011) == 1.0
    assert normalize_stablecoin_peg(0.9962) == 1.0
    assert normalize_stablecoin_peg(1.0) == 1.0


def test_genuine_depeg_passes_through():
    assert normalize_stablecoin_peg(0.9139) == 0.9139
    assert normalize_stablecoin_peg(1.02) == 1.02


def test_peg_band_boundary():
    assert normalize_stablecoin_peg(1.005) == 1.0   # inclusive edge
    assert normalize_stablecoin_peg(1.0051) == 1.0051


# ── Tickers ───────────────────────────────────────────────────────────────────

def test_parse_coinbase_ticker():
    assert parse_coinbase_ticker({"price": "104250.42"}) == pytest.approx(104250.42)


def test_parse_coinbase_ticker_bad_payload():
    with pytest.raises(MarketDataError):
        parse_coinbase_ticker({"unexpected": "shape"})


def test_parse_okx_ticker():
    payload = {"code": "0", "data": [{"instId": "USDC-USDT", "last": "0.9998"}]}
    assert parse_okx_ticker(payload) == pytest.approx(0.9998)


def test_parse_okx_ticker_bad_payload():
    with pytest.raises(MarketDataError):
        parse_okx_ticker({"code": "0", "data": []})


# ── Candles ───────────────────────────────────────────────────────────────────

def test_parse_coinbase_daily_closes_reverses_to_oldest_first():
    # Coinbase format: [time, low, high, open, close, volume], newest first
    payload = [
        [1700092800, 99, 101, 100, 100.5, 12.3],
        [1700006400, 95, 100, 96, 99.0, 10.1],
    ]
    assert parse_coinbase_daily_closes(payload) == [99.0, 100.5]


def test_parse_okx_daily_closes_reverses_to_oldest_first():
    # OKX format: [ts, open, high, low, close, ...], newest first
    payload = {
        "code": "0",
        "data": [
            ["1700092800000", "1.0001", "1.0002", "0.9999", "1.0000", "x", "y", "z", "1"],
            ["1700006400000", "0.9998", "1.0001", "0.9997", "0.9999", "x", "y", "z", "1"],
        ],
    }
    assert parse_okx_daily_closes(payload) == [0.9999, 1.0000]


# ── Joint returns ─────────────────────────────────────────────────────────────

def test_build_joint_returns():
    closes = {
        "BTC": [100.0, 110.0, 99.0],
        "USDC": [1.0, 1.0, 1.0],
    }
    returns = build_joint_returns(closes)
    assert len(returns) == 2
    assert returns[0]["BTC"] == pytest.approx(0.10)
    assert returns[1]["BTC"] == pytest.approx(-0.10)
    assert returns[0]["USDC"] == pytest.approx(0.0)


def test_build_joint_returns_truncates_to_shortest_series():
    closes = {
        "BTC": [100.0, 110.0, 121.0, 133.1],
        "ETH": [10.0, 11.0],  # shorter series limits the joint sample
    }
    returns = build_joint_returns(closes)
    assert len(returns) == 1
    # Most recent BTC return: 133.1/121.0 - 1 = 0.10
    assert returns[0]["BTC"] == pytest.approx(0.10)
    assert returns[0]["ETH"] == pytest.approx(0.10)


def test_build_joint_returns_insufficient_data_raises():
    with pytest.raises(MarketDataError):
        build_joint_returns({"BTC": [100.0]})

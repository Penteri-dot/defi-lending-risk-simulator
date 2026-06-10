"""Tests for API-level input validation (prices and shocks)."""

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)

# ── Shared helpers ───────────────────────────────────────────────────────────

VALID_PORTFOLIO = {
    "collateral": [{"asset": "BTC", "amount": 1.0}],
    "borrows": [{"asset": "USDC", "amount": 10_000}],
    "prices": {"BTC": 60_000, "USDC": 1},
}


# ── INVALID_PRICE ────────────────────────────────────────────────────────────

def test_zero_price_rejected():
    portfolio = {**VALID_PORTFOLIO, "prices": {"BTC": 0, "USDC": 1}}
    resp = client.post("/risk/calculate", json=portfolio)
    assert resp.status_code == 422
    assert resp.json()["code"] == "INVALID_PRICE"


def test_negative_price_rejected():
    portfolio = {**VALID_PORTFOLIO, "prices": {"BTC": -100, "USDC": 1}}
    resp = client.post("/risk/calculate", json=portfolio)
    assert resp.status_code == 422
    assert resp.json()["code"] == "INVALID_PRICE"


# ── INVALID_SHOCK ────────────────────────────────────────────────────────────

def test_shock_below_minus_one_rejected():
    resp = client.post("/risk/stress-test", json={
        "portfolio": VALID_PORTFOLIO,
        "shocks": {"BTC": -1.5},
    })
    assert resp.status_code == 422
    assert resp.json()["code"] == "INVALID_SHOCK"


def test_shock_exactly_minus_one_succeeds():
    resp = client.post("/risk/stress-test", json={
        "portfolio": VALID_PORTFOLIO,
        "shocks": {"BTC": -1.0},
    })
    assert resp.status_code == 200

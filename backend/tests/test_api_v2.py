"""API tests for the V2 endpoints: scenarios, parameters, liquidation probability."""

from fastapi.testclient import TestClient

from backend.main import app
from backend.services import market_data

client = TestClient(app)

VALID_PORTFOLIO = {
    "collateral": [
        {"asset": "BTC", "amount": 0.5},
        {"asset": "ETH", "amount": 10},
    ],
    "borrows": [{"asset": "USDC", "amount": 50_000}],
    "prices": {"BTC": 100_000, "ETH": 4_000, "USDC": 1},
}


# ── GET /parameters ──────────────────────────────────────────────────────────

def test_parameters_endpoint_exposes_snapshot_provenance():
    resp = client.get("/parameters")
    assert resp.status_code == 200
    body = resp.json()
    assert body["assets"]["ETH"]["liquidation_threshold"] == 0.83
    assert body["assets"]["BTC"]["aave_reserve"] == "WBTC"
    assert "verified" in body["snapshot"]


# ── GET /scenarios ───────────────────────────────────────────────────────────

def test_list_scenarios():
    resp = client.get("/scenarios")
    assert resp.status_code == 200
    scenarios = resp.json()["scenarios"]
    assert len(scenarios) == 6
    assert {s["id"] for s in scenarios} >= {
        "covid_crash_2020",
        "ftx_collapse_2022",
        "liberation_day_2025",
    }


# ── POST /scenarios/{id}/replay ──────────────────────────────────────────────

def test_replay_returns_days_and_summary():
    resp = client.post("/scenarios/ftx_collapse_2022/replay", json=VALID_PORTFOLIO)
    assert resp.status_code == 200
    body = resp.json()
    assert body["scenario_id"] == "ftx_collapse_2022"
    assert len(body["days"]) == 12
    assert body["summary"]["was_liquidated"] is False


def test_replay_unknown_scenario_rejected():
    resp = client.post("/scenarios/dotcom_bubble/replay", json=VALID_PORTFOLIO)
    assert resp.status_code == 422
    assert resp.json()["code"] == "UNKNOWN_SCENARIO"


def test_replay_unknown_asset_rejected():
    portfolio = {
        **VALID_PORTFOLIO,
        "collateral": [{"asset": "DOGE", "amount": 1000}],
        "prices": {"DOGE": 0.1, "USDC": 1},
    }
    resp = client.post("/scenarios/ftx_collapse_2022/replay", json=portfolio)
    assert resp.status_code == 422
    assert resp.json()["code"] == "UNKNOWN_ASSET"


# ── POST /risk/liquidation-probability ───────────────────────────────────────

def test_liquidation_probability_with_stubbed_sample(monkeypatch):
    """Stub the market data fetch so the test runs offline and deterministically."""
    flat_sample = [{"BTC": 0.0, "ETH": 0.0, "USDC": 0.0}] * 30
    monkeypatch.setattr(
        market_data, "fetch_daily_returns_sample", lambda: flat_sample
    )
    resp = client.post(
        "/risk/liquidation-probability",
        json={"portfolio": VALID_PORTFOLIO, "horizon_days": 10, "n_paths": 200},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["probability_liquidation"] == 0.0
    assert body["sample_size"] == 30
    assert body["horizon_days"] == 10


def test_liquidation_probability_invalid_horizon_rejected():
    resp = client.post(
        "/risk/liquidation-probability",
        json={"portfolio": VALID_PORTFOLIO, "horizon_days": 0},
    )
    assert resp.status_code == 422

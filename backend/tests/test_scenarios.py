"""Tests for the historical scenario replay engine (core/scenarios.py)."""

import pytest

from backend.core.scenarios import SCENARIOS, load_scenario_prices, replay_scenario

# Canonical demo portfolio: HF = (50000*0.77 + 40000*0.83) / 50000 = 1.434
COLLATERAL = [
    {"asset": "BTC", "amount": 0.5},
    {"asset": "ETH", "amount": 10},
]
BORROWS = [{"asset": "USDC", "amount": 50_000}]
PRICES = {"BTC": 100_000, "ETH": 4_000, "USDC": 1}


# ── Registry & data loading ───────────────────────────────────────────────────

def test_registry_contains_five_scenarios():
    assert len(SCENARIOS) == 5
    assert "covid_crash_2020" in SCENARIOS
    assert "usdc_depeg_2023" in SCENARIOS


def test_all_scenario_csvs_load_with_all_assets():
    for scenario_id in SCENARIOS:
        rows = load_scenario_prices(scenario_id)
        assert len(rows) >= 8
        for _, price_items in rows:
            prices = dict(price_items)
            assert set(prices) == {"BTC", "ETH", "USDC"}
            assert all(p > 0 for p in prices.values())


def test_scenario_dates_are_chronological():
    for scenario_id in SCENARIOS:
        dates = [date for date, _ in load_scenario_prices(scenario_id)]
        assert dates == sorted(dates)


# ── Value normalisation ───────────────────────────────────────────────────────

def test_day0_health_factor_matches_current_health_factor():
    """
    The replay is value-normalised to day 0, so the day-0 HF must equal the
    HF the portfolio has at current prices (1.434 for the demo portfolio).
    """
    for scenario_id in SCENARIOS:
        result = replay_scenario(COLLATERAL, BORROWS, PRICES, scenario_id)
        day0 = result["days"][0]
        # USDC borrow value is exactly preserved at day 0 by construction
        assert day0["health_factor"] == pytest.approx(1.434, abs=1e-9)
        assert day0["total_collateral_value"] == pytest.approx(90_000, abs=1e-6)


# ── Hand-verified outcomes ────────────────────────────────────────────────────

def test_covid_crash_liquidates_demo_portfolio():
    """
    Hand verification for 2020-03-12 (BTC 4857.10, ETH 110.30, USDC 0.9935):
        BTC value: 50000 * 4857.10/9070.17  = 26775.1
        ETH value: 40000 * 110.30/228.64    = 19296.7
        HF = (26775.1*0.77 + 19296.7*0.83) / ((50000/0.9974)*0.9935) ≈ 0.736
    """
    result = replay_scenario(COLLATERAL, BORROWS, PRICES, "covid_crash_2020")
    summary = result["summary"]

    assert summary["was_liquidated"] is True
    assert summary["first_liquidation_date"] == "2020-03-12"
    march12 = next(d for d in result["days"] if d["date"] == "2020-03-12")
    assert march12["health_factor"] == pytest.approx(0.736, abs=0.005)


def test_ftx_collapse_demo_portfolio_survives_barely():
    """The demo portfolio (HF 1.434) survives FTX week with a thin buffer."""
    result = replay_scenario(COLLATERAL, BORROWS, PRICES, "ftx_collapse_2022")
    summary = result["summary"]

    assert summary["was_liquidated"] is False
    assert summary["min_health_factor"] == pytest.approx(1.02, abs=0.01)
    assert summary["min_health_factor_date"] == "2022-11-09"


def test_usdc_depeg_helps_usdc_borrowers():
    """
    During the depeg week BTC/ETH rallied and borrowed USDC fell in value,
    so a BTC/ETH-collateral, USDC-debt position should IMPROVE.
    """
    result = replay_scenario(COLLATERAL, BORROWS, PRICES, "usdc_depeg_2023")
    summary = result["summary"]

    assert summary["was_liquidated"] is False
    assert summary["ending_health_factor"] > summary["starting_health_factor"]


def test_usdc_depeg_hurts_usdc_collateral():
    """A USDC-collateral / ETH-debt position is damaged by the depeg."""
    collateral = [{"asset": "USDC", "amount": 100_000}]
    borrows = [{"asset": "ETH", "amount": 15}]  # 60k debt → HF = 78000/60000 = 1.3
    result = replay_scenario(collateral, borrows, PRICES, "usdc_depeg_2023")

    assert result["days"][0]["health_factor"] == pytest.approx(1.3, abs=1e-9)
    # ETH rallied AND USDC fell: the position must deteriorate
    assert result["summary"]["min_health_factor"] < 1.3


# ── Structural checks ─────────────────────────────────────────────────────────

def test_no_borrows_never_liquidates():
    result = replay_scenario(COLLATERAL, [], PRICES, "covid_crash_2020")
    assert result["summary"]["was_liquidated"] is False
    assert result["summary"]["starting_health_factor"] is None


def test_inputs_not_mutated():
    import copy

    col_before = copy.deepcopy(COLLATERAL)
    bor_before = copy.deepcopy(BORROWS)
    replay_scenario(COLLATERAL, BORROWS, PRICES, "may_2021_selloff")
    assert COLLATERAL == col_before
    assert BORROWS == bor_before


def test_max_drawdown_is_positive_in_crash_scenarios():
    result = replay_scenario(COLLATERAL, BORROWS, PRICES, "celsius_3ac_2022")
    # BTC −39% / ETH −45% over the window → drawdown must be substantial
    assert result["summary"]["max_collateral_drawdown"] > 0.3

"""
Historical scenario replay engine.

Replays a fixed portfolio through real historical price paths (bundled as
static CSVs under backend/data/scenarios/) and reports the health factor
day by day. The position is held constant: no rebalancing, no top-ups, no
partial liquidations — the question answered is "what would this exact
position have looked like through that week?".

All calculation functions are pure; CSV loading is cached.
"""

import csv
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from backend.core.risk_engine import calculate_risk

_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "scenarios"


@dataclass(frozen=True)
class ScenarioMeta:
    id: str
    name: str
    window: str
    description: str
    filename: str


SCENARIOS: dict[str, ScenarioMeta] = {
    "covid_crash_2020": ScenarioMeta(
        id="covid_crash_2020",
        name="COVID crash (March 2020)",
        window="2020-03-05 → 2020-03-20",
        description=(
            "The COVID liquidity crisis. On 12 March 2020 BTC closed at $4,857, "
            "down 39% from the previous close — the worst single day in the "
            "dataset. Everything was sold for dollars, including crypto."
        ),
        filename="covid_crash_2020.csv",
    ),
    "may_2021_selloff": ScenarioMeta(
        id="may_2021_selloff",
        name="May 2021 leverage flush",
        window="2021-05-07 → 2021-05-24",
        description=(
            "A heavily leveraged market unwound over two weeks: BTC fell ~40% "
            "from its local high and ETH ~46% peak-to-trough, with the sharpest "
            "single day on 19 May 2021."
        ),
        filename="may_2021_selloff.csv",
    ),
    "celsius_3ac_2022": ScenarioMeta(
        id="celsius_3ac_2022",
        name="Celsius / 3AC unwind (June 2022)",
        window="2022-06-07 → 2022-06-19",
        description=(
            "stETH traded away from ETH, Celsius halted withdrawals and Three "
            "Arrows Capital became insolvent. BTC went from $31.1k to $18.9k in "
            "twelve days as forced sellers hit the market."
        ),
        filename="celsius_3ac_2022.csv",
    ),
    "ftx_collapse_2022": ScenarioMeta(
        id="ftx_collapse_2022",
        name="FTX collapse (November 2022)",
        window="2022-11-04 → 2022-11-15",
        description=(
            "The FTX exchange failed in under a week. BTC dropped 25% in five "
            "days and ETH 33% — a pure counterparty-confidence shock rather "
            "than a macro event."
        ),
        filename="ftx_collapse_2022.csv",
    ),
    "usdc_depeg_2023": ScenarioMeta(
        id="usdc_depeg_2023",
        name="USDC depeg (March 2023)",
        window="2023-03-08 → 2023-03-15",
        description=(
            "Silicon Valley Bank failed holding part of USDC's reserves; USDC's "
            "daily close bottomed at $0.914 (intraday $0.87). Note that BTC and "
            "ETH rallied during the window — a stablecoin depeg helps you if "
            "you borrowed it, and hurts you if you posted it as collateral."
        ),
        filename="usdc_depeg_2023.csv",
    ),
}


@lru_cache(maxsize=None)
def load_scenario_prices(scenario_id: str) -> tuple[tuple[str, tuple[tuple[str, float], ...]], ...]:
    """
    Load the daily price rows for a scenario from its bundled CSV.

    Returns an immutable structure (so lru_cache stays safe):
    a tuple of (date, ((asset, price), ...)) entries in chronological order.

    Raises KeyError for an unknown scenario id.
    """
    meta = SCENARIOS[scenario_id]
    rows: list[tuple[str, tuple[tuple[str, float], ...]]] = []
    with open(_DATA_DIR / meta.filename, newline="") as f:
        for row in csv.DictReader(f):
            date = row.pop("date")
            prices = tuple((asset, float(value)) for asset, value in row.items())
            rows.append((date, prices))
    return tuple(rows)


def replay_scenario(
    collateral: list[dict],
    borrows: list[dict],
    current_prices: dict[str, float],
    scenario_id: str,
) -> dict:
    """
    Replay a portfolio's risk structure through a historical scenario.

    The position is value-normalised to the scenario's first day: each
    position's current USD value is converted into the amount it would have
    bought at day-0 prices. This preserves the portfolio's collateral mix,
    leverage and health factor (day-0 HF equals the current HF), and answers
    the question "how would a position structured like mine have fared?".
    Amounts are then held constant through the window — no rebalancing,
    no top-ups, no partial liquidations.

    Args:
        collateral: list of dicts with keys 'asset' and 'amount'
        borrows: list of dicts with keys 'asset' and 'amount'
        current_prices: prices used to value the position today
        scenario_id: key into SCENARIOS

    Returns:
        Dict with per-day metrics and a summary (min HF, first liquidation
        day, peak-to-trough collateral drawdown).
    """
    rows = load_scenario_prices(scenario_id)
    day0_prices = dict(rows[0][1])

    def _normalise(positions: list[dict]) -> list[dict]:
        return [
            {
                "asset": pos["asset"],
                "amount": pos["amount"]
                * current_prices[pos["asset"]]
                / day0_prices[pos["asset"]],
            }
            for pos in positions
        ]

    collateral = _normalise(collateral)
    borrows = _normalise(borrows)

    days = []
    min_hf: float | None = None
    min_hf_date: str | None = None
    first_liquidation_date: str | None = None
    peak_collateral = 0.0
    max_drawdown = 0.0

    for date, price_items in rows:
        prices = dict(price_items)
        risk = calculate_risk(collateral, borrows, prices)
        hf = risk["health_factor"]
        col_value = risk["total_collateral_value"]

        if hf is not None and (min_hf is None or hf < min_hf):
            min_hf, min_hf_date = hf, date
        if risk["is_liquidatable"] and first_liquidation_date is None:
            first_liquidation_date = date

        peak_collateral = max(peak_collateral, col_value)
        if peak_collateral > 0:
            drawdown = (peak_collateral - col_value) / peak_collateral
            max_drawdown = max(max_drawdown, drawdown)

        days.append(
            {
                "date": date,
                "prices": prices,
                "health_factor": hf,
                "total_collateral_value": col_value,
                "total_borrowed_value": risk["total_borrowed_value"],
                "is_liquidatable": risk["is_liquidatable"],
            }
        )

    return {
        "scenario_id": scenario_id,
        "days": days,
        "summary": {
            "starting_health_factor": days[0]["health_factor"],
            "ending_health_factor": days[-1]["health_factor"],
            "min_health_factor": min_hf,
            "min_health_factor_date": min_hf_date,
            "first_liquidation_date": first_liquidation_date,
            "was_liquidated": first_liquidation_date is not None,
            "max_collateral_drawdown": max_drawdown,
        },
    }

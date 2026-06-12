"""
Liquidation probability via historical bootstrap simulation.

Instead of asking "what if BTC drops 30%?" (a point estimate), this module
asks "how likely is liquidation within N days?" by resampling actual
historical daily returns.

Method (joint bootstrap):
  1. Take a sample of historical daily returns, one vector per day covering
     all assets (e.g. {"BTC": -0.031, "ETH": -0.044, "USDC": 0.0001}).
  2. For each simulated path, draw `horizon_days` whole day-vectors with
     replacement. Drawing whole days preserves the cross-asset correlation
     observed in the sample without assuming any distribution.
  3. Walk prices along the path; record whether the health factor crosses
     below 1.0 at any daily close.

Known limitations (also surfaced in the UI):
  - Daily closes ignore intraday wicks, so results are an optimistic bound:
    real liquidations trigger on oracle prices intraday.
  - Bootstrap can only replay days that exist in the sample. If the sample
    window lacks a crisis, tail risk is understated — that is exactly why
    the scenario replay feature exists alongside this one.
  - Day-vectors are drawn independently, so volatility clustering
    (turbulent days following turbulent days) is not modelled.

All functions are pure: results are fully determined by inputs and seed.
"""

import random

from backend.core.config import ASSET_CONFIG


def _health_factor(
    collateral: list[dict],
    borrows: list[dict],
    prices: dict[str, float],
) -> float | None:
    """Minimal HF computation used inside the simulation hot loop."""
    borrowed = sum(pos["amount"] * prices[pos["asset"]] for pos in borrows)
    if borrowed == 0:
        return None
    weighted = sum(
        pos["amount"] * prices[pos["asset"]] * ASSET_CONFIG[pos["asset"]].liquidation_threshold
        for pos in collateral
    )
    return weighted / borrowed


def simulate_liquidation_probability(
    collateral: list[dict],
    borrows: list[dict],
    prices: dict[str, float],
    returns_sample: list[dict[str, float]],
    horizon_days: int = 30,
    n_paths: int = 5000,
    seed: int = 42,
) -> dict:
    """
    Estimate the probability of liquidation within a horizon.

    Args:
        collateral: list of dicts with keys 'asset' and 'amount'
        borrows: list of dicts with keys 'asset' and 'amount'
        prices: current asset prices (path starting point)
        returns_sample: historical daily returns, one dict per day; each dict
            maps asset symbol -> fractional return for that day
        horizon_days: simulation horizon in trading days
        n_paths: number of bootstrap paths
        seed: RNG seed (fixed default so repeated calls agree)

    Returns:
        Dict with liquidation probabilities, ending-HF percentiles and the
        95% VaR of collateral value over the horizon.
    """
    starting_hf = _health_factor(collateral, borrows, prices)
    if starting_hf is None:
        return {
            "starting_health_factor": None,
            "probability_liquidation": 0.0,
            "probability_liquidation_at_horizon": 0.0,
            "ending_hf_p5": None,
            "ending_hf_p50": None,
            "ending_hf_p95": None,
            "collateral_var_95": 0.0,
            "horizon_days": horizon_days,
            "n_paths": n_paths,
            "sample_size": len(returns_sample),
        }

    rng = random.Random(seed)
    n_sample = len(returns_sample)
    liquidated_within = 0
    liquidated_at_horizon = 0
    ending_hfs: list[float] = []
    ending_collateral_changes: list[float] = []

    starting_collateral = sum(
        pos["amount"] * prices[pos["asset"]] for pos in collateral
    )

    for _ in range(n_paths):
        path_prices = dict(prices)
        hit = False
        for _ in range(horizon_days):
            day = returns_sample[rng.randrange(n_sample)]
            for asset in path_prices:
                path_prices[asset] *= 1.0 + day.get(asset, 0.0)
            hf = _health_factor(collateral, borrows, path_prices)
            if hf is not None and hf < 1.0:
                hit = True
        if hit:
            liquidated_within += 1
        final_hf = _health_factor(collateral, borrows, path_prices)
        if final_hf is not None:
            ending_hfs.append(final_hf)
            if final_hf < 1.0:
                liquidated_at_horizon += 1
        final_collateral = sum(
            pos["amount"] * path_prices[pos["asset"]] for pos in collateral
        )
        if starting_collateral > 0:
            ending_collateral_changes.append(
                (final_collateral - starting_collateral) / starting_collateral
            )

    ending_hfs.sort()
    ending_collateral_changes.sort()

    def percentile(values: list[float], pct: float) -> float | None:
        if not values:
            return None
        idx = min(int(pct / 100.0 * len(values)), len(values) - 1)
        return values[idx]

    # 95% VaR: the loss exceeded in only 5% of paths (5th percentile of changes)
    var_95 = percentile(ending_collateral_changes, 5.0)

    return {
        "starting_health_factor": starting_hf,
        "probability_liquidation": liquidated_within / n_paths,
        "probability_liquidation_at_horizon": liquidated_at_horizon / n_paths,
        "ending_hf_p5": percentile(ending_hfs, 5.0),
        "ending_hf_p50": percentile(ending_hfs, 50.0),
        "ending_hf_p95": percentile(ending_hfs, 95.0),
        "collateral_var_95": var_95 if var_95 is not None else 0.0,
        "horizon_days": horizon_days,
        "n_paths": n_paths,
        "sample_size": len(returns_sample),
    }

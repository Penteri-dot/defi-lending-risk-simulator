"""
Risk metric calculations for the DeFi Lending Risk Simulator.

The health factor is the primary solvency indicator in overcollateralised
DeFi lending. When health_factor < 1.0, the position is liquidatable.

All functions are pure: no global state, no side effects.
"""

import copy

from backend.core.config import ASSET_CONFIG
from backend.core.lending_engine import (
    available_borrow,
    current_ltv,
    max_borrow_capacity,
    total_borrowed_value,
    total_collateral_value,
)
from backend.core.liquidation import is_liquidatable, liquidation_buffer


def health_factor(
    collateral: list[dict],
    prices: dict[str, float],
    borrowed_value: float,
) -> float | None:
    """
    Calculate the health factor of a lending position.

    The health factor measures how well-collateralised a position is. A value
    below 1.0 means the position is undercollateralised and can be liquidated.

    IMPORTANT: Each collateral asset has its own liquidation threshold, so the
    weighted sum must be computed per-position. Using a single average threshold
    would produce incorrect results for mixed-asset collateral portfolios.

    Formula:
        numerator   = sum(amount_i * price_i * liquidation_threshold_i)
        denominator = total_borrowed_value
        health_factor = numerator / denominator

    Args:
        collateral: list of dicts with keys 'asset' and 'amount'
        prices: mapping of asset symbol -> USD price
        borrowed_value: total USD value of all borrows

    Returns:
        Health factor as a float, or None if there are no borrows (undefined).
    """
    if borrowed_value == 0:
        return None

    weighted_collateral = sum(
        pos["amount"] * prices[pos["asset"]] * ASSET_CONFIG[pos["asset"]].liquidation_threshold
        for pos in collateral
    )
    return weighted_collateral / borrowed_value


def collateral_breakdown(
    collateral: list[dict],
    prices: dict[str, float],
    total_value: float,
) -> list[dict]:
    """
    Build a per-asset breakdown of the collateral portfolio.

    Args:
        collateral: list of dicts with keys 'asset' and 'amount'
        prices: mapping of asset symbol -> USD price
        total_value: pre-computed total collateral value (avoids recomputing)

    Returns:
        List of dicts with keys: asset, amount, value_usd, share_of_collateral.
        share_of_collateral is 0 when total_value is 0.
    """
    result = []
    for pos in collateral:
        value_usd = pos["amount"] * prices[pos["asset"]]
        share = value_usd / total_value if total_value > 0 else 0.0
        result.append(
            {
                "asset": pos["asset"],
                "amount": pos["amount"],
                "value_usd": value_usd,
                "share_of_collateral": share,
            }
        )
    return result


def calculate_risk(
    collateral: list[dict],
    borrows: list[dict],
    prices: dict[str, float],
) -> dict:
    """
    Compute all risk metrics for a portfolio.

    This is a convenience aggregator that calls the individual pure functions
    and assembles the full risk picture in one place.

    Args:
        collateral: list of dicts with keys 'asset' and 'amount'
        borrows: list of dicts with keys 'asset' and 'amount'
        prices: mapping of asset symbol -> USD price

    Returns:
        Dict with all risk metrics ready for serialisation.
    """
    col_value = total_collateral_value(collateral, prices)
    bor_value = total_borrowed_value(borrows, prices)
    ltv = current_ltv(col_value, bor_value)
    hf = health_factor(collateral, prices, bor_value)
    max_borrow = max_borrow_capacity(collateral, prices)
    avail_borrow = available_borrow(collateral, prices, bor_value)
    liquidatable = is_liquidatable(hf)
    liq_buffer = liquidation_buffer(hf)
    breakdown = collateral_breakdown(collateral, prices, col_value)

    return {
        "total_collateral_value": col_value,
        "total_borrowed_value": bor_value,
        "ltv": ltv,
        "health_factor": hf,
        "max_borrow": max_borrow,
        "available_borrow": avail_borrow,
        "is_liquidatable": liquidatable,
        "liquidation_buffer": liq_buffer,
        "collateral_breakdown": breakdown,
    }


def run_stress_test(
    collateral: list[dict],
    borrows: list[dict],
    prices: dict[str, float],
    shocks: dict[str, float],
) -> dict:
    """
    Apply price shocks to a portfolio and compare stressed vs. original metrics.

    The function DOES NOT mutate the inputs. A fresh stressed_prices dict is
    built from scratch rather than modifying the original prices dict.

    Shock values are fractional changes: -0.3 means a 30% price drop.
    Assets not mentioned in shocks retain their original prices.

    Args:
        collateral: list of dicts with keys 'asset' and 'amount'
        borrows: list of dicts with keys 'asset' and 'amount'
        prices: mapping of asset symbol -> USD price (not mutated)
        shocks: mapping of asset symbol -> fractional price change

    Returns:
        Dict comparing original and stressed risk metrics.
    """
    # Build stressed prices without touching the original dict
    stressed_prices: dict[str, float] = {
        asset: price * (1 + shocks.get(asset, 0.0))
        for asset, price in prices.items()
    }

    # Reuse the same calculation path as the unshocked case
    original = calculate_risk(collateral, borrows, prices)
    stressed = calculate_risk(collateral, borrows, stressed_prices)

    orig_col_val = original["total_collateral_value"]
    stress_col_val = stressed["total_collateral_value"]
    col_change_abs = stress_col_val - orig_col_val
    col_change_pct = col_change_abs / orig_col_val if orig_col_val > 0 else None

    orig_liquidatable = original["is_liquidatable"]
    stress_liquidatable = stressed["is_liquidatable"]

    return {
        "original_health_factor": original["health_factor"],
        "stressed_health_factor": stressed["health_factor"],
        "original_collateral_value": orig_col_val,
        "stressed_collateral_value": stress_col_val,
        "collateral_value_change_abs": col_change_abs,
        "collateral_value_change_pct": col_change_pct,
        "original_is_liquidatable": orig_liquidatable,
        "stressed_is_liquidatable": stress_liquidatable,
        "liquidation_triggered": stress_liquidatable and not orig_liquidatable,
        "applied_shocks": shocks,
    }

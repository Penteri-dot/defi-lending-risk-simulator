"""
Core lending calculations for the DeFi Lending Risk Simulator.

All functions are pure: no global state, no side effects.
Given the same inputs they always return the same outputs.
"""

from backend.core.config import ASSET_CONFIG


def total_collateral_value(
    collateral: list[dict],
    prices: dict[str, float],
) -> float:
    """
    Calculate the total USD value of all collateral positions.

    Formula: sum(amount_i * price_i) for each collateral position.

    Args:
        collateral: list of dicts with keys 'asset' and 'amount'
        prices: mapping of asset symbol -> USD price

    Returns:
        Total collateral value in USD.
    """
    return sum(pos["amount"] * prices[pos["asset"]] for pos in collateral)


def total_borrowed_value(
    borrows: list[dict],
    prices: dict[str, float],
) -> float:
    """
    Calculate the total USD value of all borrow positions.

    Formula: sum(amount_i * price_i) for each borrow position.

    Args:
        borrows: list of dicts with keys 'asset' and 'amount'
        prices: mapping of asset symbol -> USD price

    Returns:
        Total borrowed value in USD.
    """
    return sum(pos["amount"] * prices[pos["asset"]] for pos in borrows)


def current_ltv(
    collateral_value: float,
    borrowed_value: float,
) -> float | None:
    """
    Calculate the current loan-to-value ratio.

    Formula: borrowed_value / collateral_value

    Args:
        collateral_value: total USD value of collateral
        borrowed_value: total USD value of borrows

    Returns:
        LTV as a float, or None if collateral_value is 0 (division undefined).
    """
    if collateral_value == 0:
        return None
    return borrowed_value / collateral_value


def max_borrow_capacity(
    collateral: list[dict],
    prices: dict[str, float],
) -> float:
    """
    Calculate the maximum USD amount that can be borrowed against the collateral.

    Each collateral asset has its own LTV limit from the asset config, so this
    is calculated per-position rather than applying a single average LTV.

    Formula: sum(amount_i * price_i * ltv_i) for each collateral position.

    Args:
        collateral: list of dicts with keys 'asset' and 'amount'
        prices: mapping of asset symbol -> USD price

    Returns:
        Maximum borrowable USD value.
    """
    return sum(
        pos["amount"] * prices[pos["asset"]] * ASSET_CONFIG[pos["asset"]].ltv
        for pos in collateral
    )


def available_borrow(
    collateral: list[dict],
    prices: dict[str, float],
    borrowed_value: float,
) -> float:
    """
    Calculate the remaining borrowing headroom.

    Formula: max_borrow_capacity - total_borrowed_value

    Args:
        collateral: list of dicts with keys 'asset' and 'amount'
        prices: mapping of asset symbol -> USD price
        borrowed_value: current total borrowed value in USD

    Returns:
        Available borrow capacity in USD (can be negative if over-limit).
    """
    return max_borrow_capacity(collateral, prices) - borrowed_value

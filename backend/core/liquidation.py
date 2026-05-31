"""
Liquidation status helpers for the DeFi Lending Risk Simulator.

A position is liquidatable when its health factor drops below 1.0, meaning
the weighted collateral value can no longer cover the outstanding debt at the
asset-specific liquidation thresholds.
"""


def is_liquidatable(hf: float | None) -> bool:
    """
    Determine whether a position is eligible for liquidation.

    A position with no borrows (health_factor = None) can never be liquidated.

    Args:
        hf: health factor value, or None if there are no borrows

    Returns:
        True if health_factor is not None and less than 1.0.
    """
    return hf is not None and hf < 1.0


def liquidation_buffer(hf: float | None) -> float | None:
    """
    Calculate how far the health factor is from the liquidation boundary.

    A positive buffer means the position is safe; negative means it is already
    liquidatable. Returns None when there are no borrows (health_factor = None).

    Formula: health_factor - 1.0

    Args:
        hf: health factor value, or None if there are no borrows

    Returns:
        Liquidation buffer as a float, or None if hf is None.
    """
    if hf is None:
        return None
    return hf - 1.0

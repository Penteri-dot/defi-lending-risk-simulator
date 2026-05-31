"""
Asset configuration for the DeFi Lending Risk Simulator.

Parameters are inspired by Aave V3 but kept as static constants — no database.
- ltv: maximum loan-to-value ratio when opening a borrow position
- liquidation_threshold: LTV at which a position becomes liquidatable
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class AssetConfig:
    symbol: str
    ltv: float
    liquidation_threshold: float


ASSET_CONFIG: dict[str, AssetConfig] = {
    "BTC": AssetConfig(symbol="BTC", ltv=0.70, liquidation_threshold=0.75),
    "ETH": AssetConfig(symbol="ETH", ltv=0.80, liquidation_threshold=0.825),
    "USDC": AssetConfig(symbol="USDC", ltv=0.85, liquidation_threshold=0.875),
}


def get_asset(symbol: str) -> AssetConfig:
    """Return AssetConfig for a given symbol, or raise KeyError if unsupported."""
    return ASSET_CONFIG[symbol]


def is_supported(symbol: str) -> bool:
    """Check whether an asset symbol is supported."""
    return symbol in ASSET_CONFIG

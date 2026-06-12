"""
Asset configuration for the DeFi Lending Risk Simulator.

Risk parameters mirror the Aave V3 Ethereum Core market, mapped to the
simulator's simplified symbols (BTC -> WBTC, ETH -> WETH, USDC -> USDC).
Values are a dated snapshot verified against Aave governance sources —
see PARAMETER_SNAPSHOT below. On-chain parameters change via governance,
so the snapshot date matters and is exposed through the API.

- ltv: maximum loan-to-value ratio when opening a borrow position
- liquidation_threshold: LTV at which a position becomes liquidatable
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class AssetConfig:
    symbol: str
    ltv: float
    liquidation_threshold: float
    aave_reserve: str  # corresponding reserve on Aave V3 Ethereum Core


ASSET_CONFIG: dict[str, AssetConfig] = {
    "BTC": AssetConfig(symbol="BTC", ltv=0.70, liquidation_threshold=0.77, aave_reserve="WBTC"),
    "ETH": AssetConfig(symbol="ETH", ltv=0.805, liquidation_threshold=0.83, aave_reserve="WETH"),
    "USDC": AssetConfig(symbol="USDC", ltv=0.75, liquidation_threshold=0.78, aave_reserve="USDC"),
}

PARAMETER_SNAPSHOT: dict[str, str] = {
    "market": "Aave V3 Ethereum Core",
    "verified": "2026-06-11",
    "notes": (
        "WETH 80.5%/83% per the May 2026 LTV restoration proposal; "
        "WBTC 70%/77% per the September 2024 BitGo-transition parameter update; "
        "USDC 75%/78% per Aave V3 Ethereum Core reserve data. "
        "Parameters change via governance — always check the live protocol "
        "before relying on these numbers."
    ),
    "source": "https://governance.aave.com",
}


def get_asset(symbol: str) -> AssetConfig:
    """Return AssetConfig for a given symbol, or raise KeyError if unsupported."""
    return ASSET_CONFIG[symbol]


def is_supported(symbol: str) -> bool:
    """Check whether an asset symbol is supported."""
    return symbol in ASSET_CONFIG

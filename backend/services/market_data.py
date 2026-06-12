"""
Market data service: live spot prices and historical daily returns.

Data sources (no API keys required):
  - Coinbase Exchange public API for BTC-USD and ETH-USD
  - OKX public API for USDC-USDT (USDT as USD proxy — documented trade-off,
    Coinbase does not trade a USDC/USD pair)

Network calls are isolated here behind small pure parsing functions so the
rest of the backend stays pure and the parsers are unit-testable without
any network. Responses are cached in-process with a TTL; the engine itself
remains stateless with respect to user data.
"""

import time
from datetime import datetime, timezone

import httpx

from backend.exceptions import MarketDataError

COINBASE_BASE = "https://api.exchange.coinbase.com"
OKX_BASE = "https://www.okx.com"

SPOT_TTL_SECONDS = 60
RETURNS_TTL_SECONDS = 6 * 3600
_TIMEOUT = 10.0

_cache: dict[str, tuple[float, object]] = {}


def _cached(key: str, ttl: float, fetch):
    now = time.monotonic()
    hit = _cache.get(key)
    if hit is not None and now - hit[0] < ttl:
        return hit[1]
    value = fetch()
    _cache[key] = (now, value)
    return value


def _get_json(url: str, params: dict | None = None):
    try:
        response = httpx.get(url, params=params, timeout=_TIMEOUT)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as exc:
        raise MarketDataError(
            f"Upstream market data request failed: {exc}",
            code="MARKET_DATA_UNAVAILABLE",
        ) from exc


# ── Pure parsers (unit-tested without network) ────────────────────────────────


def parse_coinbase_ticker(payload: dict) -> float:
    """Extract the last trade price from a Coinbase ticker payload."""
    try:
        return float(payload["price"])
    except (KeyError, TypeError, ValueError) as exc:
        raise MarketDataError(
            "Unexpected Coinbase ticker payload.", code="MARKET_DATA_PARSE_ERROR"
        ) from exc


def parse_okx_ticker(payload: dict) -> float:
    """Extract the last trade price from an OKX ticker payload."""
    try:
        return float(payload["data"][0]["last"])
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise MarketDataError(
            "Unexpected OKX ticker payload.", code="MARKET_DATA_PARSE_ERROR"
        ) from exc


def parse_coinbase_daily_closes(payload: list) -> list[float]:
    """
    Extract daily closes from Coinbase candles, oldest first.

    Coinbase candle format: [time, low, high, open, close, volume], newest first.
    """
    try:
        closes = [float(candle[4]) for candle in payload]
    except (IndexError, TypeError, ValueError) as exc:
        raise MarketDataError(
            "Unexpected Coinbase candles payload.", code="MARKET_DATA_PARSE_ERROR"
        ) from exc
    return list(reversed(closes))


def parse_okx_daily_closes(payload: dict) -> list[float]:
    """
    Extract daily closes from OKX candles, oldest first.

    OKX candle format: [ts, open, high, low, close, ...], newest first.
    """
    try:
        closes = [float(candle[4]) for candle in payload["data"]]
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise MarketDataError(
            "Unexpected OKX candles payload.", code="MARKET_DATA_PARSE_ERROR"
        ) from exc
    return list(reversed(closes))


def build_joint_returns(closes_by_asset: dict[str, list[float]]) -> list[dict[str, float]]:
    """
    Convert per-asset close series into joint daily return vectors.

    Series are aligned from the most recent day backwards and truncated to the
    shortest series. Sources use slightly different day boundaries (Coinbase
    UTC, OKX UTC+8); for stablecoin returns near zero this misalignment is
    immaterial and is documented in the model limitations.
    """
    if not closes_by_asset:
        return []
    n = min(len(c) for c in closes_by_asset.values()) - 1
    if n <= 0:
        raise MarketDataError(
            "Not enough historical data to build a returns sample.",
            code="MARKET_DATA_INSUFFICIENT",
        )
    aligned = {asset: closes[-(n + 1):] for asset, closes in closes_by_asset.items()}
    returns: list[dict[str, float]] = []
    for i in range(1, n + 1):
        returns.append(
            {
                asset: closes[i] / closes[i - 1] - 1.0
                for asset, closes in aligned.items()
                if closes[i - 1] > 0
            }
        )
    return returns


# ── Fetchers (network, cached) ────────────────────────────────────────────────


def fetch_spot_prices() -> dict:
    """Fetch current spot prices for BTC, ETH and USDC (cached, 60s TTL)."""

    def _fetch() -> dict:
        btc = parse_coinbase_ticker(_get_json(f"{COINBASE_BASE}/products/BTC-USD/ticker"))
        eth = parse_coinbase_ticker(_get_json(f"{COINBASE_BASE}/products/ETH-USD/ticker"))
        usdc = parse_okx_ticker(
            _get_json(f"{OKX_BASE}/api/v5/market/ticker", {"instId": "USDC-USDT"})
        )
        return {
            "prices": {"BTC": btc, "ETH": eth, "USDC": usdc},
            "as_of": datetime.now(timezone.utc).isoformat(),
            "sources": {
                "BTC": "Coinbase BTC-USD",
                "ETH": "Coinbase ETH-USD",
                "USDC": "OKX USDC-USDT (USDT as USD proxy)",
            },
        }

    return _cached("spot_prices", SPOT_TTL_SECONDS, _fetch)


def fetch_daily_returns_sample() -> list[dict[str, float]]:
    """
    Fetch ~300 days of joint daily returns for BTC, ETH and USDC
    (cached, 6h TTL). Used as the bootstrap sample for the liquidation
    probability simulation.
    """

    def _fetch() -> list[dict[str, float]]:
        closes = {
            "BTC": parse_coinbase_daily_closes(
                _get_json(
                    f"{COINBASE_BASE}/products/BTC-USD/candles",
                    {"granularity": 86400},
                )
            ),
            "ETH": parse_coinbase_daily_closes(
                _get_json(
                    f"{COINBASE_BASE}/products/ETH-USD/candles",
                    {"granularity": 86400},
                )
            ),
            "USDC": parse_okx_daily_closes(
                _get_json(
                    f"{OKX_BASE}/api/v5/market/candles",
                    {"instId": "USDC-USDT", "bar": "1D", "limit": "300"},
                )
            ),
        }
        return build_joint_returns(closes)

    return _cached("daily_returns", RETURNS_TTL_SECONDS, _fetch)

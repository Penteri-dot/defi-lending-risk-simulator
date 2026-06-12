# Historical scenario data

Daily close prices (USD) used by the scenario replay engine. Data is bundled as
static CSVs on purpose: replays are deterministic, testable offline, and not
dependent on any third-party API being up.

## Sources

| Asset | Source | Pair | Notes |
|-------|--------|------|-------|
| BTC   | Coinbase Exchange API (`/products/BTC-USD/candles`) | BTC-USD | Daily candles, UTC day boundaries |
| ETH   | Coinbase Exchange API (`/products/ETH-USD/candles`) | ETH-USD | Daily candles, UTC day boundaries |
| USDC  | OKX API (`/api/v5/market/history-candles`) | USDC-USDT | USDT used as USD proxy; OKX daily candles use UTC+8 day boundaries, so USDC rows are offset ~8h vs BTC/ETH rows |

Fetched 2026-06-11. Each value is the daily close.

## Scenarios

| File | Window | What happened |
|------|--------|---------------|
| `covid_crash_2020.csv` | 2020-03-05 → 2020-03-20 | COVID liquidity crisis. BTC closed 2020-03-12 at $4,857 (−39% in one day from $7,938). |
| `may_2021_selloff.csv` | 2021-05-07 → 2021-05-24 | Leverage flush. BTC −40% from local high; ETH −46% peak-to-trough. |
| `celsius_3ac_2022.csv` | 2022-06-07 → 2022-06-19 | stETH depeg, Celsius withdrawal halt, 3AC insolvency. BTC $31.1k → $18.9k. |
| `ftx_collapse_2022.csv` | 2022-11-04 → 2022-11-15 | FTX collapse. BTC −25% in 5 days; ETH −33%. |
| `liberation_day_2025.csv` | 2025-04-01 → 2025-04-12 | "Liberation Day" tariff announcement (2 Apr) and pause (9 Apr). ETH −23% peak-to-trough vs BTC −11%. |
| `usdc_depeg_2023.csv` | 2023-03-08 → 2023-03-15 | SVB failure; USDC daily close low $0.914 (intraday $0.87). Note that BTC/ETH *rallied* during the window. |

## Known limitations

- Single-venue prices (not an index); venue choice documented above.
- Daily closes understate intraday stress: on 2020-03-12 and 2023-03-11 the
  intraday lows were materially below the close. Liquidations trigger on oracle
  prices intraday, so replay results are a *conservative* (optimistic) bound.

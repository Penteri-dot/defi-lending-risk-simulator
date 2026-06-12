# DeFi Lending Risk Simulator

![CI](https://github.com/Penteri-dot/defi-lending-risk-simulator/actions/workflows/ci.yml/badge.svg)

A banking-inspired risk engine for analysing overcollateralised crypto lending positions — with real Aave V3 risk parameters, live market prices, historical crisis replays, and bootstrap Monte Carlo liquidation probabilities.

**Live demo:** https://defi-lending-risk-simulator.vercel.app

*Note: the backend runs on Render's free tier and may take ~30–50s to wake on the first request after a period of inactivity.*

![Dashboard](docs/screenshot-dashboard.png)
![Stress Test](docs/screenshot-stresstest.png)

---

## Why I built this

Overcollateralised crypto lending and traditional secured lending solve the same problem with the same tools — loan-to-value limits, collateral buffers, liquidation thresholds, and stress testing — just on different infrastructure. Coming from a background in banking and crypto, I built this simulator to make that connection explicit: it translates traditional credit-risk thinking into an interactive tool for analysing DeFi lending positions.

The V2 release pushes past point estimates: instead of only asking *"what if BTC drops 30%?"*, the engine replays real crisis weeks (March 2020, FTX, the USDC depeg) against your position and estimates the *probability* of liquidation via historical bootstrap simulation.

---

## Features

- **Real-time health factor** — calculated on every portfolio change, colour-coded across five risk levels (Safe → Healthy → Monitor → At risk → Liquidatable)
- **Real Aave V3 risk parameters** — LTV and liquidation thresholds mirror the Aave V3 Ethereum Core market as a dated, sourced snapshot (see Risk model below)
- **Live market prices** — one click pulls spot prices from public exchange APIs (Coinbase, OKX); no API keys anywhere
- **Stress testing** — apply per-asset price shocks and see the impact on health factor, collateral value, and liquidation status
- **Historical scenario replay** — your position structure, replayed through six real crisis windows with actual daily closes: COVID crash (3/2020), May 2021 selloff, Celsius/3AC (6/2022), FTX collapse (11/2022), USDC depeg (3/2023), Liberation Day tariffs (4/2025). Day-by-day health factor path, first liquidation date, max drawdown
- **Liquidation probability** — joint bootstrap Monte Carlo over ~300 days of actual returns: P(liquidation within 7/30/90 days), ending-HF percentiles, 95% VaR — with an explicit *model limitations* panel
- **Risk Explained** — plain-English reference covering LTV, health factor, liquidation thresholds, and why stress testing matters

---

## Tech stack

**Backend**
- Python + FastAPI + Pydantic v2
- Stateless with respect to user data — no database, no authentication; the only server-side state is a TTL cache for upstream market data
- Pure functions throughout the risk, scenario and simulation engines: given the same inputs (and seed), always the same outputs
- 69 passing tests (pytest), run on every push via GitHub Actions

**Frontend**
- React + TypeScript + Vite
- Tailwind CSS (v4)
- Recharts for the health factor gauge, scenario replay chart, pie chart, and bar chart
- Axios for API calls; portfolio state persists to localStorage

---

## Getting started

**Requirements:** Python 3.10+, Node.js 20.19+

### Backend

```bash
make install   # creates .venv and installs dependencies
make run       # starts FastAPI on http://localhost:8000
make test      # runs all tests
```

### Frontend

```bash
cd frontend
npm install
npm run dev    # starts Vite dev server on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) with the backend running on `:8000`.

---

## Architecture

The backend risk engine is built from pure functions — every risk endpoint receives the full portfolio in the request body and returns calculated metrics. There is no database and no session state.

Three kinds of data feed the engine, each handled the way its nature demands:

| Data | Source | Why |
|------|--------|-----|
| Historical scenarios | Static CSVs bundled in the repo | Deterministic, testable offline, no API dependency for fixed history |
| Live spot prices | Coinbase/OKX public APIs at runtime, 60s TTL cache | Freshness matters; keyless public endpoints |
| Bootstrap returns sample | Coinbase/OKX public APIs at runtime, 6h TTL cache | ~300 most recent daily returns, refreshed automatically |

All portfolio state lives in the React frontend and persists to `localStorage`. The engine modules (`risk_engine`, `scenarios`, `monte_carlo`) are independently testable — the full suite runs without a server or network (market-data parsers are tested against canned payloads).

### API surface

```
POST /risk/calculate                 risk metrics for a portfolio
POST /risk/stress-test               per-asset price shocks
POST /risk/liquidation-probability   bootstrap Monte Carlo over a horizon
POST /scenarios/{id}/replay          replay through a historical crisis window
GET  /scenarios                      list scenarios
GET  /market/prices                  live spot prices
GET  /parameters                     risk parameter snapshot + provenance
GET  /health                         health check
```

Interactive docs at `/docs` (Swagger UI).

---

## Risk model

Parameters mirror the **Aave V3 Ethereum Core** market (simulator symbols map BTC→WBTC, ETH→WETH), verified 2026-06-11 against [Aave governance](https://governance.aave.com) sources:

| Asset | Max LTV | Liquidation Threshold | Aave reserve |
|-------|---------|----------------------|--------------|
| BTC   | 70%     | 77%                  | WBTC |
| ETH   | 80.5%   | 83%                  | WETH |
| USDC  | 75%     | 78%                  | USDC |

On-chain parameters change via governance votes — the `/parameters` endpoint exposes the snapshot date and provenance, and the UI says so out loud.

**LTV (Loan-to-Value):** the ratio of outstanding debt to total collateral value. The max LTV cap governs how much can be borrowed at origination.

**Health Factor:** the primary solvency indicator — `Σ(collateral_i × price_i × liquidation_threshold_i) / total_borrowed`. A value below 1.0 means the position is eligible for liquidation. The further above 1.0, the larger the buffer against falling prices.

**Liquidation Threshold:** set above the max LTV, it is the point at which an existing position triggers forced liquidation — analogous to a maintenance margin requirement in traditional finance.

### Scenario replay method

Your position is value-normalised to the scenario's first day — same collateral mix, same leverage, same starting health factor — then held fixed while prices follow the actual daily closes. Sources and per-scenario notes: [`backend/data/scenarios/README.md`](backend/data/scenarios/README.md).

### Liquidation probability method

Joint bootstrap: whole day-vectors of returns are resampled with replacement, preserving observed cross-asset correlation without assuming any distribution. 5,000 paths, fixed seed for reproducibility.

### Known limitations (stated on purpose)

- Daily closes understate intraday stress — liquidations trigger on oracle prices intraday, so all results are an optimistic bound
- The bootstrap sample covers only the most recent ~300 days; deep-tail events live in the scenario library instead
- Returns are drawn independently (no volatility clustering); borrow interest accrual is not modelled
- Educational tool, not financial advice

See the in-app **Risk Explained** view for a full plain-English walkthrough.

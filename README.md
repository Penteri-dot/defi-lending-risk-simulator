# DeFi Lending Risk Simulator — Backend

Stateless FastAPI service implementing traditional credit risk concepts (LTV, liquidation thresholds, stress testing) applied to DeFi-style overcollateralised lending.

## Run the backend

```bash
cd defi-lending-risk-simulator
make install
make run
```

The server starts at **http://localhost:8000**. Interactive API docs: **http://localhost:8000/docs**.

## Run tests

```bash
make test
```

## Quick example

```bash
curl -s -X POST http://localhost:8000/risk/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "collateral": [
      {"asset": "BTC", "amount": 0.5},
      {"asset": "ETH", "amount": 10}
    ],
    "borrows": [{"asset": "USDC", "amount": 50000}],
    "prices": {"BTC": 100000, "ETH": 4000, "USDC": 1}
  }' | python3 -m json.tool
```

Expected `health_factor`: **1.41**

```bash
curl -s -X POST http://localhost:8000/risk/stress-test \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio": {
      "collateral": [
        {"asset": "BTC", "amount": 0.5},
        {"asset": "ETH", "amount": 10}
      ],
      "borrows": [{"asset": "USDC", "amount": 50000}],
      "prices": {"BTC": 100000, "ETH": 4000, "USDC": 1}
    },
    "shocks": {"BTC": -0.3, "ETH": -0.4}
  }' | python3 -m json.tool
```

Expected `stressed_health_factor`: **0.921**, `liquidation_triggered`: **true**

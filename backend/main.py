"""
Entry point for the DeFi Lending Risk Simulator FastAPI application.
"""

import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.routes import router
from backend.exceptions import RiskEngineError

app = FastAPI(
    title="DeFi Lending Risk Simulator",
    description=(
        "Stateless risk calculation engine for overcollateralised DeFi lending. "
        "Applies traditional credit risk concepts (LTV, liquidation thresholds, "
        "stress testing) to DeFi-style portfolios."
    ),
    version="0.1.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────

_default_origins = ["http://localhost:5173", "http://localhost:3000"]
_env_origins = os.getenv("CORS_ORIGINS", "")
allowed_origins = (
    [o.strip() for o in _env_origins.split(",") if o.strip()]
    if _env_origins
    else _default_origins
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Exception handlers ────────────────────────────────────────────────────────


@app.exception_handler(RiskEngineError)
async def risk_engine_error_handler(request: Request, exc: RiskEngineError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"error": exc.message, "code": exc.code},
    )


# ── Routes ────────────────────────────────────────────────────────────────────

app.include_router(router)

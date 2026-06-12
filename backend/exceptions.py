"""Custom exception types for the risk engine."""


class RiskEngineError(Exception):
    """
    Raised when a portfolio request fails domain-level validation.

    Attributes:
        message: Human-readable description of the problem.
        code: Uppercase error code for programmatic handling.
    """

    def __init__(self, message: str, code: str) -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class MarketDataError(Exception):
    """
    Raised when upstream market data cannot be fetched or parsed.

    Mapped to HTTP 503 — the risk engine itself is fine, the data isn't there.

    Attributes:
        message: Human-readable description of the problem.
        code: Uppercase error code for programmatic handling.
    """

    def __init__(self, message: str, code: str) -> None:
        super().__init__(message)
        self.message = message
        self.code = code

"""Error hierarchy for the apiz SDK.

All errors thrown by this library extend :class:`ApizError` so callers can
catch broadly when desired. Subclasses are 1:1 with HTTP semantics.
"""

from __future__ import annotations

from typing import Any, Optional


class ApizError(Exception):
    """Base class for all apiz SDK errors."""

    def __init__(
        self,
        message: str,
        *,
        status: Optional[int] = None,
        code: Optional[int] = None,
        detail: Any = None,
        request_id: Optional[str] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code
        self.detail = detail
        self.request_id = request_id

    def __repr__(self) -> str:
        bits = [f"message={self.message!r}"]
        if self.status is not None:
            bits.append(f"status={self.status}")
        if self.code is not None:
            bits.append(f"code={self.code}")
        return f"{self.__class__.__name__}({', '.join(bits)})"


class ApizAuthenticationError(ApizError):
    pass


class ApizPermissionDeniedError(ApizError):
    pass


class ApizNotFoundError(ApizError):
    pass


class ApizValidationError(ApizError):
    pass


class ApizInsufficientBalanceError(ApizError):
    pass


class ApizRateLimitError(ApizError):
    pass


class ApizServerError(ApizError):
    pass


class ApizTimeoutError(ApizError):
    pass


class ApizConnectionError(ApizError):
    pass


def error_from_status(status: int, message: str, **kwargs: Any) -> ApizError:
    """Pick the right subclass for a given HTTP status."""
    cls: type[ApizError]
    if status == 401:
        cls = ApizAuthenticationError
    elif status == 402:
        cls = ApizInsufficientBalanceError
    elif status == 403:
        cls = ApizPermissionDeniedError
    elif status == 404:
        cls = ApizNotFoundError
    elif status in (400, 422):
        cls = ApizValidationError
    elif status == 429:
        cls = ApizRateLimitError
    elif status >= 500:
        cls = ApizServerError
    else:
        cls = ApizError
    return cls(message, status=status, **kwargs)

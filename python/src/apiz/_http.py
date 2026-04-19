"""HTTP transport layer for the apiz SDK.

Phase 3A surface: the public methods exist with the right signatures, but
:meth:`SyncHttpClient.request` and :meth:`AsyncHttpClient.request` raise
``ApizError`` so contract tests fail until Phase 3B implements them.
"""

from __future__ import annotations

import os
import random
import time
from typing import Any, Optional

import httpx

from ._errors import (
    ApizConnectionError,
    ApizError,
    ApizTimeoutError,
    error_from_status,
)

DEFAULT_BASE_URL = "https://api.apiz.ai"
DEFAULT_TIMEOUT = 60.0
RETRYABLE_STATUSES = {408, 425, 429, 500, 502, 503, 504}


class _ResolvedConfig:
    __slots__ = ("api_key", "base_url", "default_headers", "max_retries", "timeout")

    def __init__(
        self,
        api_key: str,
        base_url: str,
        timeout: float,
        max_retries: int,
        default_headers: dict[str, str],
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self.default_headers = default_headers


def resolve_config(
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    timeout: Optional[float] = None,
    max_retries: Optional[int] = None,
    default_headers: Optional[dict[str, str]] = None,
) -> _ResolvedConfig:
    api_key = api_key or os.environ.get("APIZ_API_KEY") or os.environ.get("XSKILL_API_KEY") or ""
    base_url = base_url or os.environ.get("APIZ_BASE_URL") or DEFAULT_BASE_URL
    timeout_env = os.environ.get("APIZ_TIMEOUT")
    if timeout is None:
        timeout = float(timeout_env) if timeout_env else DEFAULT_TIMEOUT
    if max_retries is None:
        max_retries = 2
    return _ResolvedConfig(
        api_key=api_key,
        base_url=base_url,
        timeout=timeout,
        max_retries=max_retries,
        default_headers=default_headers or {},
    )


def _build_url(base_url: str, path: str) -> str:
    if not path.startswith("/"):
        path = "/" + path
    return base_url + path


def _build_headers(config: _ResolvedConfig, auth: bool, extra: Optional[dict[str, str]]) -> dict[str, str]:
    headers = {"Accept": "application/json"}
    headers.update(config.default_headers)
    if extra:
        headers.update(extra)
    if auth and config.api_key:
        headers["Authorization"] = f"Bearer {config.api_key}"
    return headers


def _strip_query(query: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
    if not query:
        return None
    return {k: str(v) for k, v in query.items() if v not in (None, "", False)}


def _backoff_seconds(attempt: int) -> float:
    base = min(0.05 * (2 ** (attempt - 1)), 2.0)
    return base + random.random() * 0.025


def _parse_success(response: httpx.Response) -> Any:
    if response.status_code == 204 or not response.content:
        return None
    try:
        payload = response.json()
    except ValueError as exc:
        raise ApizError(f"Invalid JSON in response body: {response.text[:200]}") from exc
    if isinstance(payload, dict) and "data" in payload:
        return payload["data"]
    return payload


def _parse_error(response: httpx.Response) -> dict[str, Any]:
    try:
        payload = response.json()
    except ValueError:
        return {}
    if not isinstance(payload, dict):
        return {}
    message: Optional[str] = None
    if isinstance(payload.get("detail"), str):
        message = payload["detail"]
    elif isinstance(payload.get("message"), str):
        message = payload["message"]
    code: Optional[int] = payload.get("code") if isinstance(payload.get("code"), int) else None
    detail: Any = payload.get("data", payload.get("detail"))
    return {"message": message, "code": code, "detail": detail}


class SyncHttpClient:
    def __init__(self, config: _ResolvedConfig, *, http_client: Optional[httpx.Client] = None) -> None:
        self.config = config
        self._http = http_client or httpx.Client(timeout=config.timeout)

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> SyncHttpClient:
        return self

    def __exit__(self, *_exc: Any) -> None:
        self.close()

    def request(
        self,
        method: str,
        path: str,
        *,
        body: Any = None,
        query: Optional[dict[str, Any]] = None,
        headers: Optional[dict[str, str]] = None,
        auth: bool = True,
    ) -> Any:
        url = _build_url(self.config.base_url, path)
        params = _strip_query(query)
        h = _build_headers(self.config, auth, headers)
        json_body = body if body is not None and method.upper() != "GET" else None
        if json_body is not None:
            h.setdefault("Content-Type", "application/json")

        last_error: Optional[Exception] = None
        max_attempts = max(1, self.config.max_retries + 1)
        for attempt in range(1, max_attempts + 1):
            try:
                response = self._http.request(
                    method.upper(),
                    url,
                    params=params,
                    json=json_body,
                    headers=h,
                )
            except httpx.TimeoutException as exc:
                raise ApizTimeoutError(
                    f"Request to {method.upper()} {path} timed out after {self.config.timeout}s",
                ) from exc
            except httpx.HTTPError as exc:
                last_error = ApizConnectionError(
                    f"Network error contacting {self.config.base_url}: {exc}",
                )
                if attempt < max_attempts:
                    time.sleep(_backoff_seconds(attempt))
                    continue
                raise last_error from exc

            if 200 <= response.status_code < 300:
                return _parse_success(response)

            parsed = _parse_error(response)
            apiz_error = error_from_status(
                response.status_code,
                parsed.get("message") or f"HTTP {response.status_code} from {method} {path}",
                code=parsed.get("code"),
                detail=parsed.get("detail"),
            )
            if response.status_code in RETRYABLE_STATUSES and attempt < max_attempts:
                last_error = apiz_error
                time.sleep(_backoff_seconds(attempt))
                continue
            raise apiz_error

        if isinstance(last_error, Exception):
            raise last_error
        raise ApizError("Exhausted retries with unknown error")


class AsyncHttpClient:
    def __init__(
        self,
        config: _ResolvedConfig,
        *,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        self.config = config
        self._http = http_client or httpx.AsyncClient(timeout=config.timeout)

    async def aclose(self) -> None:
        await self._http.aclose()

    async def __aenter__(self) -> AsyncHttpClient:
        return self

    async def __aexit__(self, *_exc: Any) -> None:
        await self.aclose()

    async def request(
        self,
        method: str,
        path: str,
        *,
        body: Any = None,
        query: Optional[dict[str, Any]] = None,
        headers: Optional[dict[str, str]] = None,
        auth: bool = True,
    ) -> Any:
        import asyncio

        url = _build_url(self.config.base_url, path)
        params = _strip_query(query)
        h = _build_headers(self.config, auth, headers)
        json_body = body if body is not None and method.upper() != "GET" else None
        if json_body is not None:
            h.setdefault("Content-Type", "application/json")

        last_error: Optional[Exception] = None
        max_attempts = max(1, self.config.max_retries + 1)
        for attempt in range(1, max_attempts + 1):
            try:
                response = await self._http.request(
                    method.upper(),
                    url,
                    params=params,
                    json=json_body,
                    headers=h,
                )
            except httpx.TimeoutException as exc:
                raise ApizTimeoutError(
                    f"Request to {method.upper()} {path} timed out after {self.config.timeout}s",
                ) from exc
            except httpx.HTTPError as exc:
                last_error = ApizConnectionError(
                    f"Network error contacting {self.config.base_url}: {exc}",
                )
                if attempt < max_attempts:
                    await asyncio.sleep(_backoff_seconds(attempt))
                    continue
                raise last_error from exc

            if 200 <= response.status_code < 300:
                return _parse_success(response)

            parsed = _parse_error(response)
            apiz_error = error_from_status(
                response.status_code,
                parsed.get("message") or f"HTTP {response.status_code} from {method} {path}",
                code=parsed.get("code"),
                detail=parsed.get("detail"),
            )
            if response.status_code in RETRYABLE_STATUSES and attempt < max_attempts:
                last_error = apiz_error
                await asyncio.sleep(_backoff_seconds(attempt))
                continue
            raise apiz_error

        if isinstance(last_error, Exception):
            raise last_error
        raise ApizError("Exhausted retries with unknown error")

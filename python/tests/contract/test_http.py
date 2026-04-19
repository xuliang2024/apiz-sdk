from __future__ import annotations

import time

import pytest
import respx
from httpx import Response

from apiz import Apiz, ApizAuthenticationError, ApizConnectionError, ApizTimeoutError

from ..helpers import MOCK_BASE_URL, TEST_API_KEY


def _client(**kwargs: object) -> Apiz:
    return Apiz(api_key=TEST_API_KEY, base_url=MOCK_BASE_URL, **kwargs)  # type: ignore[arg-type]


@respx.mock(assert_all_called=False)
def test_attaches_bearer_header(respx_mock: respx.Router) -> None:
    captured: dict[str, str | None] = {}

    def _handler(request):  # type: ignore[no-untyped-def]
        captured["auth"] = request.headers.get("authorization")
        return Response(200, json={"code": 200, "data": {"user_id": 1, "balance": 0, "balance_yuan": 0, "vip_level": 0}})

    respx_mock.get(f"{MOCK_BASE_URL}/api/v3/balance").mock(side_effect=_handler)
    _client(max_retries=0).account.balance()
    assert captured["auth"] == f"Bearer {TEST_API_KEY}"


@respx.mock(assert_all_called=False)
def test_retries_on_5xx_then_succeeds(respx_mock: respx.Router) -> None:
    calls = {"n": 0}

    def _handler(_request):  # type: ignore[no-untyped-def]
        calls["n"] += 1
        if calls["n"] < 2:
            return Response(500, json={"code": 500, "detail": "transient"})
        return Response(
            200, json={"code": 200, "data": {"user_id": 1, "balance": 100, "balance_yuan": 1, "vip_level": 0}}
        )

    respx_mock.get(f"{MOCK_BASE_URL}/api/v3/balance").mock(side_effect=_handler)
    b = _client(max_retries=3).account.balance()
    assert calls["n"] >= 2
    assert b.balance == 100


@respx.mock(assert_all_called=False)
def test_does_not_retry_on_4xx(respx_mock: respx.Router) -> None:
    calls = {"n": 0}

    def _handler(_request):  # type: ignore[no-untyped-def]
        calls["n"] += 1
        return Response(401, json={"code": 401, "detail": "nope"})

    respx_mock.get(f"{MOCK_BASE_URL}/api/v3/balance").mock(side_effect=_handler)
    with pytest.raises(ApizAuthenticationError):
        _client(max_retries=5).account.balance()
    assert calls["n"] == 1


@respx.mock(assert_all_called=False)
def test_timeout_raises_apiz_timeout_error(respx_mock: respx.Router) -> None:
    import httpx

    respx_mock.get(f"{MOCK_BASE_URL}/api/v3/balance").mock(
        side_effect=httpx.ConnectTimeout("simulated timeout")
    )
    with pytest.raises(ApizTimeoutError):
        _client(timeout=0.02, max_retries=0).account.balance()


# Suppress the unused import warning emitted by ruff for this file.
_ = time


@respx.mock(assert_all_called=False)
def test_network_error_raises_apiz_connection_error(respx_mock: respx.Router) -> None:
    import httpx

    respx_mock.get(f"{MOCK_BASE_URL}/api/v3/balance").mock(
        side_effect=httpx.ConnectError("simulated")
    )
    with pytest.raises(ApizConnectionError):
        _client(max_retries=0).account.balance()

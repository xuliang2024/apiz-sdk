from __future__ import annotations

import pytest
import respx

from apiz import (
    Apiz,
    ApizAuthenticationError,
    ApizError,
    ApizInsufficientBalanceError,
    ApizNotFoundError,
    ApizRateLimitError,
    ApizServerError,
    ApizValidationError,
    error_from_status,
)

from ..helpers import MOCK_BASE_URL, TEST_API_KEY, fixture_response


def _client() -> Apiz:
    return Apiz(api_key=TEST_API_KEY, base_url=MOCK_BASE_URL, max_retries=0)


def test_error_from_status_401() -> None:
    assert isinstance(error_from_status(401, "x"), ApizAuthenticationError)


def test_error_from_status_402() -> None:
    assert isinstance(error_from_status(402, "x"), ApizInsufficientBalanceError)


def test_error_from_status_404() -> None:
    assert isinstance(error_from_status(404, "x"), ApizNotFoundError)


def test_error_from_status_422() -> None:
    assert isinstance(error_from_status(422, "x"), ApizValidationError)


def test_error_from_status_429() -> None:
    assert isinstance(error_from_status(429, "x"), ApizRateLimitError)


def test_error_from_status_500() -> None:
    assert isinstance(error_from_status(500, "x"), ApizServerError)


def test_error_retains_status_and_detail() -> None:
    e = error_from_status(403, "forbidden", detail={"code": "E_PERM"})
    assert e.status == 403
    assert e.detail == {"code": "E_PERM"}
    assert isinstance(e, ApizError)


@respx.mock(assert_all_called=False)
def test_http_401_maps_to_authentication_error(respx_mock: respx.Router) -> None:
    respx_mock.get(f"{MOCK_BASE_URL}/api/v3/balance").mock(
        return_value=fixture_response("errors/401_unauthorized.json", 401)
    )
    with pytest.raises(ApizAuthenticationError):
        _client().account.balance()


@respx.mock(assert_all_called=False)
def test_http_402_maps_to_insufficient_balance(respx_mock: respx.Router) -> None:
    respx_mock.post(f"{MOCK_BASE_URL}/api/v3/tasks/create").mock(
        return_value=fixture_response("errors/402_insufficient_balance.json", 402)
    )
    with pytest.raises(ApizInsufficientBalanceError):
        _client().tasks.create(model="wan/v2.6/image-to-video", params={"prompt": "x"})


@respx.mock(assert_all_called=False)
def test_http_422_validation_error_carries_schema(respx_mock: respx.Router) -> None:
    respx_mock.post(f"{MOCK_BASE_URL}/api/v3/tasks/create").mock(
        return_value=fixture_response("errors/422_validation_error.json", 422)
    )
    with pytest.raises(ApizValidationError) as exc:
        _client().tasks.create(model="fal-ai/flux-2/flash", params={})
    assert exc.value.status == 422
    assert exc.value.detail is not None


@respx.mock(assert_all_called=False)
def test_http_500_maps_to_server_error(respx_mock: respx.Router) -> None:
    respx_mock.get(f"{MOCK_BASE_URL}/api/v3/balance").mock(
        return_value=fixture_response("errors/500_server_error.json", 500)
    )
    with pytest.raises(ApizServerError):
        _client().account.balance()

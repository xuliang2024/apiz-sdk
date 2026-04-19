"""Shared pytest fixtures for the apiz Python test suite."""

from __future__ import annotations

import os
from collections.abc import Iterator

import pytest


@pytest.fixture(autouse=True)
def _strip_proxy_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Remove machine-specific proxy env vars so httpx doesn't try to load
    optional `socksio` etc when running tests."""
    for key in (
        "ALL_PROXY",
        "all_proxy",
        "HTTP_PROXY",
        "http_proxy",
        "HTTPS_PROXY",
        "https_proxy",
        "NO_PROXY",
        "no_proxy",
    ):
        monkeypatch.delenv(key, raising=False)


@pytest.fixture
def fake_api_key() -> str:
    """A non-real, deterministic API key for unit tests."""
    return "sk-unit-test-placeholder-not-real"


@pytest.fixture
def isolated_env(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Strip apiz-related env vars so client construction defaults are testable."""
    for key in ("APIZ_API_KEY", "APIZ_BASE_URL", "APIZ_TIMEOUT", "XSKILL_API_KEY"):
        monkeypatch.delenv(key, raising=False)
    yield


def pytest_collection_modifyitems(
    config: pytest.Config,
    items: list[pytest.Item],
) -> None:
    del config
    """Skip e2e tests automatically when APIZ_TEST_API_KEY is not set."""
    if os.environ.get("APIZ_TEST_API_KEY"):
        return
    skip_e2e = pytest.mark.skip(reason="APIZ_TEST_API_KEY not set; skipping live-backend tests")
    for item in items:
        if "e2e" in item.keywords:
            item.add_marker(skip_e2e)

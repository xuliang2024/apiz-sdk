"""Phase 1B smoke tests for ``apiz``: prove the package imports and constructs."""

from __future__ import annotations

import re

import apiz
from apiz import Apiz, AsyncApiz


def test_version_format() -> None:
    assert re.match(r"^\d+\.\d+\.\d+", apiz.__version__)


def test_sync_client_defaults(isolated_env: None, fake_api_key: str) -> None:
    client = Apiz(api_key=fake_api_key)
    assert client.api_key == fake_api_key
    assert client.base_url == "https://api.apiz.ai"
    assert client.timeout == 60.0


def test_async_client_defaults(isolated_env: None, fake_api_key: str) -> None:
    client = AsyncApiz(api_key=fake_api_key)
    assert client.api_key == fake_api_key
    assert client.base_url == "https://api.apiz.ai"


def test_env_var_apiz_api_key(monkeypatch: object, isolated_env: None) -> None:
    import os

    os.environ["APIZ_API_KEY"] = "sk-from-env-not-real"
    try:
        client = Apiz()
        assert client.api_key == "sk-from-env-not-real"
    finally:
        del os.environ["APIZ_API_KEY"]


def test_legacy_xskill_api_key_env(isolated_env: None) -> None:
    import os

    os.environ["XSKILL_API_KEY"] = "sk-legacy-not-real"
    try:
        client = Apiz()
        assert client.api_key == "sk-legacy-not-real"
    finally:
        del os.environ["XSKILL_API_KEY"]


def test_custom_base_url(isolated_env: None, fake_api_key: str) -> None:
    client = Apiz(api_key=fake_api_key, base_url="https://test-ts-api.fyshark.com")
    assert client.base_url == "https://test-ts-api.fyshark.com"

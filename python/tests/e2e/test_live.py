"""Live E2E suite — runs only when APIZ_TEST_API_KEY is set in the env. Hits
``https://api.apiz.ai`` with the provided test key. Stays within the
"free + ≤ 0.1 yuan" whitelist documented in tests/fixtures/README.md.
"""

from __future__ import annotations

import os

import pytest

from apiz import Apiz, ApizError

pytestmark = pytest.mark.e2e


@pytest.fixture
def live_client() -> Apiz:
    api_key = os.environ.get("APIZ_TEST_API_KEY")
    if not api_key:
        pytest.skip("APIZ_TEST_API_KEY not set")
    return Apiz(api_key=api_key, base_url=os.environ.get("APIZ_BASE_URL") or "https://api.apiz.ai")


def test_account_balance(live_client: Apiz) -> None:
    b = live_client.account.balance()
    assert isinstance(b.balance, (int, float))
    assert b.balance >= 0


def test_account_checkin_does_not_throw(live_client: Apiz) -> None:
    r = live_client.account.checkin()
    assert isinstance(r.success, bool)


def test_models_list(live_client: Apiz) -> None:
    models = live_client.models.list(category="image")
    assert len(models) > 0
    assert models[0].id


def test_models_docs(live_client: Apiz) -> None:
    docs = live_client.models.docs("jimeng-4.5", lang="en")
    assert isinstance(docs.tutorial, str)


def test_voices_list(live_client: Apiz) -> None:
    r = live_client.voices.list()
    assert r.statistics.public_voices_count > 0


def test_skills_list(live_client: Apiz) -> None:
    skills = live_client.skills.list()
    assert len(skills) > 0


def test_tools_parse_video(live_client: Apiz) -> None:
    try:
        r = live_client.tools.parse_video("https://v.douyin.com/iJqPAfre/")
        assert r.video_url.startswith("http")
    except ApizError:
        # tolerate transient parsing failures
        pass


def test_generate_jimeng_sync(live_client: Apiz) -> None:
    """1 jimeng-4.5 image (≤ 0.1 yuan)."""
    result = live_client.generate(
        model="jimeng-4.5",
        prompt="a small grayscale cat sketch, simple",
    )
    assert result.status == "completed"


def test_speak_short_turbo(live_client: Apiz) -> None:
    """1 short TTS with speech-2.8-turbo (≤ 0.1 yuan)."""
    r = live_client.speak("hello", model="speech-2.8-turbo")
    assert r.audio_url.startswith("http")

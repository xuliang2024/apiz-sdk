from __future__ import annotations

import pytest
import respx

from apiz import Apiz, AsyncApiz

from ..helpers import MOCK_BASE_URL, TEST_API_KEY, fixture_response, install_default_routes


def _sync_client() -> Apiz:
    return Apiz(api_key=TEST_API_KEY, base_url=MOCK_BASE_URL, max_retries=0)


def _async_client() -> AsyncApiz:
    return AsyncApiz(api_key=TEST_API_KEY, base_url=MOCK_BASE_URL, max_retries=0)


# ---------- Models (sync) ----------


@respx.mock(assert_all_called=False)
def test_sync_models_list(respx_mock: respx.Router) -> None:
    install_default_routes(respx_mock)
    models = _sync_client().models.list()
    assert len(models) > 0
    assert models[0].id


@respx.mock(assert_all_called=False)
def test_sync_models_get(respx_mock: respx.Router) -> None:
    install_default_routes(respx_mock)
    detail = _sync_client().models.get("fal-ai/flux-2/flash")
    assert detail.id == "fal-ai/flux-2/flash"
    assert detail.params_schema is not None


@respx.mock(assert_all_called=False)
def test_sync_models_docs(respx_mock: respx.Router) -> None:
    install_default_routes(respx_mock)
    docs = _sync_client().models.docs("fal-ai/flux-2/flash", lang="en")
    assert "Flux 2 Flash" in docs.tutorial


@respx.mock(assert_all_called=False)
def test_sync_models_search_filters(respx_mock: respx.Router) -> None:
    install_default_routes(respx_mock)
    flux = _sync_client().models.search(query="flux")
    assert flux and "flux" in flux[0].id.lower()
    t2i = _sync_client().models.search(capability="t2i")
    assert all(m.capability == "t2i" for m in t2i)


# ---------- Account (sync + async) ----------


@respx.mock(assert_all_called=False)
def test_sync_account_balance(respx_mock: respx.Router) -> None:
    install_default_routes(respx_mock)
    b = _sync_client().account.balance()
    assert isinstance(b.user_id, int)
    assert b.balance >= 0
    assert b.balance_yuan >= 0


@respx.mock(assert_all_called=False)
def test_sync_account_checkin_success(respx_mock: respx.Router) -> None:
    install_default_routes(respx_mock)
    r = _sync_client().account.checkin()
    assert r.success is True
    assert r.points_awarded and r.points_awarded > 0


@respx.mock(assert_all_called=False)
def test_sync_account_checkin_already(respx_mock: respx.Router) -> None:
    respx_mock.post(f"{MOCK_BASE_URL}/api/v3/checkin").mock(
        return_value=fixture_response("http/POST__v3_checkin__already.json")
    )
    r = _sync_client().account.checkin()
    assert r.success is False
    assert r.already_checked_in is True


@pytest.mark.asyncio
@respx.mock(assert_all_called=False)
async def test_async_account_balance(respx_mock: respx.Router) -> None:
    install_default_routes(respx_mock)
    async with _async_client() as client:
        b = await client.account.balance()
        assert b.balance >= 0


# ---------- Voices ----------


@respx.mock(assert_all_called=False)
def test_sync_voices_list(respx_mock: respx.Router) -> None:
    install_default_routes(respx_mock)
    r = _sync_client().voices.list()
    assert r.statistics.public_voices_count > 0


@respx.mock(assert_all_called=False)
def test_sync_voices_synthesize(respx_mock: respx.Router) -> None:
    install_default_routes(respx_mock)
    r = _sync_client().voices.synthesize(
        text="你好", voice_id="male-qn-qingse", model="speech-2.8-turbo"
    )
    assert r.audio_url.startswith("http")


# ---------- Skills + Tools ----------


@respx.mock(assert_all_called=False)
def test_sync_skills_list(respx_mock: respx.Router) -> None:
    install_default_routes(respx_mock)
    skills = _sync_client().skills.list()
    assert skills and skills[0].id


@respx.mock(assert_all_called=False)
def test_sync_tools_parse_video(respx_mock: respx.Router) -> None:
    install_default_routes(respx_mock)
    r = _sync_client().tools.parse_video("https://v.douyin.com/example")
    assert r.video_url.startswith("http")


@respx.mock(assert_all_called=False)
def test_sync_tools_transfer_url(respx_mock: respx.Router) -> None:
    install_default_routes(respx_mock)
    r = _sync_client().tools.transfer_url("https://example.com/external/image.png")
    assert r.cdn_url.startswith("http")
    assert r.original_url == "https://example.com/external/image.png"
    assert r.type == "image"

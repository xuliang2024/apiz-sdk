from __future__ import annotations

import json

import pytest
import respx

from apiz import Apiz, AsyncApiz

from ..helpers import MOCK_BASE_URL, TEST_API_KEY, fixture_response, install_default_routes


def _sync() -> Apiz:
    return Apiz(api_key=TEST_API_KEY, base_url=MOCK_BASE_URL, max_retries=0)


def _async() -> AsyncApiz:
    return AsyncApiz(api_key=TEST_API_KEY, base_url=MOCK_BASE_URL, max_retries=0)


# ---------- generate ----------


@respx.mock(assert_all_called=False)
def test_generate_sync_model_returns_inline(respx_mock: respx.Router) -> None:
    respx_mock.post(f"{MOCK_BASE_URL}/api/v3/tasks/create").mock(
        return_value=fixture_response("http/POST__v3_tasks_create__sync.json")
    )
    queries = {"n": 0}
    respx_mock.post(f"{MOCK_BASE_URL}/api/v3/tasks/query").mock(
        side_effect=lambda _r: (
            queries.update({"n": queries["n"] + 1})
            or fixture_response("http/POST__v3_tasks_query__completed.json")
        )
    )
    result = _sync().generate(model="jimeng-4.5", prompt="ink painting")
    assert result.status == "completed"
    assert queries["n"] == 0


@respx.mock(assert_all_called=False)
def test_generate_async_model_polls(respx_mock: respx.Router) -> None:
    respx_mock.post(f"{MOCK_BASE_URL}/api/v3/tasks/create").mock(
        return_value=fixture_response("http/POST__v3_tasks_create__async.json")
    )
    queries = {"n": 0}

    def _query(_r):  # type: ignore[no-untyped-def]
        queries["n"] += 1
        if queries["n"] < 2:
            return fixture_response("http/POST__v3_tasks_query__processing.json")
        return fixture_response("http/POST__v3_tasks_query__completed.json")

    respx_mock.post(f"{MOCK_BASE_URL}/api/v3/tasks/query").mock(side_effect=_query)

    result = _sync().generate(
        model="wan/v2.6/image-to-video",
        prompt="x",
        poll_interval=0.001,
    )
    assert result.status == "completed"
    assert queries["n"] >= 2


@respx.mock(assert_all_called=False)
def test_generate_forwards_extra_params(respx_mock: respx.Router) -> None:
    captured: dict[str, object] = {}

    def _create(request):  # type: ignore[no-untyped-def]
        captured["body"] = json.loads(request.content)
        return fixture_response("http/POST__v3_tasks_create__sync.json")

    respx_mock.post(f"{MOCK_BASE_URL}/api/v3/tasks/create").mock(side_effect=_create)

    _sync().generate(
        model="wan/v2.6/image-to-video",
        prompt="go",
        image_url="https://x",
        duration=5,
        aspect_ratio="16:9",
    )
    body = captured["body"]
    assert isinstance(body, dict)
    params = body["params"]  # type: ignore[index]
    assert params["prompt"] == "go"
    assert params["image_url"] == "https://x"
    assert params["duration"] == 5
    assert params["aspect_ratio"] == "16:9"


# ---------- speak ----------


@respx.mock(assert_all_called=False)
def test_speak_with_explicit_voice_id(respx_mock: respx.Router) -> None:
    install_default_routes(respx_mock)
    r = _sync().speak("你好世界", voice_id="male-qn-qingse")
    assert r.audio_url.startswith("http")


@respx.mock(assert_all_called=False)
def test_speak_without_voice_id_picks_default(respx_mock: respx.Router) -> None:
    install_default_routes(respx_mock)
    r = _sync().speak("hi")
    assert r.audio_url.startswith("http")


# ---------- async generate ----------


@pytest.mark.asyncio
@respx.mock(assert_all_called=False)
async def test_async_generate_polls(respx_mock: respx.Router) -> None:
    respx_mock.post(f"{MOCK_BASE_URL}/api/v3/tasks/create").mock(
        return_value=fixture_response("http/POST__v3_tasks_create__async.json")
    )
    queries = {"n": 0}

    def _query(_r):  # type: ignore[no-untyped-def]
        queries["n"] += 1
        if queries["n"] < 2:
            return fixture_response("http/POST__v3_tasks_query__processing.json")
        return fixture_response("http/POST__v3_tasks_query__completed.json")

    respx_mock.post(f"{MOCK_BASE_URL}/api/v3/tasks/query").mock(side_effect=_query)

    async with _async() as client:
        result = await client.generate(
            model="wan/v2.6/image-to-video",
            prompt="x",
            poll_interval=0.001,
        )
    assert result.status == "completed"
    assert queries["n"] >= 2

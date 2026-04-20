"""Contract tests for the captioning / forced-alignment helper."""
# Captioning tests use real Chinese subtitle text containing fullwidth commas,
# which is exactly what the API receives end-to-end — keep them as-is.
# ruff: noqa: RUF001

from __future__ import annotations

import pytest
import respx

from apiz import Apiz, AsyncApiz, parse_align_result
from apiz._types import TaskQueryResponse

from ..helpers import (
    MOCK_BASE_URL,
    TEST_API_KEY,
    fixture_response,
    install_default_routes,
)

SPEECH_MODEL = "volcengine/captioning/ata-speech"
SINGING_MODEL = "volcengine/captioning/ata-singing"
TEST_AUDIO_URL = (
    "https://fal-task-hk.tos-cn-hongkong.volces.com/transfer/audio/2026/04/20/"
    "619fa17492bf40079afe2ee5e43aa42b.mp3"
)
TEST_AUDIO_TEXT = "如果您没有其他需要举报的话，这边就先挂断了。祝您生活愉快，再见。"


def _make_sync_client() -> Apiz:
    return Apiz(api_key=TEST_API_KEY, base_url=MOCK_BASE_URL, max_retries=0)


def _make_async_client() -> AsyncApiz:
    return AsyncApiz(api_key=TEST_API_KEY, base_url=MOCK_BASE_URL, max_retries=0)


def _install_captioning_routes(router: respx.Router) -> None:
    """Install routes that return the captioning fixtures (overriding defaults)."""
    install_default_routes(router)
    # Override the generic create + query routes to serve captioning fixtures.
    router.post(f"{MOCK_BASE_URL}/api/v3/tasks/create").mock(
        return_value=fixture_response("http/POST__v3_tasks_create__captioning.json")
    )
    router.post(f"{MOCK_BASE_URL}/api/v3/tasks/query").mock(
        return_value=fixture_response("http/POST__v3_tasks_query__captioning_completed.json")
    )


def test_model_for_picks_correct_backend_id() -> None:
    client = _make_sync_client()
    assert client.captioning.model_for("speech") == SPEECH_MODEL
    assert client.captioning.model_for("singing") == SINGING_MODEL
    assert client.captioning.model_for(None) == SPEECH_MODEL


@respx.mock(assert_all_called=False)
def test_sync_captioning_create_returns_task(respx_mock: respx.Router) -> None:
    _install_captioning_routes(respx_mock)
    client = _make_sync_client()
    r = client.captioning.create(
        {"audio_url": TEST_AUDIO_URL, "audio_text": TEST_AUDIO_TEXT, "mode": "speech"}
    )
    assert r.task_id == "task_volc_ata_001"
    assert r.price == 10
    assert r.model == SPEECH_MODEL


@respx.mock(assert_all_called=False)
def test_sync_align_returns_structured_result(respx_mock: respx.Router) -> None:
    _install_captioning_routes(respx_mock)
    client = _make_sync_client()

    r = client.align(
        {"audio_url": TEST_AUDIO_URL, "audio_text": TEST_AUDIO_TEXT, "mode": "speech"},
        poll_interval=0.01,
        timeout=5.0,
    )

    assert r.duration == 5.503
    assert r.task_id == "task_volc_ata_001"
    assert len(r.utterances) == 3

    expected = [
        ("如果您没有其他需要举报的话", 13),
        ("这边就先挂断了", 7),
        ("祝您生活愉快，再见", 9),
    ]
    for utt, (text, n_words) in zip(r.utterances, expected):
        assert utt.text == text
        assert len(utt.words) == n_words

    # Word-level timestamp sanity
    for utt in r.utterances:
        last_end = -1
        for w in utt.words:
            assert w.start_time >= 0
            assert w.end_time >= w.start_time
            assert w.end_time <= 5510
            assert w.start_time >= last_end - 1
            last_end = max(last_end, w.end_time)


@pytest.mark.asyncio
@respx.mock(assert_all_called=False)
async def test_async_align_returns_structured_result(respx_mock: respx.Router) -> None:
    _install_captioning_routes(respx_mock)
    client = _make_async_client()

    r = await client.align(
        {"audio_url": TEST_AUDIO_URL, "audio_text": TEST_AUDIO_TEXT, "mode": "speech"},
        poll_interval=0.01,
        timeout=5.0,
    )
    assert r.task_id == "task_volc_ata_001"
    assert len(r.utterances) == 3
    assert r.utterances[0].words[0].text == "如"


def test_parse_align_result_handles_synthetic_response() -> None:
    fake = TaskQueryResponse.model_validate(
        {
            "task_id": "task_x",
            "status": "completed",
            "result": {
                "duration": 1.0,
                "utterances": [
                    {
                        "text": "你好",
                        "start_time": 0,
                        "end_time": 500,
                        "words": [{"text": "你", "start_time": 0, "end_time": 250}],
                    }
                ],
            },
        }
    )
    r = parse_align_result(fake)
    assert r.duration == 1.0
    assert r.task_id == "task_x"
    assert r.utterances[0].text == "你好"

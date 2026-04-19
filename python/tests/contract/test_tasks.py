from __future__ import annotations

import pytest
import respx
from httpx import Response

from apiz import Apiz, ApizError, ApizTimeoutError, AsyncApiz

from ..helpers import (
    MOCK_BASE_URL,
    TEST_API_KEY,
    fixture_response,
    install_default_routes,
)


def _make_sync_client() -> Apiz:
    return Apiz(api_key=TEST_API_KEY, base_url=MOCK_BASE_URL, max_retries=0)


def _make_async_client() -> AsyncApiz:
    return AsyncApiz(api_key=TEST_API_KEY, base_url=MOCK_BASE_URL, max_retries=0)


# ---------- Sync ----------


@respx.mock(assert_all_called=False)
def test_sync_create_returns_task_id(respx_mock: respx.Router) -> None:
    install_default_routes(respx_mock)
    client = _make_sync_client()
    task = client.tasks.create(
        model="wan/v2.6/image-to-video",
        params={"prompt": "x"},
    )
    assert task.task_id == "task_async_demo_001"
    assert task.status == "pending"


@respx.mock(assert_all_called=False)
def test_sync_create_with_sync_model_returns_completed(respx_mock: respx.Router) -> None:
    install_default_routes(respx_mock)
    client = _make_sync_client()
    task = client.tasks.create(model="jimeng-4.5", params={"prompt": "x"})
    assert task.status == "completed"
    assert task.result is not None


@respx.mock(assert_all_called=False)
def test_sync_query_returns_status(respx_mock: respx.Router) -> None:
    install_default_routes(respx_mock)
    client = _make_sync_client()
    status = client.tasks.query("task_async_demo_001")
    assert status.task_id == "task_async_demo_001"
    assert status.status in {"pending", "processing", "completed", "failed"}


@respx.mock(assert_all_called=False)
def test_sync_create_attaches_bearer(respx_mock: respx.Router) -> None:
    captured: dict[str, str | None] = {}

    def _capture(request):  # type: ignore[no-untyped-def]
        captured["auth"] = request.headers.get("authorization")
        return fixture_response("http/POST__v3_tasks_create__async.json")

    respx_mock.post(f"{MOCK_BASE_URL}/api/v3/tasks/create").mock(side_effect=_capture)
    client = _make_sync_client()
    client.tasks.create(model="fal-ai/flux-2/flash", params={"prompt": "x"})
    assert captured["auth"] == f"Bearer {TEST_API_KEY}"


@respx.mock(assert_all_called=False)
def test_sync_wait_for_polls_until_completed(respx_mock: respx.Router) -> None:
    calls = {"n": 0}

    def _query(_request):  # type: ignore[no-untyped-def]
        calls["n"] += 1
        if calls["n"] == 1:
            return fixture_response("http/POST__v3_tasks_query__pending.json")
        if calls["n"] == 2:
            return fixture_response("http/POST__v3_tasks_query__processing.json")
        return fixture_response("http/POST__v3_tasks_query__completed.json")

    respx_mock.post(f"{MOCK_BASE_URL}/api/v3/tasks/query").mock(side_effect=_query)
    client = _make_sync_client()
    result = client.tasks.wait_for("task_async_demo_001", poll_interval=0.001)
    assert result.status == "completed"
    assert calls["n"] >= 2


@respx.mock(assert_all_called=False)
def test_sync_wait_for_raises_on_failed(respx_mock: respx.Router) -> None:
    respx_mock.post(f"{MOCK_BASE_URL}/api/v3/tasks/query").mock(
        return_value=fixture_response("http/POST__v3_tasks_query__failed.json")
    )
    client = _make_sync_client()
    with pytest.raises(ApizError) as exc:
        client.tasks.wait_for("task_async_demo_001", poll_interval=0.001)
    assert "Upstream" in str(exc.value) or "failed" in str(exc.value).lower()


@respx.mock(assert_all_called=False)
def test_sync_wait_for_respects_timeout(respx_mock: respx.Router) -> None:
    respx_mock.post(f"{MOCK_BASE_URL}/api/v3/tasks/query").mock(
        return_value=fixture_response("http/POST__v3_tasks_query__pending.json")
    )
    client = _make_sync_client()
    with pytest.raises(ApizTimeoutError):
        client.tasks.wait_for("task_async_demo_001", poll_interval=0.05, timeout=0.005)


@respx.mock(assert_all_called=False)
def test_sync_wait_for_invokes_on_progress(respx_mock: respx.Router) -> None:
    calls = {"n": 0}

    def _query(_request):  # type: ignore[no-untyped-def]
        calls["n"] += 1
        if calls["n"] < 3:
            return fixture_response("http/POST__v3_tasks_query__processing.json")
        return fixture_response("http/POST__v3_tasks_query__completed.json")

    respx_mock.post(f"{MOCK_BASE_URL}/api/v3/tasks/query").mock(side_effect=_query)
    client = _make_sync_client()
    observed: list[str] = []
    result = client.tasks.wait_for(
        "task_async_demo_001",
        poll_interval=0.001,
        on_progress=lambda s: observed.append(s.status),
    )
    assert result.status == "completed"
    assert observed[-1] == "completed"
    assert len(observed) >= 2


# ---------- Async ----------


@pytest.mark.asyncio
@respx.mock(assert_all_called=False)
async def test_async_create_and_query(respx_mock: respx.Router) -> None:
    install_default_routes(respx_mock)
    async with _make_async_client() as client:
        task = await client.tasks.create(
            model="wan/v2.6/image-to-video",
            params={"prompt": "x"},
        )
        assert task.task_id == "task_async_demo_001"
        status = await client.tasks.query(task.task_id)
        assert status.task_id == task.task_id


@pytest.mark.asyncio
@respx.mock(assert_all_called=False)
async def test_async_wait_for_polls_until_completed(respx_mock: respx.Router) -> None:
    calls = {"n": 0}

    def _query(_request):  # type: ignore[no-untyped-def]
        calls["n"] += 1
        if calls["n"] < 3:
            return fixture_response("http/POST__v3_tasks_query__processing.json")
        return fixture_response("http/POST__v3_tasks_query__completed.json")

    respx_mock.post(f"{MOCK_BASE_URL}/api/v3/tasks/query").mock(side_effect=_query)
    async with _make_async_client() as client:
        result = await client.tasks.wait_for("task_async_demo_001", poll_interval=0.001)
        assert result.status == "completed"
        assert calls["n"] >= 2


# Touch unused symbols so flake-style lints stay happy.
_ = Response

from __future__ import annotations

import asyncio
import time
from typing import Any, Callable, Optional

from .._errors import ApizError, ApizTimeoutError
from .._http import AsyncHttpClient, SyncHttpClient
from .._types import Channel, TaskCreateResponse, TaskQueryResponse

DEFAULT_POLL_INTERVAL = 5.0
DEFAULT_WAIT_TIMEOUT = 600.0


def _create_body(
    model: str,
    params: dict[str, Any],
    channel: Optional[Channel],
    callback_url: Optional[str],
) -> dict[str, Any]:
    return {
        "model": model,
        "params": params,
        "channel": channel,
        "callback_url": callback_url,
    }


class TasksResource:
    def __init__(self, http: SyncHttpClient) -> None:
        self._http = http

    def create(
        self,
        *,
        model: str,
        params: dict[str, Any],
        channel: Optional[Channel] = None,
        callback_url: Optional[str] = None,
    ) -> TaskCreateResponse:
        data = self._http.request(
            "POST",
            "/api/v3/tasks/create",
            body=_create_body(model, params, channel, callback_url),
        )
        return TaskCreateResponse.model_validate(data)

    def query(self, task_id: str) -> TaskQueryResponse:
        data = self._http.request("POST", "/api/v3/tasks/query", body={"task_id": task_id})
        return TaskQueryResponse.model_validate(data)

    def get(self, task_id: str) -> TaskQueryResponse:
        from urllib.parse import quote

        data = self._http.request("GET", f"/api/v3/tasks/{quote(task_id, safe='')}")
        return TaskQueryResponse.model_validate(data)

    def wait_for(
        self,
        task_id: str,
        *,
        poll_interval: float = DEFAULT_POLL_INTERVAL,
        timeout: float = DEFAULT_WAIT_TIMEOUT,
        on_progress: Optional[Callable[[TaskQueryResponse], None]] = None,
    ) -> TaskQueryResponse:
        start = time.monotonic()
        while True:
            status = self.query(task_id)
            if on_progress is not None:
                try:
                    on_progress(status)
                except Exception:
                    pass
            if status.status == "completed":
                return status
            if status.status == "failed":
                raise ApizError(status.error or f"Task {task_id} failed", detail=status.model_dump())
            if time.monotonic() - start + poll_interval > timeout:
                raise ApizTimeoutError(
                    f"Task {task_id} timed out after {timeout}s (last status: {status.status})",
                    detail=status.model_dump(),
                )
            time.sleep(poll_interval)


class AsyncTasksResource:
    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def create(
        self,
        *,
        model: str,
        params: dict[str, Any],
        channel: Optional[Channel] = None,
        callback_url: Optional[str] = None,
    ) -> TaskCreateResponse:
        data = await self._http.request(
            "POST",
            "/api/v3/tasks/create",
            body=_create_body(model, params, channel, callback_url),
        )
        return TaskCreateResponse.model_validate(data)

    async def query(self, task_id: str) -> TaskQueryResponse:
        data = await self._http.request(
            "POST", "/api/v3/tasks/query", body={"task_id": task_id}
        )
        return TaskQueryResponse.model_validate(data)

    async def get(self, task_id: str) -> TaskQueryResponse:
        from urllib.parse import quote

        data = await self._http.request("GET", f"/api/v3/tasks/{quote(task_id, safe='')}")
        return TaskQueryResponse.model_validate(data)

    async def wait_for(
        self,
        task_id: str,
        *,
        poll_interval: float = DEFAULT_POLL_INTERVAL,
        timeout: float = DEFAULT_WAIT_TIMEOUT,
        on_progress: Optional[Callable[[TaskQueryResponse], None]] = None,
    ) -> TaskQueryResponse:
        loop = asyncio.get_running_loop()
        start = loop.time()
        while True:
            status = await self.query(task_id)
            if on_progress is not None:
                try:
                    on_progress(status)
                except Exception:
                    pass
            if status.status == "completed":
                return status
            if status.status == "failed":
                raise ApizError(status.error or f"Task {task_id} failed", detail=status.model_dump())
            if loop.time() - start + poll_interval > timeout:
                raise ApizTimeoutError(
                    f"Task {task_id} timed out after {timeout}s (last status: {status.status})",
                    detail=status.model_dump(),
                )
            await asyncio.sleep(poll_interval)

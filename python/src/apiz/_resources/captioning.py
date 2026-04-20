"""Captioning / forced-alignment resource (sync + async)."""

from __future__ import annotations

from typing import Any, Optional, Union

from .._http import AsyncHttpClient, SyncHttpClient
from .._types import (
    AlignMode,
    AlignParams,
    AlignResult,
    AlignUtterance,
    AlignWord,
    TaskCreateResponse,
    TaskQueryResponse,
)

SPEECH_MODEL = "volcengine/captioning/ata-speech"
SINGING_MODEL = "volcengine/captioning/ata-singing"


def model_for(mode: Optional[AlignMode]) -> str:
    """Return the backend model id for a given mode (speech or singing)."""
    return SINGING_MODEL if mode == "singing" else SPEECH_MODEL


def _build_create_body(params: AlignParams) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "audio_url": params["audio_url"],
        "audio_text": params["audio_text"],
    }
    if params.get("sta_punc_mode") is not None:
        payload["sta_punc_mode"] = params["sta_punc_mode"]
    return {
        "model": model_for(params.get("mode")),
        "params": payload,
        "channel": None,
        "callback_url": None,
    }


def parse_align_result(
    response: Union[TaskCreateResponse, TaskQueryResponse],
) -> AlignResult:
    """Extract a structured AlignResult from a task create/query response."""
    raw = getattr(response, "result", None)
    if not isinstance(raw, dict):
        raise ValueError("apiz align: response missing result")

    utterances_raw = raw.get("utterances") or []
    utterances = [
        AlignUtterance(
            text=u.get("text", ""),
            start_time=int(u.get("start_time", 0)),
            end_time=int(u.get("end_time", 0)),
            words=[
                AlignWord(
                    text=w.get("text", ""),
                    start_time=int(w.get("start_time", 0)),
                    end_time=int(w.get("end_time", 0)),
                )
                for w in (u.get("words") or [])
            ],
        )
        for u in utterances_raw
    ]

    return AlignResult(
        duration=float(raw.get("duration", 0)),
        utterances=utterances,
        task_id=response.task_id,
        price=getattr(response, "price", None),
    )


class CaptioningResource:
    """Synchronous captioning resource (low-level, prefer ``client.align``)."""

    def __init__(self, http: SyncHttpClient) -> None:
        self._http = http

    def create(self, params: AlignParams) -> TaskCreateResponse:
        data = self._http.request("POST", "/api/v3/tasks/create", body=_build_create_body(params))
        return TaskCreateResponse.model_validate(data)

    def model_for(self, mode: Optional[AlignMode]) -> str:
        return model_for(mode)


class AsyncCaptioningResource:
    """Asynchronous captioning resource."""

    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def create(self, params: AlignParams) -> TaskCreateResponse:
        data = await self._http.request(
            "POST", "/api/v3/tasks/create", body=_build_create_body(params)
        )
        return TaskCreateResponse.model_validate(data)

    def model_for(self, mode: Optional[AlignMode]) -> str:
        return model_for(mode)

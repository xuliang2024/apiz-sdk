"""Synchronous (non-async) generation endpoints. The module name is
``sync_gen`` to avoid clashing with python's stdlib ``sync`` semantics."""

from __future__ import annotations

from typing import Any, Optional

from .._http import AsyncHttpClient, SyncHttpClient
from .._types import (
    SyncImageResponse,
    SyncVideoResponse,
)


def _image_body(model: str, prompt: str, image_url: Optional[str], image_size: Optional[str], options: Optional[dict[str, Any]]) -> dict[str, Any]:
    body: dict[str, Any] = {"model": model, "prompt": prompt}
    if image_url is not None:
        body["image_url"] = image_url
    if image_size is not None:
        body["image_size"] = image_size
    if options:
        body["options"] = options
    return body


def _video_body(model: str, prompt: str, image_url: Optional[str], duration: Optional[float], aspect_ratio: Optional[str], options: Optional[dict[str, Any]]) -> dict[str, Any]:
    body: dict[str, Any] = {"model": model, "prompt": prompt}
    if image_url is not None:
        body["image_url"] = image_url
    if duration is not None:
        body["duration"] = duration
    if aspect_ratio is not None:
        body["aspect_ratio"] = aspect_ratio
    if options:
        body["options"] = options
    return body


class SyncGenResource:
    def __init__(self, http: SyncHttpClient) -> None:
        self._http = http

    def image(
        self,
        *,
        model: str,
        prompt: str,
        image_url: Optional[str] = None,
        image_size: Optional[str] = None,
        options: Optional[dict[str, Any]] = None,
    ) -> SyncImageResponse:
        data = self._http.request(
            "POST",
            "/api/v3/sync/image",
            body=_image_body(model, prompt, image_url, image_size, options),
        )
        return SyncImageResponse.model_validate(data)

    def video(
        self,
        *,
        model: str,
        prompt: str,
        image_url: Optional[str] = None,
        duration: Optional[float] = None,
        aspect_ratio: Optional[str] = None,
        options: Optional[dict[str, Any]] = None,
    ) -> SyncVideoResponse:
        data = self._http.request(
            "POST",
            "/api/v3/sync/video",
            body=_video_body(model, prompt, image_url, duration, aspect_ratio, options),
        )
        return SyncVideoResponse.model_validate(data)

    def models(self, *, media_type: str = "all") -> list[dict[str, Any]]:
        data = self._http.request("GET", "/api/v3/sync/models", query={"media_type": media_type})
        return (data or {}).get("models", [])

    def providers(self) -> list[dict[str, Any]]:
        data = self._http.request("GET", "/api/v3/sync/providers")
        return (data or {}).get("providers", [])


class AsyncSyncGenResource:
    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def image(
        self,
        *,
        model: str,
        prompt: str,
        image_url: Optional[str] = None,
        image_size: Optional[str] = None,
        options: Optional[dict[str, Any]] = None,
    ) -> SyncImageResponse:
        data = await self._http.request(
            "POST",
            "/api/v3/sync/image",
            body=_image_body(model, prompt, image_url, image_size, options),
        )
        return SyncImageResponse.model_validate(data)

    async def video(
        self,
        *,
        model: str,
        prompt: str,
        image_url: Optional[str] = None,
        duration: Optional[float] = None,
        aspect_ratio: Optional[str] = None,
        options: Optional[dict[str, Any]] = None,
    ) -> SyncVideoResponse:
        data = await self._http.request(
            "POST",
            "/api/v3/sync/video",
            body=_video_body(model, prompt, image_url, duration, aspect_ratio, options),
        )
        return SyncVideoResponse.model_validate(data)

    async def models(self, *, media_type: str = "all") -> list[dict[str, Any]]:
        data = await self._http.request(
            "GET", "/api/v3/sync/models", query={"media_type": media_type}
        )
        return (data or {}).get("models", [])

    async def providers(self) -> list[dict[str, Any]]:
        data = await self._http.request("GET", "/api/v3/sync/providers")
        return (data or {}).get("providers", [])

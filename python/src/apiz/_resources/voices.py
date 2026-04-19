from __future__ import annotations

from typing import Any, Optional
from urllib.parse import quote

from .._http import AsyncHttpClient, SyncHttpClient
from .._types import (
    SpeakModel,
    SynthesizeResponse,
    VoiceItem,
    VoiceListResponse,
)


class VoicesResource:
    def __init__(self, http: SyncHttpClient) -> None:
        self._http = http

    def list(self, *, status: str = "active") -> VoiceListResponse:
        data = self._http.request(
            "POST",
            "/api/v3/minimax/voices",
            query={"status": status},
            body={},
        )
        return VoiceListResponse.model_validate(data)

    def get(self, voice_id: str) -> VoiceItem:
        data = self._http.request(
            "GET", f"/api/v3/minimax/voices/{quote(voice_id, safe='')}"
        )
        return VoiceItem.model_validate(data)

    def update(
        self,
        voice_id: str,
        *,
        voice_name: Optional[str] = None,
        description: Optional[str] = None,
    ) -> VoiceItem:
        body: dict[str, Any] = {"voice_id": voice_id}
        if voice_name is not None:
            body["voice_name"] = voice_name
        if description is not None:
            body["description"] = description
        data = self._http.request("PATCH", "/api/v3/minimax/voices/update", body=body)
        return VoiceItem.model_validate(data)

    def synthesize(
        self,
        *,
        text: str,
        voice_id: str,
        model: SpeakModel = "speech-2.8-hd",
        speed: float = 1.0,
    ) -> SynthesizeResponse:
        data = self._http.request(
            "POST",
            "/api/v3/minimax/t2a",
            body={"text": text, "voice_id": voice_id, "model": model, "speed": speed},
        )
        return SynthesizeResponse.model_validate(data)

    def design(self, *, prompt: str, voice_name: Optional[str] = None) -> VoiceItem:
        body: dict[str, Any] = {"prompt": prompt}
        if voice_name is not None:
            body["voice_name"] = voice_name
        data = self._http.request("POST", "/api/v3/minimax/voice-design", body=body)
        return VoiceItem.model_validate(data)

    def clone(
        self,
        *,
        audio_url: Optional[str] = None,
        file_id: Optional[int] = None,
        voice_name: Optional[str] = None,
    ) -> VoiceItem:
        body: dict[str, Any] = {}
        if audio_url is not None:
            body["audio_url"] = audio_url
        if file_id is not None:
            body["file_id"] = file_id
        if voice_name is not None:
            body["voice_name"] = voice_name
        data = self._http.request("POST", "/api/v3/minimax/voice-clone", body=body)
        return VoiceItem.model_validate(data)

    def upload_audio(self, audio_url: str) -> dict[str, Any]:
        return self._http.request(
            "POST", "/api/v3/minimax/upload-audio", body={"audio_url": audio_url}
        )


class AsyncVoicesResource:
    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def list(self, *, status: str = "active") -> VoiceListResponse:
        data = await self._http.request(
            "POST",
            "/api/v3/minimax/voices",
            query={"status": status},
            body={},
        )
        return VoiceListResponse.model_validate(data)

    async def get(self, voice_id: str) -> VoiceItem:
        data = await self._http.request(
            "GET", f"/api/v3/minimax/voices/{quote(voice_id, safe='')}"
        )
        return VoiceItem.model_validate(data)

    async def update(
        self,
        voice_id: str,
        *,
        voice_name: Optional[str] = None,
        description: Optional[str] = None,
    ) -> VoiceItem:
        body: dict[str, Any] = {"voice_id": voice_id}
        if voice_name is not None:
            body["voice_name"] = voice_name
        if description is not None:
            body["description"] = description
        data = await self._http.request("PATCH", "/api/v3/minimax/voices/update", body=body)
        return VoiceItem.model_validate(data)

    async def synthesize(
        self,
        *,
        text: str,
        voice_id: str,
        model: SpeakModel = "speech-2.8-hd",
        speed: float = 1.0,
    ) -> SynthesizeResponse:
        data = await self._http.request(
            "POST",
            "/api/v3/minimax/t2a",
            body={"text": text, "voice_id": voice_id, "model": model, "speed": speed},
        )
        return SynthesizeResponse.model_validate(data)

    async def design(self, *, prompt: str, voice_name: Optional[str] = None) -> VoiceItem:
        body: dict[str, Any] = {"prompt": prompt}
        if voice_name is not None:
            body["voice_name"] = voice_name
        data = await self._http.request("POST", "/api/v3/minimax/voice-design", body=body)
        return VoiceItem.model_validate(data)

    async def clone(
        self,
        *,
        audio_url: Optional[str] = None,
        file_id: Optional[int] = None,
        voice_name: Optional[str] = None,
    ) -> VoiceItem:
        body: dict[str, Any] = {}
        if audio_url is not None:
            body["audio_url"] = audio_url
        if file_id is not None:
            body["file_id"] = file_id
        if voice_name is not None:
            body["voice_name"] = voice_name
        data = await self._http.request("POST", "/api/v3/minimax/voice-clone", body=body)
        return VoiceItem.model_validate(data)

    async def upload_audio(self, audio_url: str) -> dict[str, Any]:
        return await self._http.request(
            "POST", "/api/v3/minimax/upload-audio", body={"audio_url": audio_url}
        )

"""Top-level synchronous and asynchronous clients."""

from __future__ import annotations

from typing import Any, Callable, Optional, Union

import httpx

from ._helpers import generate_async, generate_sync, speak_async, speak_sync
from ._http import AsyncHttpClient, SyncHttpClient, resolve_config
from ._resources.account import AccountResource, AsyncAccountResource
from ._resources.models import AsyncModelsResource, ModelsResource
from ._resources.skills import AsyncSkillsResource, SkillsResource
from ._resources.sync_gen import AsyncSyncGenResource, SyncGenResource
from ._resources.tasks import AsyncTasksResource, TasksResource
from ._resources.tools import AsyncToolsResource, ToolsResource
from ._resources.voices import AsyncVoicesResource, VoicesResource
from ._types import (
    GenerateResult,
    SpeakModel,
    SynthesizeResponse,
    TaskQueryResponse,
)


class Apiz:
    """Synchronous client for the apiz.ai platform."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        *,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        max_retries: Optional[int] = None,
        default_headers: Optional[dict[str, str]] = None,
        http_client: Optional[httpx.Client] = None,
    ) -> None:
        self._config = resolve_config(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
            default_headers=default_headers,
        )
        self._http = SyncHttpClient(self._config, http_client=http_client)
        self.tasks = TasksResource(self._http)
        self.models = ModelsResource(self._http)
        self.voices = VoicesResource(self._http)
        self.account = AccountResource(self._http)
        self.skills = SkillsResource(self._http)
        self.tools = ToolsResource(self._http)
        self.sync = SyncGenResource(self._http)

    @property
    def api_key(self) -> str:
        return self._config.api_key

    @property
    def base_url(self) -> str:
        return self._config.base_url

    @property
    def timeout(self) -> float:
        return self._config.timeout

    def __enter__(self) -> Apiz:
        return self

    def __exit__(self, *_exc: Any) -> None:
        self.close()

    def close(self) -> None:
        self._http.close()

    def generate(
        self,
        *,
        model: str,
        prompt: str,
        image_url: Optional[str] = None,
        image_size: Optional[str] = None,
        aspect_ratio: Optional[str] = None,
        duration: Optional[Union[str, float]] = None,
        options: Optional[dict[str, Any]] = None,
        poll_interval: float = 5.0,
        timeout: float = 600.0,
        on_progress: Optional[Callable[[TaskQueryResponse], None]] = None,
    ) -> GenerateResult:
        return generate_sync(
            self,
            model=model,
            prompt=prompt,
            image_url=image_url,
            image_size=image_size,
            aspect_ratio=aspect_ratio,
            duration=duration,
            options=options,
            poll_interval=poll_interval,
            timeout=timeout,
            on_progress=on_progress,
        )

    def speak(
        self,
        text: str,
        *,
        voice_id: Optional[str] = None,
        model: SpeakModel = "speech-2.8-hd",
        speed: float = 1.0,
    ) -> SynthesizeResponse:
        return speak_sync(self, text, voice_id=voice_id, model=model, speed=speed)


class AsyncApiz:
    """Asynchronous client for the apiz.ai platform."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        *,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        max_retries: Optional[int] = None,
        default_headers: Optional[dict[str, str]] = None,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        self._config = resolve_config(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
            default_headers=default_headers,
        )
        self._http = AsyncHttpClient(self._config, http_client=http_client)
        self.tasks = AsyncTasksResource(self._http)
        self.models = AsyncModelsResource(self._http)
        self.voices = AsyncVoicesResource(self._http)
        self.account = AsyncAccountResource(self._http)
        self.skills = AsyncSkillsResource(self._http)
        self.tools = AsyncToolsResource(self._http)
        self.sync = AsyncSyncGenResource(self._http)

    @property
    def api_key(self) -> str:
        return self._config.api_key

    @property
    def base_url(self) -> str:
        return self._config.base_url

    @property
    def timeout(self) -> float:
        return self._config.timeout

    async def __aenter__(self) -> AsyncApiz:
        return self

    async def __aexit__(self, *_exc: Any) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        await self._http.aclose()

    async def generate(
        self,
        *,
        model: str,
        prompt: str,
        image_url: Optional[str] = None,
        image_size: Optional[str] = None,
        aspect_ratio: Optional[str] = None,
        duration: Optional[Union[str, float]] = None,
        options: Optional[dict[str, Any]] = None,
        poll_interval: float = 5.0,
        timeout: float = 600.0,
        on_progress: Optional[Callable[[TaskQueryResponse], None]] = None,
    ) -> GenerateResult:
        return await generate_async(
            self,
            model=model,
            prompt=prompt,
            image_url=image_url,
            image_size=image_size,
            aspect_ratio=aspect_ratio,
            duration=duration,
            options=options,
            poll_interval=poll_interval,
            timeout=timeout,
            on_progress=on_progress,
        )

    async def speak(
        self,
        text: str,
        *,
        voice_id: Optional[str] = None,
        model: SpeakModel = "speech-2.8-hd",
        speed: float = 1.0,
    ) -> SynthesizeResponse:
        return await speak_async(self, text, voice_id=voice_id, model=model, speed=speed)

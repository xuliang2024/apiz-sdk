"""High-level helpers: generate(), speak(), align() for sync and async clients."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Callable, Optional, Union

from ._errors import ApizError
from ._resources.captioning import parse_align_result
from ._types import (
    AlignParams,
    AlignResult,
    GenerateResult,
    SpeakModel,
    SynthesizeResponse,
    TaskCreateResponse,
    TaskQueryResponse,
)

if TYPE_CHECKING:
    from .client import Apiz, AsyncApiz


def _build_params(
    prompt: str,
    image_url: Optional[str],
    image_size: Optional[str],
    aspect_ratio: Optional[str],
    duration: Optional[Union[str, float]],
    extra: Optional[dict[str, Any]],
) -> dict[str, Any]:
    params: dict[str, Any] = {"prompt": prompt}
    if image_url is not None:
        params["image_url"] = image_url
    if image_size is not None:
        params["image_size"] = image_size
    if aspect_ratio is not None:
        params["aspect_ratio"] = aspect_ratio
    if duration is not None:
        params["duration"] = duration
    if extra:
        params.update(extra)
    return params


def generate_sync(
    client: Apiz,
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
    params = _build_params(prompt, image_url, image_size, aspect_ratio, duration, options)
    submitted: TaskCreateResponse = client.tasks.create(model=model, params=params)
    if submitted.status == "completed":
        return submitted
    return client.tasks.wait_for(
        submitted.task_id,
        poll_interval=poll_interval,
        timeout=timeout,
        on_progress=on_progress,
    )


async def generate_async(
    client: AsyncApiz,
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
    params = _build_params(prompt, image_url, image_size, aspect_ratio, duration, options)
    submitted = await client.tasks.create(model=model, params=params)
    if submitted.status == "completed":
        return submitted
    return await client.tasks.wait_for(
        submitted.task_id,
        poll_interval=poll_interval,
        timeout=timeout,
        on_progress=on_progress,
    )


def speak_sync(
    client: Apiz,
    text: str,
    *,
    voice_id: Optional[str] = None,
    model: SpeakModel = "speech-2.8-hd",
    speed: float = 1.0,
) -> SynthesizeResponse:
    if not voice_id:
        voices = client.voices.list()
        candidates = list(voices.public_voices) + list(voices.user_voices)
        if not candidates:
            raise ApizError("No voice_id specified and no public voices available.")
        voice_id = candidates[0].voice_id
    return client.voices.synthesize(text=text, voice_id=voice_id, model=model, speed=speed)


async def speak_async(
    client: AsyncApiz,
    text: str,
    *,
    voice_id: Optional[str] = None,
    model: SpeakModel = "speech-2.8-hd",
    speed: float = 1.0,
) -> SynthesizeResponse:
    if not voice_id:
        voices = await client.voices.list()
        candidates = list(voices.public_voices) + list(voices.user_voices)
        if not candidates:
            raise ApizError("No voice_id specified and no public voices available.")
        voice_id = candidates[0].voice_id
    return await client.voices.synthesize(
        text=text, voice_id=voice_id, model=model, speed=speed
    )


# ---------- align (forced alignment) ----------


def align_sync(
    client: Apiz,
    params: AlignParams,
    *,
    poll_interval: float = 2.0,
    timeout: float = 300.0,
    on_progress: Optional[Callable[[TaskQueryResponse], None]] = None,
) -> AlignResult:
    submitted: TaskCreateResponse = client.captioning.create(params)
    if submitted.status == "completed" and submitted.result is not None:
        return parse_align_result(submitted)
    if not submitted.task_id:
        raise ApizError("apiz align: backend returned no task_id")
    final = client.tasks.wait_for(
        submitted.task_id,
        poll_interval=poll_interval,
        timeout=timeout,
        on_progress=on_progress,
    )
    return parse_align_result(final)


async def align_async(
    client: AsyncApiz,
    params: AlignParams,
    *,
    poll_interval: float = 2.0,
    timeout: float = 300.0,
    on_progress: Optional[Callable[[TaskQueryResponse], None]] = None,
) -> AlignResult:
    submitted = await client.captioning.create(params)
    if submitted.status == "completed" and submitted.result is not None:
        return parse_align_result(submitted)
    if not submitted.task_id:
        raise ApizError("apiz align: backend returned no task_id")
    final = await client.tasks.wait_for(
        submitted.task_id,
        poll_interval=poll_interval,
        timeout=timeout,
        on_progress=on_progress,
    )
    return parse_align_result(final)

"""Typed response models (Pydantic) and request TypedDicts for the apiz SDK."""

from __future__ import annotations

from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict
from typing_extensions import NotRequired, TypedDict

# ---------- Tasks ----------

TaskStatus = Literal["pending", "processing", "completed", "failed"]
Channel = Literal["api", "mcp", "sync"]


class TaskCreateParams(TypedDict, total=False):
    model: str
    params: dict[str, Any]
    channel: NotRequired[Optional[Channel]]
    callback_url: NotRequired[Optional[str]]


class TaskResponseBase(BaseModel):
    model_config = ConfigDict(extra="allow")

    task_id: str
    status: TaskStatus
    channel: Optional[str] = None
    model: Optional[str] = None
    progress: Optional[float] = None
    result: Optional[Any] = None
    error: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: Optional[str] = None
    price: Optional[float] = None


class TaskCreateResponse(TaskResponseBase):
    pass


class TaskQueryResponse(TaskResponseBase):
    pass


# ---------- Models ----------

ModelCategory = Literal["image", "video", "audio", "all"]
ModelCapability = Literal["t2i", "i2i", "t2v", "i2v", "v2v", "t2a", "stt", "i2t", "v2t"]


class ModelStats(BaseModel):
    model_config = ConfigDict(extra="allow")

    success_rate: Optional[float] = None
    pending_tasks: Optional[int] = None
    processing_tasks: Optional[int] = None


class ModelPricing(BaseModel):
    model_config = ConfigDict(extra="allow")

    unit: str
    amount: float


class ModelSummary(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    name: str
    category: str
    capability: Optional[str] = None
    cover_url: Optional[str] = None
    tags: Optional[list[str]] = None
    isHot: Optional[bool] = None
    stats: Optional[ModelStats] = None
    pricing: Optional[ModelPricing] = None


class ModelDetail(ModelSummary):
    description: Optional[str] = None
    params_schema: Optional[dict[str, Any]] = None
    channel: Optional[str] = None


class ModelDocsExample(BaseModel):
    model_config = ConfigDict(extra="allow")

    title: str
    params: dict[str, Any]


class ModelDocs(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    name: str
    lang: str
    tutorial: str
    examples: Optional[list[ModelDocsExample]] = None


# ---------- Voices ----------

SpeakModel = Literal[
    "speech-2.8-hd",
    "speech-2.8-turbo",
    "speech-2.6-hd",
    "speech-2.6-turbo",
]


class VoiceItem(BaseModel):
    model_config = ConfigDict(extra="allow")

    voice_id: str
    voice_name: str
    tags: Optional[list[str]] = None
    audio_url: Optional[str] = None
    voice_type: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[str] = None
    expires_at: Optional[str] = None


class VoiceListStatistics(BaseModel):
    model_config = ConfigDict(extra="allow")

    user_total_count: int
    user_active_count: int
    user_expired_count: int
    public_voices_count: int


class VoiceListResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    user_voices: list[VoiceItem]
    public_voices: list[VoiceItem]
    statistics: VoiceListStatistics


class SynthesizeParams(TypedDict, total=False):
    text: str
    voice_id: str
    model: NotRequired[SpeakModel]
    speed: NotRequired[float]


class SynthesizeResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    task_id: Optional[str] = None
    status: Optional[TaskStatus] = None
    audio_url: str
    duration: Optional[float] = None
    model: Optional[str] = None
    price: Optional[float] = None


# ---------- Account ----------


class BalanceResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    user_id: int
    balance: float
    balance_yuan: float
    vip_level: int
    unit: Optional[str] = None
    exchange_rate: Optional[str] = None


class CheckinResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    success: bool
    already_checked_in: Optional[bool] = None
    points_awarded: Optional[float] = None
    vip_level: Optional[int] = None
    balance: Optional[float] = None
    balance_yuan: Optional[float] = None
    message: Optional[str] = None


class PackageItem(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: int
    name: str
    price_cents: float
    points: float
    bonus_points: Optional[float] = None
    description: Optional[str] = None


class PaymentResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    package_id: int
    amount_cents: float
    payment_url: str
    order_id: str
    expires_at: Optional[str] = None


# ---------- Skills (guide) ----------


class SkillSummary(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    name: str
    category: str
    description: Optional[str] = None
    models: Optional[list[str]] = None


class SkillDetail(SkillSummary):
    tutorial: Optional[str] = None
    recommended_for: Optional[list[str]] = None


# ---------- Tools (free) ----------


class ParseVideoResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    platform: str
    title: Optional[str] = None
    author: Optional[str] = None
    video_url: str
    cover_url: Optional[str] = None
    duration: Optional[float] = None


TransferUrlType = Literal["image", "audio"]


class TransferUrlResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    original_url: str
    cdn_url: str
    type: TransferUrlType
    size_bytes: Optional[int] = None


# ---------- Sync (synchronous generation) ----------


class SyncImageItem(BaseModel):
    model_config = ConfigDict(extra="allow")

    url: str
    width: Optional[int] = None
    height: Optional[int] = None


class SyncImageResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    task_id: str
    status: TaskStatus
    images: Optional[list[SyncImageItem]] = None
    price: Optional[float] = None


class SyncVideoItem(BaseModel):
    model_config = ConfigDict(extra="allow")

    url: str
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None


class SyncVideoResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    task_id: str
    status: TaskStatus
    videos: Optional[list[SyncVideoItem]] = None
    price: Optional[float] = None


GenerateResult = Union[TaskCreateResponse, TaskQueryResponse]


# ---------- Captioning / Forced Alignment ----------

AlignMode = Literal["speech", "singing"]
AlignPunctMode = Literal[1, 2, 3]


class AlignParams(TypedDict, total=False):
    audio_url: str
    audio_text: str
    mode: NotRequired[AlignMode]
    sta_punc_mode: NotRequired[AlignPunctMode]


class AlignWord(BaseModel):
    model_config = ConfigDict(extra="allow")

    text: str
    start_time: int  # ms
    end_time: int    # ms


class AlignUtterance(BaseModel):
    model_config = ConfigDict(extra="allow")

    text: str
    start_time: int
    end_time: int
    words: list[AlignWord]


class AlignResult(BaseModel):
    model_config = ConfigDict(extra="allow")

    duration: float
    utterances: list[AlignUtterance]
    task_id: Optional[str] = None
    price: Optional[float] = None

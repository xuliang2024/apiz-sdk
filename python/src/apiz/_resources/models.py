from __future__ import annotations

from typing import Optional
from urllib.parse import quote

from .._http import AsyncHttpClient, SyncHttpClient
from .._types import (
    ModelCapability,
    ModelCategory,
    ModelDetail,
    ModelDocs,
    ModelSummary,
)


def _encode_model_id(model_id: str) -> str:
    """Encode a model id while preserving '/' (FastAPI {model_id:path})."""
    return quote(model_id, safe="/")


def _filter_models(
    models: list[ModelSummary],
    *,
    capability: Optional[ModelCapability],
    query: Optional[str],
) -> list[ModelSummary]:
    out: list[ModelSummary] = []
    needle = query.lower() if query else None
    for m in models:
        if capability and m.capability != capability:
            continue
        if needle:
            haystack = f"{m.id} {m.name} {' '.join(m.tags or [])}".lower()
            if needle not in haystack:
                continue
        out.append(m)
    return out


class ModelsResource:
    def __init__(self, http: SyncHttpClient) -> None:
        self._http = http

    def list(
        self,
        *,
        category: Optional[ModelCategory] = None,
        task_type: Optional[str] = None,
    ) -> list[ModelSummary]:
        data = self._http.request(
            "GET",
            "/api/v3/mcp/models",
            query={"category": category, "task_type": task_type},
        )
        models_raw = (data or {}).get("models", [])
        return [ModelSummary.model_validate(m) for m in models_raw]

    def get(self, model_id: str, *, lang: str = "zh") -> ModelDetail:
        data = self._http.request(
            "GET",
            f"/api/v3/mcp/models/{_encode_model_id(model_id)}",
            query={"lang": lang},
        )
        return ModelDetail.model_validate(data)

    def docs(self, model_id: str, *, lang: str = "zh") -> ModelDocs:
        data = self._http.request(
            "GET",
            f"/api/v3/models/{_encode_model_id(model_id)}/docs",
            query={"lang": lang},
        )
        return ModelDocs.model_validate(data)

    def search(
        self,
        *,
        category: Optional[ModelCategory] = None,
        capability: Optional[ModelCapability] = None,
        query: Optional[str] = None,
    ) -> list[ModelSummary]:
        all_models = self.list(category=category)
        return _filter_models(all_models, capability=capability, query=query)


class AsyncModelsResource:
    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def list(
        self,
        *,
        category: Optional[ModelCategory] = None,
        task_type: Optional[str] = None,
    ) -> list[ModelSummary]:
        data = await self._http.request(
            "GET",
            "/api/v3/mcp/models",
            query={"category": category, "task_type": task_type},
        )
        models_raw = (data or {}).get("models", [])
        return [ModelSummary.model_validate(m) for m in models_raw]

    async def get(self, model_id: str, *, lang: str = "zh") -> ModelDetail:
        data = await self._http.request(
            "GET",
            f"/api/v3/mcp/models/{_encode_model_id(model_id)}",
            query={"lang": lang},
        )
        return ModelDetail.model_validate(data)

    async def docs(self, model_id: str, *, lang: str = "zh") -> ModelDocs:
        data = await self._http.request(
            "GET",
            f"/api/v3/models/{_encode_model_id(model_id)}/docs",
            query={"lang": lang},
        )
        return ModelDocs.model_validate(data)

    async def search(
        self,
        *,
        category: Optional[ModelCategory] = None,
        capability: Optional[ModelCapability] = None,
        query: Optional[str] = None,
    ) -> list[ModelSummary]:
        all_models = await self.list(category=category)
        return _filter_models(all_models, capability=capability, query=query)

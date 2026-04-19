from __future__ import annotations

from typing import Optional
from urllib.parse import quote

from .._http import AsyncHttpClient, SyncHttpClient
from .._types import SkillDetail, SkillSummary


class SkillsResource:
    def __init__(self, http: SyncHttpClient) -> None:
        self._http = http

    def list(self, *, category: Optional[str] = None) -> list[SkillSummary]:
        data = self._http.request(
            "GET", "/api/v3/mcp/skills", query={"category": category}
        )
        items = (data or {}).get("skills", [])
        return [SkillSummary.model_validate(s) for s in items]

    def get(self, skill_id: str) -> SkillDetail:
        data = self._http.request(
            "GET", f"/api/v3/mcp/skills/{quote(skill_id, safe='')}"
        )
        return SkillDetail.model_validate(data)


class AsyncSkillsResource:
    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def list(self, *, category: Optional[str] = None) -> list[SkillSummary]:
        data = await self._http.request(
            "GET", "/api/v3/mcp/skills", query={"category": category}
        )
        items = (data or {}).get("skills", [])
        return [SkillSummary.model_validate(s) for s in items]

    async def get(self, skill_id: str) -> SkillDetail:
        data = await self._http.request(
            "GET", f"/api/v3/mcp/skills/{quote(skill_id, safe='')}"
        )
        return SkillDetail.model_validate(data)

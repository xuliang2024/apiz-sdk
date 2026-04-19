from __future__ import annotations

from .._http import AsyncHttpClient, SyncHttpClient
from .._types import ParseVideoResponse, TransferUrlResponse, TransferUrlType


class ToolsResource:
    def __init__(self, http: SyncHttpClient) -> None:
        self._http = http

    def parse_video(self, url: str) -> ParseVideoResponse:
        data = self._http.request(
            "POST", "/api/v3/tools/parse-video", body={"url": url}, auth=False
        )
        return ParseVideoResponse.model_validate(data)

    def transfer_url(self, url: str, *, type: TransferUrlType = "image") -> TransferUrlResponse:
        data = self._http.request(
            "POST",
            "/api/v3/tools/transfer-url",
            body={"url": url, "type": type},
            auth=False,
        )
        return TransferUrlResponse.model_validate(data)


class AsyncToolsResource:
    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def parse_video(self, url: str) -> ParseVideoResponse:
        data = await self._http.request(
            "POST", "/api/v3/tools/parse-video", body={"url": url}, auth=False
        )
        return ParseVideoResponse.model_validate(data)

    async def transfer_url(
        self, url: str, *, type: TransferUrlType = "image"
    ) -> TransferUrlResponse:
        data = await self._http.request(
            "POST",
            "/api/v3/tools/transfer-url",
            body={"url": url, "type": type},
            auth=False,
        )
        return TransferUrlResponse.model_validate(data)

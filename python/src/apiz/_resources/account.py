from __future__ import annotations

from .._http import AsyncHttpClient, SyncHttpClient
from .._types import BalanceResponse, CheckinResponse, PackageItem, PaymentResponse


class AccountResource:
    def __init__(self, http: SyncHttpClient) -> None:
        self._http = http

    def balance(self) -> BalanceResponse:
        return BalanceResponse.model_validate(
            self._http.request("GET", "/api/v3/balance")
        )

    def checkin(self) -> CheckinResponse:
        return CheckinResponse.model_validate(
            self._http.request("POST", "/api/v3/checkin", body={})
        )

    def packages(self) -> list[PackageItem]:
        data = self._http.request("GET", "/api/v3/packages")
        return [PackageItem.model_validate(p) for p in data or []]

    def pay(self, package_id: int) -> PaymentResponse:
        return PaymentResponse.model_validate(
            self._http.request("POST", "/api/v3/pay", body={"package_id": package_id})
        )


class AsyncAccountResource:
    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def balance(self) -> BalanceResponse:
        return BalanceResponse.model_validate(
            await self._http.request("GET", "/api/v3/balance")
        )

    async def checkin(self) -> CheckinResponse:
        return CheckinResponse.model_validate(
            await self._http.request("POST", "/api/v3/checkin", body={})
        )

    async def packages(self) -> list[PackageItem]:
        data = await self._http.request("GET", "/api/v3/packages")
        return [PackageItem.model_validate(p) for p in data or []]

    async def pay(self, package_id: int) -> PaymentResponse:
        return PaymentResponse.model_validate(
            await self._http.request("POST", "/api/v3/pay", body={"package_id": package_id})
        )

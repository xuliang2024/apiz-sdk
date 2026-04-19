import type { HttpClient } from "../http.js";
import type {
  BalanceResponse,
  CheckinResponse,
  PackageItem,
  PaymentResponse,
} from "../types.js";

export class AccountResource {
  constructor(private readonly http: HttpClient) {}

  balance(): Promise<BalanceResponse> {
    return this.http.request<BalanceResponse>({
      method: "GET",
      path: "/api/v3/balance",
    });
  }

  checkin(): Promise<CheckinResponse> {
    return this.http.request<CheckinResponse>({
      method: "POST",
      path: "/api/v3/checkin",
      body: {},
    });
  }

  packages(): Promise<PackageItem[]> {
    return this.http.request<PackageItem[]>({
      method: "GET",
      path: "/api/v3/packages",
    });
  }

  pay(packageId: number): Promise<PaymentResponse> {
    return this.http.request<PaymentResponse>({
      method: "POST",
      path: "/api/v3/pay",
      body: { package_id: packageId },
    });
  }
}
